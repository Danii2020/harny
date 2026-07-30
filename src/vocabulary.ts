/**
 * The closed vocabularies fixed by `specs/canonical-role-templates/contract.md`.
 * This module has no imports, which is what keeps `config.ts` and `templates.ts`
 * free of an import cycle (see contract.md's Module map revision note).
 */

export const TOOL_IDS = ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const ROLE_IDS = [
  'sdd-architect',
  'sdd-test-writer',
  'sdd-executor',
  'sdd-auditor',
  'sdd-documentation',
] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const GATE_IDS = ['post-specs', 'post-red-tests', 'post-audit'] as const;
export type GateId = (typeof GATE_IDS)[number];

export const COST_TIERS = ['most-capable', 'mid', 'cheapest'] as const;
export type CostTier = (typeof COST_TIERS)[number];

/** The capability vocabulary fixed by specs/canonical-role-templates/contract.md. */
export const CAPABILITY_NAMES = [
  'read-files',
  'write-files',
  'run-shell',
  'web-search',
  'docs-lookup',
  'task-tracking',
] as const;
export type CapabilityName = (typeof CAPABILITY_NAMES)[number];
