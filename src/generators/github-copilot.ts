/**
 * The GitHub Copilot generator. Copilot documents two divergent tool
 * vocabularies (cloud-agent aliases vs. VS Code chat tool names) and `target`
 * defaults to both surfaces at once, so `tools` is deliberately left unset
 * rather than emitted as a partially-correct allowlist (contract.md
 * "Verified per-tool facts" § GitHub Copilot).
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
} from './markdown-yaml.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'Claude Opus 5',
  mid: 'Claude Sonnet 4.5',
  cheapest: 'Claude Haiku 4.5',
};

const MODEL_CAVEAT_NOTE =
  'model is honored in VS Code / JetBrains / Eclipse / Xcode and ignored on github.com';

const COPILOT_SKILL_DESCRIPTION_LIMIT = 1024;
const COPILOT_ROLE_BODY_LIMIT = 30_000;

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
      addNote(`${capability.name} (tools intentionally unset: Copilot grants all available tools; see contract.md)`);
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  return { tokens: [], notes };
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.agent.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const renderedBody = `${provenance}\n${template.body}\n\n${pointerBlock}`;

  if (renderedBody.length > COPILOT_ROLE_BODY_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `GitHub Copilot role body for ${template.metadata.id} is ${renderedBody.length} characters, ` +
        `exceeding the documented ${COPILOT_ROLE_BODY_LIMIT}-character prompt limit.`,
    );
  }

  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const comments = [
    ...mapping.notes.map((note) => `capability note: ${note}`),
    `harny note: ${MODEL_CAVEAT_NOTE}`,
  ];

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
      { key: 'model', value: model },
    ],
    comments,
  );
  const contents = `${frontmatter}${renderedBody}`;

  return { path: `${githubCopilotGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;
  const description = template.metadata.purpose;

  if (description.length > COPILOT_SKILL_DESCRIPTION_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `GitHub Copilot conductor skill description for ${githubCopilotGenerator.conductorPath} is ` +
        `${description.length} characters, exceeding the documented ${COPILOT_SKILL_DESCRIPTION_LIMIT}-character limit.`,
    );
  }

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: description },
    ],
    [
      'harny note: Copilot skills are model-invoked, not user-invoked; ask Copilot to "use the ' +
        'sdd-conductor skill" to start the pipeline explicitly.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: githubCopilotGenerator.conductorPath, contents };
}

export const githubCopilotGenerator: Generator = {
  id: 'github-copilot',
  displayName: 'GitHub Copilot',
  agentsDir: '.github/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.github/skills/sdd-conductor/SKILL.md',
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
};
