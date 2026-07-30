/**
 * The one reference generator, proving the `Generator` interface end to end
 * against this repo's own live `.claude/` instance as an empirical oracle.
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, RolePayload } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import { renderFrontmatter, renderProjectConfigBlock, renderProvenance } from './markdown-yaml.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'opus',
  mid: 'sonnet',
  cheapest: 'haiku',
};

const CAPABILITY_TOKENS: Record<string, readonly string[]> = {
  'read-files': ['Read', 'Glob', 'Grep', 'LS'],
  'write-files': ['Write', 'Edit'],
  'run-shell': ['Bash'],
  'web-search': ['WebSearch', 'WebFetch'],
  'docs-lookup': ['mcp__context7__resolve-library-id', 'mcp__context7__query-docs'],
  'task-tracking': ['TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate'],
};

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const notes: string[] = [];

  for (const capability of capabilities) {
    if (capability.known) {
      for (const token of CAPABILITY_TOKENS[capability.name] ?? []) {
        if (!seen.has(token)) {
          seen.add(token);
          tokens.push(token);
        }
      }
    } else {
      notes.push(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      notes.push(`${capability.name} is scoped to ${capability.scope}`);
    }
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
      { key: 'model', value: model, raw: true },
      { key: 'tools', value: mapping.tokens.join(', ') },
    ],
    mapping.notes.map((note) => `capability note: ${note}`),
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const contents = `${frontmatter}${provenance}\n${template.body}\n`;

  return { path: `${claudeCodeGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;

  const frontmatter = renderFrontmatter([
    { key: 'name', value: template.metadata.id },
    { key: 'description', value: template.metadata.purpose },
  ]);

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: claudeCodeGenerator.conductorPath, contents };
}

export const claudeCodeGenerator: Generator = {
  id: 'claude-code',
  displayName: 'Claude Code',
  agentsDir: '.claude/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.claude/skills/sdd-conductor/SKILL.md',
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
};
