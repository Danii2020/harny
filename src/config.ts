/**
 * Config shape, defaults derived from canonical content, validation, merge,
 * (de)serialization, and flag-list parsing.
 *
 * Re-exports nothing from `vocabulary.ts`; consumers import the vocabulary
 * directly, which is what keeps this module and `templates.ts` acyclic.
 */
import { HarnessError } from './errors.js';
import {
  CORE_SKILL_IDS,
  COST_TIERS,
  DEFAULT_OPTIONAL_SKILL_IDS,
  GATE_IDS,
  OPTIONAL_SKILL_IDS,
  ROLE_IDS,
  SKILL_IDS,
  TOOL_IDS,
} from './vocabulary.js';
import type { CostTier, GateId, OptionalSkillId, RoleId, SkillId, ToolId } from './vocabulary.js';
import type { CanonicalTemplates } from './templates.js';

export const CONFIG_VERSION = 1;

/**
 * A **resolved** enabled role: membership plus a settled tier. Appears only in a
 * complete `HarnessConfig`, never in a partial/flag-side one — see `RoleOverride`
 * for the partial counterpart. Keeping "resolved" and "partial" as distinct types is
 * the type-level half of the AL-1/AL-2 fix.
 */
export interface RoleSelection {
  readonly id: RoleId;
  /** Effective cost tier; always derived from the role's canonical `cost_tier`
   *  unless explicitly overridden. Never defaulted to a literal. */
  readonly tier: CostTier;
  /** A literal, tool-native model id that bypasses the generator's tier mapping. */
  readonly modelOverride?: string;
}

export interface HarnessConfig {
  readonly version: typeof CONFIG_VERSION;
  /** At least one. Deduped, in TOOL_IDS order. */
  readonly tools: readonly ToolId[];
  /** At least one. Deduped, in ROLE_IDS order. The conductor is never listed here. */
  readonly roles: readonly RoleSelection[];
  /** May be empty (see Behavior Guarantee 9). Deduped, in GATE_IDS order. */
  readonly gates: readonly GateId[];
  /** Deduped, in SKILL_IDS order. ALWAYS contains every CORE_SKILL_IDS member. */
  readonly skills: readonly SkillId[];
  /** Resolved to a `StackProfile` (`src/feedback.ts`'s `resolveStackProfile`) for
   *  the computational-feedback hook and CI gate (`agent-feedback-controls`).
   *  Omitted when blank; unrecognized values are inert, never an error (SC2). */
  readonly stack?: string;
}

/** Per-role tweak. Adjusts a role that is already enabled; never grants membership. */
export interface RoleOverride {
  readonly id: RoleId;
  readonly tier?: CostTier;
  readonly modelOverride?: string;
}

/**
 * **(AMENDED — AL-1/AL-2/AL-3/AL-4)** Selection and override are now two distinct
 * fields, mirroring how `gates` already behaves.
 *
 * *Superseded shape:* `Partial<Omit<HarnessConfig, 'version'>>`, whose single
 * `roles: RoleSelection[]` field had to mean both "which roles are enabled" and
 * "tier/model tweaks for a role". Because `mergeConfig` merges that field by id and
 * never removes, selection through it was structurally impossible — so `--roles`
 * could not deselect (AL-2), `--roles A --model B=x` dropped B (AL-3), and `cli.ts`
 * emitted bare `RoleId` strings that crashed `prompts.ts` (AL-1).
 */
export interface PartialHarnessConfig {
  readonly tools?: readonly ToolId[];
  /** **Wholesale replaces** the enabled role set, exactly like `gates`. Set by
   *  `--roles`. Membership only — carries no tier or model information. */
  readonly roleIds?: readonly RoleId[];
  /** Per-id tweaks layered on top of the enabled set. Set by `--model`. Merged by
   *  id; never adds or removes membership. */
  readonly roleOverrides?: readonly RoleOverride[];
  /** Wholesale replaces the active gate set. */
  readonly gates?: readonly GateId[];
  /** **Wholesale replaces the OPTIONAL portion** of the skill set, exactly as
   *  `roleIds` replaces role membership and `gates` replaces the gate set. The core
   *  six are re-added unconditionally by `mergeConfig`; naming one here is a USAGE
   *  error, never a silent no-op. Set by `--skills`. */
  readonly optionalSkillIds?: readonly OptionalSkillId[];
  readonly stack?: string;
}

/** Re-adds every `CORE_SKILL_IDS` member (a no-op if already present) and returns
 *  the result deduped and ordered per `SKILL_IDS` — the structural guarantee that
 *  core membership can never be expressed as absent (Gu 14). */
function withCoreSkills(ids: readonly SkillId[]): SkillId[] {
  return orderedUnique([...CORE_SKILL_IDS, ...ids], SKILL_IDS);
}

function orderedUnique<T extends string>(values: readonly T[], order: readonly T[]): T[] {
  const set = new Set(values);
  return order.filter((id) => set.has(id));
}

function validateIdList<T extends string>(
  raw: unknown,
  validValues: readonly T[],
  label: string,
  source: string,
): T[] {
  if (!Array.isArray(raw)) {
    throw new HarnessError('USAGE', `Invalid config (${source}): "${label}" must be an array.`);
  }
  for (const value of raw) {
    if (typeof value !== 'string' || !(validValues as readonly string[]).includes(value)) {
      throw new HarnessError(
        'USAGE',
        `Unknown ${label.replace(/s$/, '')} id "${String(value)}". Valid: ${validValues.join(', ')}`,
      );
    }
  }
  return orderedUnique(raw as T[], validValues);
}

function validateRoleSelections(raw: unknown, source: string): RoleSelection[] {
  if (!Array.isArray(raw)) {
    throw new HarnessError('USAGE', `Invalid config (${source}): "roles" must be an array.`);
  }
  const byId = new Map<RoleId, RoleSelection>();
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      throw new HarnessError('USAGE', `Invalid config (${source}): each role entry must be an object.`);
    }
    const { id, tier, modelOverride } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !(ROLE_IDS as readonly string[]).includes(id)) {
      throw new HarnessError(
        'USAGE',
        `Unknown role id "${String(id)}". Valid: ${ROLE_IDS.join(', ')}`,
      );
    }
    if (typeof tier !== 'string' || !(COST_TIERS as readonly string[]).includes(tier)) {
      throw new HarnessError(
        'USAGE',
        `Invalid config (${source}): role "${id}" has an invalid tier "${String(tier)}". Valid: ${COST_TIERS.join(', ')}`,
      );
    }
    const selection: RoleSelection =
      modelOverride === undefined
        ? { id: id as RoleId, tier: tier as CostTier }
        : { id: id as RoleId, tier: tier as CostTier, modelOverride: String(modelOverride) };
    byId.set(id as RoleId, selection);
  }
  return ROLE_IDS.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

/** Derives defaults from canonical content: every role enabled, every gate active,
 *  each role's tier read from its template's `cost_tier`. Never hardcodes tiers. */
export function defaultConfig(templates: CanonicalTemplates): HarnessConfig {
  const roles: RoleSelection[] = ROLE_IDS.map((id) => {
    const template = templates.roles.get(id);
    if (!template) {
      throw new HarnessError('TEMPLATE', `No canonical template loaded for role "${id}".`);
    }
    return { id, tier: template.metadata.costTier };
  });

  return {
    version: CONFIG_VERSION,
    tools: ['claude-code'],
    roles,
    gates: [...GATE_IDS],
    skills: [...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS],
  };
}

/**
 * Parses + fully validates `.sdd/harness.json`-shaped JSON. Throws HarnessError('USAGE').
 *
 * **(AMENDED — AL-2 consequence.)** The persisted file is a full `HarnessConfig`, so
 * it carries `roles: RoleSelection[]`, not the split flag-side fields. This function
 * translates: the listed ids become `roleIds` (a config file names exactly the roles
 * it wants — wholesale selection, consistent with `--roles`), and each entry's
 * already-resolved `tier`/`modelOverride` become `roleOverrides`. This keeps
 * `serializeConfig` → `loadConfigFile` a faithful round-trip (T13) while giving the
 * file the same replace-not-append semantics a user gets from the flag.
 */
export function loadConfigFile(contents: string, sourcePath: string): PartialHarnessConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (err) {
    throw new HarnessError(
      'USAGE',
      `Could not parse config file ${sourcePath} as JSON: ${(err as Error).message}`,
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new HarnessError('USAGE', `Config file ${sourcePath} must contain a JSON object.`);
  }

  const raw = parsed as Record<string, unknown>;

  if (raw.version !== undefined && raw.version !== CONFIG_VERSION) {
    throw new HarnessError(
      'USAGE',
      `Config file ${sourcePath}: "version" must be ${CONFIG_VERSION}, got ${String(raw.version)}.`,
    );
  }

  const result: {
    tools?: readonly ToolId[];
    roleIds?: readonly RoleId[];
    roleOverrides?: readonly RoleOverride[];
    gates?: readonly GateId[];
    optionalSkillIds?: readonly OptionalSkillId[];
    stack?: string;
  } = {};

  if (raw.tools !== undefined) {
    result.tools = validateIdList(raw.tools, TOOL_IDS, 'tools', sourcePath);
  }
  if (raw.roles !== undefined) {
    const roles = validateRoleSelections(raw.roles, sourcePath);
    // A config file names exactly the roles it wants (wholesale selection, like
    // `--roles`), and each entry's already-resolved tier/modelOverride become the
    // per-id overrides layered on afterward — see the doc comment above.
    result.roleIds = roles.map((role) => role.id);
    result.roleOverrides = roles.map(
      (role): RoleOverride =>
        role.modelOverride !== undefined
          ? { id: role.id, tier: role.tier, modelOverride: role.modelOverride }
          : { id: role.id, tier: role.tier },
    );
  }
  if (raw.gates !== undefined) {
    result.gates = validateIdList(raw.gates, GATE_IDS, 'gates', sourcePath);
  }
  if (raw.skills !== undefined) {
    // A persisted full config legitimately lists all selected skills, core included
    // — validateIdList against the full SKILL_IDS set accepts both, and only
    // unrecognized ids are USAGE errors. Translate to the optional-only partial
    // shape by intersecting with OPTIONAL_SKILL_IDS (same shape `roles` uses).
    const validated = validateIdList(raw.skills, SKILL_IDS, 'skills', sourcePath);
    const optionalSet = new Set<string>(OPTIONAL_SKILL_IDS);
    result.optionalSkillIds = validated.filter((id): id is OptionalSkillId => optionalSet.has(id));
  }
  if (raw.stack !== undefined) {
    if (typeof raw.stack !== 'string') {
      throw new HarnessError('USAGE', `Config file ${sourcePath}: "stack" must be a string.`);
    }
    if (raw.stack.length > 0) {
      result.stack = raw.stack;
    }
  }

  return result;
}

export function validateConfig(value: unknown, source: string): HarnessConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HarnessError('USAGE', `Invalid config (${source}): expected a JSON object.`);
  }
  const raw = value as Record<string, unknown>;

  if (raw.version !== CONFIG_VERSION) {
    throw new HarnessError(
      'USAGE',
      `Invalid config (${source}): "version" must be ${CONFIG_VERSION}, got ${String(raw.version)}.`,
    );
  }

  const tools = validateIdList(raw.tools, TOOL_IDS, 'tools', source);
  if (tools.length === 0) {
    throw new HarnessError('USAGE', `Invalid config (${source}): "tools" must have at least one entry.`);
  }

  const roles = validateRoleSelections(raw.roles, source);
  if (roles.length === 0) {
    throw new HarnessError('USAGE', `Invalid config (${source}): "roles" must have at least one entry.`);
  }

  const gates = validateIdList(raw.gates, GATE_IDS, 'gates', source);

  // A resolved config's "skills" always contains the core six (Gu 14); a persisted
  // one may legitimately list them explicitly (Error Handling Contract). Absent
  // entirely, it resolves to the same default `defaultConfig` uses.
  const skills =
    raw.skills === undefined
      ? [...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]
      : withCoreSkills(validateIdList(raw.skills, SKILL_IDS, 'skills', source));

  const config: HarnessConfig = {
    version: CONFIG_VERSION,
    tools,
    roles,
    gates,
    skills,
  };

  if (typeof raw.stack === 'string' && raw.stack.length > 0) {
    return { ...config, stack: raw.stack };
  }
  return config;
}

/**
 * **(AMENDED — AL-2/AL-4)** Right-biased merge, applied in a fixed order:
 *   1. If `override.roleIds` is present, it **replaces** the enabled role set. Each
 *      newly-enabled role's base tier is read from `templates` (`cost_tier`); each
 *      role retained from `base` keeps its already-resolved tier and `modelOverride`.
 *   2. `override.roleOverrides` is then layered on by id, adjusting `tier` and/or
 *      `modelOverride` of roles in the resulting set.
 *   3. `tools`, `gates`, `stack` replace wholesale when present.
 *
 * `templates` is a **required** parameter, not a convenience: it is what makes a
 * literal tier fallback unnecessary anywhere in `src/`. A newly-enabled role's tier
 * is always derivable, so no code path needs `?? 'mid'` (Behavior Guarantee 4;
 * the three surviving literals were AL-4).
 *
 * Throws `HarnessError('USAGE')` when a `roleOverride` names a role that is not in
 * the resulting enabled set — see the Error Handling Contract.
 */
export function mergeConfig(
  base: HarnessConfig,
  override: PartialHarnessConfig,
  templates: CanonicalTemplates,
): HarnessConfig {
  const tools = override.tools !== undefined ? orderedUnique(override.tools, TOOL_IDS) : base.tools;
  const gates = override.gates !== undefined ? orderedUnique(override.gates, GATE_IDS) : base.gates;

  const baseRoleMap = new Map<RoleId, RoleSelection>(base.roles.map((role) => [role.id, role]));

  // Step 1: `roleIds`, when present, wholesale-replaces membership (like `gates`).
  // Roles retained from `base` keep their settled tier/modelOverride; roles newly
  // enabled here get their tier from the canonical `cost_tier` — never a literal
  // fallback.
  let roleMap: Map<RoleId, RoleSelection>;
  if (override.roleIds !== undefined) {
    roleMap = new Map();
    for (const id of orderedUnique(override.roleIds, ROLE_IDS)) {
      const existing = baseRoleMap.get(id);
      if (existing !== undefined) {
        roleMap.set(id, existing);
        continue;
      }
      const template = templates.roles.get(id);
      if (!template) {
        throw new HarnessError('TEMPLATE', `No canonical template loaded for role "${id}".`);
      }
      roleMap.set(id, { id, tier: template.metadata.costTier });
    }
  } else {
    roleMap = new Map(baseRoleMap);
  }

  // Step 2: `roleOverrides` layers per-id tweaks on top of the resulting set. It can
  // never add or remove membership — naming a role outside the set is a USAGE error.
  if (override.roleOverrides !== undefined) {
    for (const entry of override.roleOverrides) {
      const existing = roleMap.get(entry.id);
      if (existing === undefined) {
        const enabled = ROLE_IDS.filter((id) => roleMap.has(id));
        throw new HarnessError(
          'USAGE',
          `roleOverride names role "${entry.id}", which is not in the enabled role set. ` +
            `Enabled: ${enabled.length > 0 ? enabled.join(', ') : '(none)'}.`,
        );
      }
      const tier = entry.tier ?? existing.tier;
      const modelOverride = entry.modelOverride ?? existing.modelOverride;
      roleMap.set(
        entry.id,
        modelOverride !== undefined ? { id: entry.id, tier, modelOverride } : { id: entry.id, tier },
      );
    }
  }

  const roles = ROLE_IDS.filter((id) => roleMap.has(id)).map((id) => roleMap.get(id)!);

  // Step 3: `optionalSkillIds`, when present, wholesale-replaces the OPTIONAL
  // portion of the skill set (like `roleIds` for roles). The core six are then
  // re-added unconditionally — never expressible as absent (Gu 14).
  const baseOptionalSkillIds = base.skills.filter(
    (id): id is OptionalSkillId => (OPTIONAL_SKILL_IDS as readonly string[]).includes(id),
  );
  const optionalSkillIds =
    override.optionalSkillIds !== undefined ? override.optionalSkillIds : baseOptionalSkillIds;
  const skills = withCoreSkills([...CORE_SKILL_IDS, ...optionalSkillIds]);

  const stack = override.stack !== undefined ? override.stack : base.stack;

  const merged: HarnessConfig = {
    version: CONFIG_VERSION,
    tools,
    roles,
    gates,
    skills,
  };
  return stack !== undefined && stack.length > 0 ? { ...merged, stack } : merged;
}

/** Stable JSON: keys in declaration order, 2-space indent, one trailing newline. */
export function serializeConfig(config: HarnessConfig): string {
  const ordered: Record<string, unknown> = {
    version: config.version,
    tools: config.tools,
    roles: config.roles.map((role) => {
      const entry: Record<string, unknown> = { id: role.id, tier: role.tier };
      if (role.modelOverride !== undefined) {
        entry.modelOverride = role.modelOverride;
      }
      return entry;
    }),
    gates: config.gates,
    skills: config.skills,
  };
  if (config.stack !== undefined && config.stack.length > 0) {
    ordered.stack = config.stack;
  }
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

/** `'all'` expands to TOOL_IDS; otherwise a comma-separated list. Throws on unknown ids. */
export function parseToolList(raw: string): readonly ToolId[] {
  if (raw.trim() === 'all') {
    return [...TOOL_IDS];
  }
  return parseCommaList(raw, TOOL_IDS, 'tool');
}

/** `'all'` expands to ROLE_IDS. Throws on unknown ids. */
export function parseRoleList(raw: string): readonly RoleId[] {
  if (raw.trim() === 'all') {
    return [...ROLE_IDS];
  }
  return parseCommaList(raw, ROLE_IDS, 'role');
}

/** `'all'` expands to GATE_IDS; `'none'` yields `[]`. Throws on unknown ids. */
export function parseGateList(raw: string): readonly GateId[] {
  const trimmed = raw.trim();
  if (trimmed === 'all') {
    return [...GATE_IDS];
  }
  if (trimmed === 'none') {
    return [];
  }
  return parseCommaList(raw, GATE_IDS, 'gate');
}

/** `'all'` → both optional ids; `'none'` → `[]`; otherwise a comma list of OPTIONAL
 *  ids. Naming a core skill id throws USAGE naming the always-on set. Throws USAGE on
 *  any unknown id. `--skills` addresses only the optional two; the core six are
 *  always scaffolded and cannot be named here. */
export function parseSkillList(raw: string): readonly OptionalSkillId[] {
  const trimmed = raw.trim();
  if (trimmed === 'all') {
    return [...OPTIONAL_SKILL_IDS];
  }
  if (trimmed === 'none') {
    return [];
  }

  const values = trimmed
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  for (const value of values) {
    if ((CORE_SKILL_IDS as readonly string[]).includes(value)) {
      throw new HarnessError(
        'USAGE',
        `Skill "${value}" is always scaffolded and cannot be named with --skills. ` +
          `The core skills (${CORE_SKILL_IDS.join(', ')}) are always on; --skills only ` +
          `selects the optional set: ${OPTIONAL_SKILL_IDS.join(', ')}.`,
      );
    }
    if (!(OPTIONAL_SKILL_IDS as readonly string[]).includes(value)) {
      throw new HarnessError(
        'USAGE',
        `Unknown skill id "${value}". Valid optional skills: ${OPTIONAL_SKILL_IDS.join(', ')}`,
      );
    }
  }

  const seen = new Set<string>();
  const result: OptionalSkillId[] = [];
  for (const value of values as OptionalSkillId[]) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function parseCommaList<T extends string>(raw: string, validValues: readonly T[], label: string): T[] {
  const values = raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  for (const value of values) {
    if (!(validValues as readonly string[]).includes(value)) {
      throw new HarnessError(
        'USAGE',
        `Unknown ${label} id "${value}". Valid: ${validValues.join(', ')}`,
      );
    }
  }
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values as T[]) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

/** `--model <role>=<value>`; value is a CostTier, else a literal model override. */
export function parseModelAssignment(
  raw: string,
): { role: RoleId; tier?: CostTier; modelOverride?: string } {
  const eqIndex = raw.indexOf('=');
  if (eqIndex === -1) {
    throw new HarnessError(
      'USAGE',
      `Invalid --model assignment "${raw}". Expected the form <role>=<tier-or-model-id>.`,
    );
  }
  const role = raw.slice(0, eqIndex).trim();
  const value = raw.slice(eqIndex + 1).trim();

  if (!(ROLE_IDS as readonly string[]).includes(role)) {
    throw new HarnessError('USAGE', `Unknown role id "${role}". Valid: ${ROLE_IDS.join(', ')}`);
  }

  if ((COST_TIERS as readonly string[]).includes(value)) {
    return { role: role as RoleId, tier: value as CostTier };
  }
  return { role: role as RoleId, modelOverride: value };
}
