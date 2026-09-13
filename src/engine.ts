/**
 * Turns a `HarnessConfig` + `CanonicalTemplates` into a `HarnessPayload` —
 * the typed data every generator consumes.
 */
import { HarnessError } from './errors.js';
import { serializeConfig } from './config.js';
import type { HarnessConfig } from './config.js';
import { GATE_IDS, ROLE_IDS, SKILL_IDS } from './vocabulary.js';
import type { CostTier, GateId, RoleId, SkillId } from './vocabulary.js';
import type {
  CanonicalTemplates,
  ConductorTemplate,
  RoleTemplate,
  SkillResource,
  SkillTemplate,
  SpecSchemaTemplate,
} from './templates.js';
import type { GeneratedFile, Generator } from './generators/types.js';

export interface RolePayload {
  readonly template: RoleTemplate;
  /** Effective tier after config resolution. */
  readonly tier: CostTier;
  readonly modelOverride?: string;
}

/** Config facts a generator may render into a delimited generated block. */
export interface ProjectConfigSummary {
  readonly enabledRoles: readonly RoleId[];
  readonly gates: readonly GateId[];
  readonly stack?: string;
  /** POSIX path, relative to the target repo, where spec-schema templates land. */
  readonly specSchemaDir: string;
  /** True when fewer than all three gates are active. */
  readonly reducedGates: boolean;
}

export interface ConductorPayload {
  readonly template: ConductorTemplate;
  readonly project: ProjectConfigSummary;
}

export interface HarnessPayload {
  /** Enabled roles only, in ROLE_IDS order. */
  readonly roles: readonly RolePayload[];
  /** Always present — the conductor is always on. */
  readonly conductor: ConductorPayload;
  readonly specSchema: readonly SpecSchemaTemplate[];
  /** Selected skills, in SKILL_IDS order. Always a superset of CORE_SKILL_IDS. */
  readonly skills: readonly SkillTemplate[];
  readonly skillsReadme?: SkillResource;
  readonly config: HarnessConfig;
}

export const SPEC_SCHEMA_DIR = '.sdd/spec-schema';
export const HARNESS_CONFIG_PATH = '.sdd/harness.json';

export function buildPayload(config: HarnessConfig, templates: CanonicalTemplates): HarnessPayload {
  const selectionById = new Map(config.roles.map((selection) => [selection.id, selection]));

  const roles: RolePayload[] = ROLE_IDS.filter((id) => selectionById.has(id)).map((id) => {
    const selection = selectionById.get(id)!;
    const template = templates.roles.get(id);
    if (!template) {
      throw new HarnessError(
        'TEMPLATE',
        `Role "${id}" is enabled but has no corresponding canonical template loaded.`,
      );
    }
    return { template, tier: selection.tier, modelOverride: selection.modelOverride };
  });

  const project: ProjectConfigSummary = {
    enabledRoles: roles.map((role) => role.template.metadata.id),
    gates: config.gates,
    stack: config.stack,
    specSchemaDir: SPEC_SCHEMA_DIR,
    reducedGates: config.gates.length < GATE_IDS.length,
  };

  const conductor: ConductorPayload = { template: templates.conductor, project };

  const selectedSkillIds = new Set<SkillId>(config.skills);
  const skills: SkillTemplate[] = SKILL_IDS.filter((id) => selectedSkillIds.has(id)).map((id) => {
    const template = templates.skills.get(id);
    if (!template) {
      throw new HarnessError(
        'TEMPLATE',
        `Skill "${id}" is enabled but has no corresponding canonical template loaded. ` +
          `This is a packaging bug, not a configuration error.`,
      );
    }
    return template;
  });

  return { roles, conductor, specSchema: templates.specSchema, skills, skillsReadme: templates.skillsReadme, config };
}

/** Tool-neutral files written once regardless of how many tools are selected:
 *  the five spec-schema templates plus the resolved config. Closes AL-5. */
export function buildSharedFiles(payload: HarnessPayload): readonly GeneratedFile[] {
  const files: GeneratedFile[] = payload.specSchema.map((schema) => ({
    path: `${SPEC_SCHEMA_DIR}/${schema.name}.md`,
    contents: schema.contents,
  }));
  files.push({ path: HARNESS_CONFIG_PATH, contents: serializeConfig(payload.config) });
  return files;
}

/** Deduped, sorted skill roots for the generators that actually resolved
 *  (`cli-init.md` CLI-7: a skipped tool contributes no root). */
export function skillRootsFor(generators: readonly Generator[]): readonly string[] {
  const roots = new Set(generators.map((generator) => generator.skillsDir));
  return [...roots].sort();
}

function compareByName(a: { readonly name: string }, b: { readonly name: string }): number {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

/**
 * One copy of every selected skill's files, plus the shape-contract README, under each
 * unique skill root. `roots` MUST already be deduped and sorted by the caller.
 *
 * This is the same single-write-per-run idea as `buildSharedFiles` (`cli-init.md`
 * CLI-8): `.sdd/spec-schema/*` is written once because its destination is a constant;
 * skills are written once per *distinct* destination. With all five tools selected the
 * three distinct roots are `.agents/skills`, `.claude/skills`, `.kiro/skills`.
 *
 * Emission order is fixed and total: for each root in `roots` order, the README (if
 * loaded), then each skill in `SKILL_IDS` order, then each of that skill's `files` in
 * `name` order. Every emitted `contents` is the loaded `SkillResource.contents`
 * verbatim — no concatenation, no header, no provenance comment, no generated block.
 */
export function buildSkillFiles(
  payload: HarnessPayload,
  roots: readonly string[],
): readonly GeneratedFile[] {
  const orderedSkills = [...payload.skills].sort(
    (a, b) => SKILL_IDS.indexOf(a.id) - SKILL_IDS.indexOf(b.id),
  );

  const files: GeneratedFile[] = [];
  for (const root of roots) {
    if (payload.skillsReadme) {
      files.push({ path: `${root}/${payload.skillsReadme.name}`, contents: payload.skillsReadme.contents });
    }
    for (const skill of orderedSkills) {
      const sortedFiles = [...skill.files].sort(compareByName);
      for (const file of sortedFiles) {
        files.push({ path: `${root}/${skill.id}/${file.name}`, contents: file.contents });
      }
    }
  }
  return files;
}
