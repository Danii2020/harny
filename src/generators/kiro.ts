/**
 * The Kiro generator. Kiro's `tools` frontmatter field uses category tags
 * (`read`/`write`/`shell`/`web`) plus `@server` MCP references, rather than a
 * per-tool token list (contract.md "Verified per-tool facts" § Kiro).
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, RolePayload } from '../engine.js';
import { SPEC_SCHEMA_DIR } from '../engine.js';
import { HarnessError } from '../errors.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import {
  renderFrontmatter,
  renderProjectConfigBlock,
  renderProvenance,
  renderSpecSchemaPointerBlock,
  yamlFlowSequence,
} from './markdown-yaml.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'claude-opus-5',
  mid: 'claude-sonnet-4.6',
  cheapest: 'claude-haiku-4.5',
};

const KIRO_TOKEN_BY_CAPABILITY: Record<string, string | undefined> = {
  'read-files': 'read',
  'write-files': 'write',
  'run-shell': 'shell',
  'web-search': 'web',
  'docs-lookup': '@context7',
  'task-tracking': undefined,
};

const TASK_TRACKING_NOTE =
  "task-tracking has no Kiro-native tool category; the role body's own task discipline applies";
const DOCS_LOOKUP_NOTE =
  'docs-lookup maps to the Context7 MCP server (@context7); harny does not write MCP configuration — ' +
  'see plan.md §4 "future scope"';

const KIRO_SKILL_DESCRIPTION_LIMIT = 1024;

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const tokens: string[] = [];
  const seenTokens = new Set<string>();
  const notes: string[] = [];
  const seenNotes = new Set<string>();
  let hasTaskTracking = false;
  let hasDocsLookup = false;

  const addNote = (note: string): void => {
    if (!seenNotes.has(note)) {
      seenNotes.add(note);
      notes.push(note);
    }
  };

  for (const capability of capabilities) {
    if (capability.known) {
      const token = KIRO_TOKEN_BY_CAPABILITY[capability.name];
      if (token && !seenTokens.has(token)) {
        seenTokens.add(token);
        tokens.push(token);
      }
      if (capability.name === 'task-tracking') hasTaskTracking = true;
      if (capability.name === 'docs-lookup') hasDocsLookup = true;
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  if (hasTaskTracking) {
    addNote(TASK_TRACKING_NOTE);
  }
  if (hasDocsLookup) {
    addNote(DOCS_LOOKUP_NOTE);
  }

  return { tokens, notes };
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;
  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
      { key: 'model', value: model },
      { key: 'tools', value: yamlFlowSequence(mapping.tokens), raw: true },
    ],
    mapping.notes.map((note) => `capability note: ${note}`),
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${pointerBlock}`;

  return { path: `${kiroGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;
  const description = template.metadata.purpose;

  if (description.length > KIRO_SKILL_DESCRIPTION_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `Kiro conductor skill description for ${kiroGenerator.conductorPath} is ` +
        `${description.length} characters, exceeding the documented ${KIRO_SKILL_DESCRIPTION_LIMIT}-character limit.`,
    );
  }

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: description },
    ],
    [
      'harny note: Kiro custom agents do not load skills by default; run the conductor from the ' +
        'default agent, or add resources: ["skill://.kiro/skills/*/SKILL.md"] to the custom agent ' +
        'that should see it.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: kiroGenerator.conductorPath, contents };
}

export const kiroGenerator: Generator = {
  id: 'kiro',
  displayName: 'Kiro',
  agentsDir: '.kiro/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.kiro/skills/sdd-conductor/SKILL.md',
  skillsDir: '.kiro/skills',
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
};
