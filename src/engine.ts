/**
 * Turns a `HarnessConfig` + `CanonicalTemplates` into a `HarnessPayload` —
 * the typed data every generator consumes.
 */
import { HarnessError } from './errors.js';
import { serializeConfig } from './config.js';
import type { HarnessConfig } from './config.js';
import { GATE_IDS, ROLE_IDS } from './vocabulary.js';
import type { CostTier, GateId, RoleId } from './vocabulary.js';
import type { CanonicalTemplates, ConductorTemplate, RoleTemplate, SpecSchemaTemplate } from './templates.js';
import type { GeneratedFile } from './generators/types.js';

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

  return { roles, conductor, specSchema: templates.specSchema, config };
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
