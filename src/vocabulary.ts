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

/** Skills always scaffolded, regardless of selection. Pipeline-role order, then the
 *  shared skills (`harny-sync`, `harny-feedback`, `harny-doctor`). `harny-doctor` is
 *  appended last because that is the only insertion position that preserves every
 *  other member's index — and therefore `SKILL_IDS`' emission order (CLI-4) — see
 *  agent-feedback-controls/contract.md § "Insertion position", extended by
 *  readiness-doctor/contract.md § State Changes "Vocabulary". */
export const CORE_SKILL_IDS = [
  'harny-propose',
  'harny-test',
  'harny-implement',
  'harny-audit',
  'harny-document',
  'harny-sync',
  'harny-feedback',
  'harny-doctor',
] as const;
export type CoreSkillId = (typeof CORE_SKILL_IDS)[number];

/** Skills the user opts into. Never implicitly enabled by a tool or role choice. */
export const OPTIONAL_SKILL_IDS = ['harny-adr', 'harny-standards'] as const;
export type OptionalSkillId = (typeof OPTIONAL_SKILL_IDS)[number];

/** Full closed set, in stable emission order: core first, then optional. */
export const SKILL_IDS = [...CORE_SKILL_IDS, ...OPTIONAL_SKILL_IDS] as const;
export type SkillId = (typeof SKILL_IDS)[number];

/** Default opt-in set. See contract.md § "Default optional-skill set" for the argument. */
export const DEFAULT_OPTIONAL_SKILL_IDS = ['harny-standards'] as const;

/** File name of the shape-contract document written beside the skills in each root. */
export const SKILLS_README_NAME = 'README.md';
