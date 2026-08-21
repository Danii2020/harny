/**
 * The Cursor generator. Cursor has no tool-allowlist frontmatter field at all
 * (contract.md "Verified per-tool facts" § Cursor) — every capability is
 * therefore advisory-only and travels entirely through `notes`, and the only
 * permission control Cursor exposes (`readonly: true`) is derived from the
 * capability set rather than mapped token-by-token.
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, RolePayload } from '../engine.js';
import { SPEC_SCHEMA_DIR } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import type { FrontmatterField } from './markdown-yaml.js';
import {
  renderFrontmatter,
  renderProjectConfigBlock,
  renderProvenance,
  renderSpecSchemaPointerBlock,
} from './markdown-yaml.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'claude-opus-5',
  mid: 'claude-4.6-sonnet',
  cheapest: 'gpt-5.4-mini',
};

// Rendered as a "# harny note:" comment rather than a "# capability note:"
// comment (see renderRole below) — it is an adapter-level caveat about how
// Cursor's permission model works, not a per-capability mapping fact.
const READONLY_ADVISORY_NOTE =
  'Cursor expresses permissions only via `readonly`; the capability list above is documentation, not enforcement.';

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const notes: string[] = [];
  const seen = new Set<string>();

  const addNote = (note: string): void => {
    if (!seen.has(note)) {
      seen.add(note);
      notes.push(note);
    }
  };

  for (const capability of capabilities) {
    if (capability.known) {
      addNote(`${capability.name} (no Cursor tool-allowlist field; advisory only)`);
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  if (capabilities.length > 0) {
    addNote(READONLY_ADVISORY_NOTE);
  }

  return { tokens: [], notes };
}

/** True when a role declares neither `write-files` nor `run-shell` (base names,
 *  regardless of any scope qualifier), i.e. when Cursor's `readonly: true` is the
 *  faithful rendering of its capability set. Exported for testability; deliberately
 *  NOT part of `Generator` — see contract.md "Interface sufficiency finding". */
export function isReadonlyRole(capabilities: readonly Capability[]): boolean {
  return !capabilities.some((c) => c.name === 'write-files' || c.name === 'run-shell');
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;
  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const fields: FrontmatterField[] = [
    { key: 'name', value: template.metadata.id },
    { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
    { key: 'model', value: model },
  ];
  if (isReadonlyRole(template.metadata.capabilities)) {
    fields.push({ key: 'readonly', value: 'true', raw: true });
  }

  const comments = mapping.notes.map((note) =>
    note === READONLY_ADVISORY_NOTE ? `harny note: ${note}` : `capability note: ${note}`,
  );

  const frontmatter = renderFrontmatter(fields, comments);
  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${pointerBlock}`;

  return { path: `${cursorGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: template.metadata.purpose },
    ],
    [
      'harny note: Cursor also loads `.claude/agents/` and `.codex/agents/` as compatibility ' +
        'locations; selecting Claude Code and/or a Codex generator alongside Cursor places the ' +
        'same role names in more than one directory Cursor reads.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: cursorGenerator.conductorPath, contents };
}

export const cursorGenerator: Generator = {
  id: 'cursor',
  displayName: 'Cursor',
  agentsDir: '.cursor/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.cursor/skills/sdd-conductor/SKILL.md',
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
};
