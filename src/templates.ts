/**
 * Canonical template location, loading, and parsing of the Role Metadata
 * schema fixed by `specs/canonical-role-templates/contract.md`.
 *
 * `templates/` is a strictly read-only input: nothing here ever writes to,
 * renames, or deletes anything under it (guarantee 5).
 */
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HarnessError } from './errors.js';
import { CAPABILITY_NAMES, COST_TIERS, ROLE_IDS, SKILL_IDS, SKILLS_README_NAME } from './vocabulary.js';
import type { CostTier, RoleId, SkillId } from './vocabulary.js';

export interface Capability {
  /** Raw token as written in the canonical file, e.g. `read-files`. */
  readonly name: string;
  /** Free-text scope from a trailing parenthetical, e.g. `audit.md only`. */
  readonly scope?: string;
  /** True when `name` is in CAPABILITY_NAMES. Unknown tokens are kept, not dropped. */
  readonly known: boolean;
}

export interface RoleMetadata {
  readonly id: RoleId;
  readonly purpose: string;
  readonly costTier: CostTier;
  readonly costRationale: string;
  readonly capabilities: readonly Capability[];
  readonly invocation: string;
  readonly handoff: string;
}

export interface RoleTemplate {
  readonly metadata: RoleMetadata;
  /** Verbatim canonical body per parsing rule 11: everything after the
   *  `## Role body` heading line (and after any leading authoring blockquote,
   *  rule 9), with leading/trailing blank lines removed and nothing else altered. */
  readonly body: string;
  /** Leading authoring blockquote excluded by rule 9, verbatim, if any.
   *  Present so exclusion is observable rather than silent (rule 10). */
  readonly authoringNote?: string;
  /** Path relative to the templates root, e.g. `roles/sdd-architect.md`. */
  readonly sourcePath: string;
}

/** The conductor is NOT a pipeline role: its metadata block legitimately carries
 *  only `id` and `purpose` (no cost_tier/capabilities/invocation/handoff). */
export interface ConductorMetadata {
  readonly id: string;
  readonly purpose: string;
}

export interface ConductorTemplate {
  readonly metadata: ConductorMetadata;
  /** Verbatim per parsing rule 11: everything after the metadata block and after the
   *  leading authoring blockquote (rule 9), blank-line-trimmed. */
  readonly body: string;
  /** Leading authoring blockquote excluded by rule 9, verbatim, if any (rule 10). */
  readonly authoringNote?: string;
  readonly sourcePath: string;
}

export const SPEC_SCHEMA_NAMES = ['intent', 'contract', 'roadmap', 'tasks', 'audit'] as const;
export type SpecSchemaName = (typeof SPEC_SCHEMA_NAMES)[number];

export interface SpecSchemaTemplate {
  readonly name: SpecSchemaName;
  /** Byte-for-byte file contents. Never reformatted. */
  readonly contents: string;
  readonly sourcePath: string;
}

/** One file inside a skill directory: `SKILL.md` or a bundled resource (V5). */
export interface SkillResource {
  /** File name only, e.g. `SKILL.md`, `capability-template.md`. Never a path. */
  readonly name: string;
  /** Byte-for-byte file contents. Never reformatted, never parsed. */
  readonly contents: string;
  /** Path relative to the templates root, e.g. `skills/harny-sync/SKILL.md`. */
  readonly sourcePath: string;
}

export interface SkillTemplate {
  readonly id: SkillId;
  /** `SKILL.md` plus every sibling regular file, sorted by `name` (determinism). */
  readonly files: readonly SkillResource[];
  /** Path relative to the templates root, e.g. `skills/harny-sync`. */
  readonly sourcePath: string;
}

export interface CanonicalTemplates {
  /** Absolute path to the templates root actually loaded. */
  readonly root: string;
  readonly roles: ReadonlyMap<RoleId, RoleTemplate>;
  readonly conductor: ConductorTemplate;
  readonly specSchema: readonly SpecSchemaTemplate[];
  /** Only the skill directories that exist under `templates/skills/`. A selected
   *  skill absent from this map is a TEMPLATE error raised by `buildPayload`. */
  readonly skills: ReadonlyMap<SkillId, SkillTemplate>;
  /** `templates/skills/README.md` — the shape contract. Absent only in fixtures. */
  readonly skillsReadme?: SkillResource;
  /** **(NEW — agent-feedback-controls.)** `templates/hooks/run-feedback.mjs`, read
   *  byte-for-byte (BG-11). Tolerated absent — mirroring `skillsReadme` — so a
   *  templates root that doesn't model the feedback subsystem at all (most test
   *  fixtures) still loads cleanly; `buildFeedbackFiles` treats its absence as
   *  "this templates root does not carry the feedback feature", not an error. */
  readonly hookRunner?: SkillResource;
  /** **(NEW — agent-feedback-controls.)** `templates/ci/harny-feedback.yml`, read
   *  byte-for-byte before its generated block is filled in. Tolerated absent for
   *  the same reason as `hookRunner`. */
  readonly ciWorkflowTemplate?: SkillResource;
  /** **(NEW — readiness-doctor.)** `templates/doctor/run-doctor.mjs`, read
   *  byte-for-byte (BG-11). Tolerated absent for the same reason as `hookRunner`. */
  readonly doctorRunner?: SkillResource;
  /** **(NEW — readiness-doctor.)** `templates/doctor/README.md`, read
   *  byte-for-byte. Tolerated absent for the same reason as `hookRunner`. */
  readonly doctorReadme?: SkillResource;
  /** **(NEW — readiness-doctor.)** `templates/shared/probes.mjs`, read
   *  byte-for-byte (BG-11, BG-20). Tolerated absent for the same reason as
   *  `hookRunner`. */
  readonly sharedProbes?: SkillResource;
  /** **(NEW — permissions-baseline.)** `templates/permissions/run-guard.mjs`, read
   *  byte-for-byte (PB-2). Tolerated absent for the same reason as `hookRunner`. */
  readonly permissionsGuard?: SkillResource;
  /** **(NEW — permissions-baseline.)** `templates/permissions/policy.json`, read
   *  byte-for-byte (PB-1, PB-2). Tolerated absent for the same reason as
   *  `hookRunner`. */
  readonly permissionsPolicy?: SkillResource;
  /** **(NEW — commit-checks.)** `templates/git-hooks/{pre-commit,pre-push,run-git-hook.mjs}`,
   *  read byte-for-byte (CC-1). Tolerated absent for the same reason as `hookRunner`. */
  readonly gitHooksPreCommit?: SkillResource;
  readonly gitHooksPrePush?: SkillResource;
  readonly gitHooksRunner?: SkillResource;
}

const METADATA_HEADING_RE = /^##\s+(Role )?Metadata\s*$/;
const HEADING_RE = /^##\s+/;
const H1_RE = /^#\s+(.*)$/;
const ENTRY_RE = /^-\s+([a-z_]+):\s*(.*)$/;
const ROLE_BODY_HEADING_RE = /^##\s+Role body\s*$/;

const ROLE_REQUIRED_KEYS = [
  'id',
  'purpose',
  'cost_tier',
  'cost_rationale',
  'capabilities',
  'invocation',
  'handoff',
] as const;

const CONDUCTOR_REQUIRED_KEYS = ['id', 'purpose'] as const;

/** Trims leading and trailing blank lines from a block of text, leaving
 *  interior blank lines and everything else untouched. */
function trimBlankLines(text: string): string {
  const lines = text.split('\n');
  let start = 0;
  let end = lines.length - 1;
  while (start <= end && lines[start].trim() === '') start++;
  while (end >= start && lines[end].trim() === '') end--;
  if (start > end) return '';
  return lines.slice(start, end + 1).join('\n');
}

/**
 * Locates the run of lines after a `## (Role )?Metadata` heading, per amended
 * rule 1: the block is the contiguous run of `- key: value` bullets (blank lines
 * between bullets tolerated); it ends at the first line that is neither blank nor
 * a bullet, or at the next `## ` heading, whichever comes first. Unlike the
 * superseded wording, this does NOT swallow trailing prose (e.g. an authoring
 * blockquote) between the last bullet and the next heading.
 */
function extractMetadataBlockLines(lines: readonly string[]): { start: number; end: number } | undefined {
  const headingIndex = lines.findIndex((line) => METADATA_HEADING_RE.test(line));
  if (headingIndex === -1) return undefined;
  let end = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (HEADING_RE.test(line)) {
      end = i;
      break;
    }
    if (line.trim() === '') continue;
    if (!ENTRY_RE.test(line)) {
      end = i;
      break;
    }
  }
  return { start: headingIndex + 1, end };
}

const BLOCKQUOTE_LINE_RE = /^>/;

interface BodyExtraction {
  readonly body: string;
  readonly authoringNote?: string;
}

/**
 * Applies rules 9, 10, 11: starting from `markerIndex` (the body-start marker —
 * end of the metadata block for the conductor, or the line after `## Role body`
 * for a role), a leading Markdown blockquote (a contiguous run of `>`-prefixed
 * lines), if present immediately after any separating blank lines, is excluded
 * from `body` and returned verbatim as `authoringNote`. A blockquote anywhere
 * later in the content is ordinary body content and is left alone. `body` is then
 * everything remaining, blank-line-trimmed.
 */
function extractBody(lines: readonly string[], markerIndex: number): BodyExtraction {
  let i = markerIndex;
  while (i < lines.length && lines[i].trim() === '') i++;

  if (i < lines.length && BLOCKQUOTE_LINE_RE.test(lines[i])) {
    const noteStart = i;
    while (i < lines.length && BLOCKQUOTE_LINE_RE.test(lines[i])) i++;
    const authoringNote = lines.slice(noteStart, i).join('\n');
    const body = trimBlankLines(lines.slice(i).join('\n'));
    return { body, authoringNote };
  }

  return { body: trimBlankLines(lines.slice(markerIndex).join('\n')) };
}

/** Parses the `- key: value` entries within a metadata block (rule 2, 3). */
function parseMetadataEntries(blockLines: readonly string[]): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const line of blockLines) {
    const match = ENTRY_RE.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    raw[key] = value.trim();
  }
  return raw;
}

/** Parses `capabilities: a, b (scope), c` into structured Capability entries
 *  (rule 6, guarantee 8). Unknown tokens are preserved, never dropped. */
export function parseCapabilityList(raw: string): readonly Capability[] {
  return raw
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .map((token): Capability => {
      const scoped = /^([^\s(]+)\s*\(([^)]*)\)$/.exec(token);
      const name = scoped ? scoped[1] : token;
      const known = (CAPABILITY_NAME_SET as ReadonlySet<string>).has(name);
      if (scoped) {
        return { name, scope: scoped[2].trim(), known };
      }
      return { name, known };
    });
}

// Local set built from the imported vocabulary to avoid re-declaring it here
// (guarantee 4: no vocabulary literal duplicated in this module).
const CAPABILITY_NAME_SET = new Set<string>(CAPABILITY_NAMES);

export function parseRoleTemplate(source: string, sourcePath: string): RoleTemplate {
  const lines = source.split('\n');

  const h1Match = lines.find((line) => H1_RE.test(line));
  const h1Id = h1Match ? (H1_RE.exec(h1Match)?.[1] ?? '').trim() : '';

  const block = extractMetadataBlockLines(lines);
  const raw = block ? parseMetadataEntries(lines.slice(block.start, block.end)) : {};

  for (const key of ROLE_REQUIRED_KEYS) {
    if (raw[key] === undefined) {
      throw new HarnessError(
        'TEMPLATE',
        `Canonical role template ${sourcePath} is missing required metadata key "${key}".`,
      );
    }
  }

  const costTier = raw.cost_tier;
  if (!(COST_TIERS as readonly string[]).includes(costTier)) {
    throw new HarnessError(
      'TEMPLATE',
      `Canonical role template ${sourcePath} has an out-of-enum cost_tier value ` +
        `"${costTier}". Valid values: ${COST_TIERS.join(', ')}.`,
    );
  }

  const id = raw.id;
  if (!(ROLE_IDS as readonly string[]).includes(id)) {
    throw new HarnessError(
      'TEMPLATE',
      `Canonical role template ${sourcePath} has an unknown role id "${id}". Valid values: ${ROLE_IDS.join(', ')}.`,
    );
  }
  if (id !== h1Id) {
    throw new HarnessError(
      'TEMPLATE',
      `Canonical role template ${sourcePath} has metadata id "${id}" that does not match its heading "# ${h1Id}".`,
    );
  }

  const bodyHeadingIndex = lines.findIndex((line) => ROLE_BODY_HEADING_RE.test(line));
  if (bodyHeadingIndex === -1) {
    throw new HarnessError(
      'TEMPLATE',
      `Canonical role template ${sourcePath} is missing the required "## Role body" heading.`,
    );
  }
  const { body, authoringNote } = extractBody(lines, bodyHeadingIndex + 1);

  const metadata: RoleMetadata = {
    id: id as RoleId,
    purpose: raw.purpose,
    costTier: costTier as CostTier,
    costRationale: raw.cost_rationale,
    capabilities: parseCapabilityList(raw.capabilities),
    invocation: raw.invocation,
    handoff: raw.handoff,
  };

  return { metadata, body, authoringNote, sourcePath };
}

export function parseConductorTemplate(source: string, sourcePath: string): ConductorTemplate {
  const lines = source.split('\n');

  const block = extractMetadataBlockLines(lines);
  const raw = block ? parseMetadataEntries(lines.slice(block.start, block.end)) : {};

  for (const key of CONDUCTOR_REQUIRED_KEYS) {
    if (raw[key] === undefined) {
      throw new HarnessError(
        'TEMPLATE',
        `Canonical conductor template ${sourcePath} is missing required metadata key "${key}".`,
      );
    }
  }

  const bodyStart = block ? block.end : lines.length;
  const { body, authoringNote } = extractBody(lines, bodyStart);

  const metadata: ConductorMetadata = {
    id: raw.id,
    purpose: raw.purpose,
  };

  return { metadata, body, authoringNote, sourcePath };
}

/** Resolves `<package-root>/templates` from `import.meta.url`, independent of cwd.
 *  Correct from both `dist/templates.js` and `src/templates.ts` (both one level
 *  below the package root), so dev, test, and installed runs agree. */
export function resolveTemplatesRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', 'templates');
}

async function readCanonicalFile(root: string, relativePath: string): Promise<string> {
  const absolute = path.join(root, relativePath);
  try {
    return await fs.readFile(absolute, 'utf8');
  } catch {
    throw new HarnessError(
      'TEMPLATE',
      `Canonical template file is missing: ${relativePath} (resolved templates root: ${root}). ` +
        `This is a packaging bug, not your configuration.`,
    );
  }
}

export async function loadCanonicalTemplates(root?: string): Promise<CanonicalTemplates> {
  const templatesRoot = root ?? resolveTemplatesRoot();

  const roles = new Map<RoleId, RoleTemplate>();
  for (const roleId of ROLE_IDS) {
    const relativePath = `roles/${roleId}.md`;
    const source = await readCanonicalFile(templatesRoot, relativePath);
    roles.set(roleId, parseRoleTemplate(source, relativePath));
  }

  const conductorRelativePath = 'conductor/sdd-conductor.md';
  const conductorSource = await readCanonicalFile(templatesRoot, conductorRelativePath);
  const conductor = parseConductorTemplate(conductorSource, conductorRelativePath);

  const specSchema: SpecSchemaTemplate[] = [];
  for (const name of SPEC_SCHEMA_NAMES) {
    const relativePath = `spec-schema/${name}.md`;
    const contents = await readCanonicalFile(templatesRoot, relativePath);
    specSchema.push({ name, contents, sourcePath: relativePath });
  }

  const skills = await loadSkillTemplates(templatesRoot);
  const skillsReadme = await loadSkillsReadme(templatesRoot);
  const hookRunner = await loadOptionalResource(templatesRoot, 'hooks/run-feedback.mjs', 'run-feedback.mjs');
  const ciWorkflowTemplate = await loadOptionalResource(
    templatesRoot,
    'ci/harny-feedback.yml',
    'harny-feedback.yml',
  );
  const doctorRunner = await loadOptionalResource(templatesRoot, 'doctor/run-doctor.mjs', 'run-doctor.mjs');
  const doctorReadme = await loadOptionalResource(templatesRoot, 'doctor/README.md', 'README.md');
  const sharedProbes = await loadOptionalResource(templatesRoot, 'shared/probes.mjs', 'probes.mjs');
  const permissionsGuard = await loadOptionalResource(templatesRoot, 'permissions/run-guard.mjs', 'run-guard.mjs');
  const permissionsPolicy = await loadOptionalResource(templatesRoot, 'permissions/policy.json', 'policy.json');
  const gitHooksPreCommit = await loadOptionalResource(templatesRoot, 'git-hooks/pre-commit', 'pre-commit');
  const gitHooksPrePush = await loadOptionalResource(templatesRoot, 'git-hooks/pre-push', 'pre-push');
  const gitHooksRunner = await loadOptionalResource(templatesRoot, 'git-hooks/run-git-hook.mjs', 'run-git-hook.mjs');

  return {
    root: templatesRoot,
    roles,
    conductor,
    specSchema,
    skills,
    skillsReadme,
    hookRunner,
    ciWorkflowTemplate,
    doctorRunner,
    doctorReadme,
    sharedProbes,
    permissionsGuard,
    permissionsPolicy,
    gitHooksPreCommit,
    gitHooksPrePush,
    gitHooksRunner,
  };
}

/**
 * Loads every `templates/skills/<id>/` directory that exists, for each `id` in
 * `SKILL_IDS`. Reads bytes only — no parser, no validator, no transform (Gu 9).
 * A skill absent from disk is tolerated here and simply omitted from the map;
 * `buildPayload` is what turns a *selected-but-absent* skill into a TEMPLATE error.
 */
async function loadSkillTemplates(templatesRoot: string): Promise<Map<SkillId, SkillTemplate>> {
  const skills = new Map<SkillId, SkillTemplate>();
  const skillsRoot = path.join(templatesRoot, 'skills');

  for (const id of SKILL_IDS) {
    const skillDir = path.join(skillsRoot, id);
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fsSync.existsSync(skillMdPath)) continue;

    const entries = await fs.readdir(skillDir, { withFileTypes: true });
    const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name).sort();

    const files: SkillResource[] = [];
    for (const name of fileNames) {
      const relativePath = `skills/${id}/${name}`;
      const contents = await readCanonicalFile(templatesRoot, relativePath);
      files.push({ name, contents, sourcePath: relativePath });
    }

    skills.set(id, { id, files, sourcePath: `skills/${id}` });
  }

  return skills;
}

/** Loads `templates/skills/README.md`, tolerating its absence (fixtures may omit it). */
async function loadSkillsReadme(templatesRoot: string): Promise<SkillResource | undefined> {
  const relativePath = `skills/${SKILLS_README_NAME}`;
  const absolute = path.join(templatesRoot, relativePath);
  if (!fsSync.existsSync(absolute)) return undefined;
  const contents = await readCanonicalFile(templatesRoot, relativePath);
  return { name: SKILLS_README_NAME, contents, sourcePath: relativePath };
}

/** **(NEW — agent-feedback-controls.)** Loads a single optional canonical
 *  resource by exact relative path, tolerating its absence entirely (returns
 *  `undefined`) rather than raising a TEMPLATE error — the same tolerated-absence
 *  posture as `loadSkillsReadme`, extended to `templates/hooks/` and
 *  `templates/ci/` so a lean test-fixture templates root that never modeled the
 *  feedback subsystem still loads cleanly. */
async function loadOptionalResource(
  templatesRoot: string,
  relativePath: string,
  name: string,
): Promise<SkillResource | undefined> {
  const absolute = path.join(templatesRoot, relativePath);
  if (!fsSync.existsSync(absolute)) return undefined;
  const contents = await readCanonicalFile(templatesRoot, relativePath);
  return { name, contents, sourcePath: relativePath };
}
