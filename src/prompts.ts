/**
 * The five interactive `plan.md` §4 questions, driven by `@clack/prompts`.
 * Kept to widget wiring only — every decision lives in `config.ts`/`init.ts`
 * so the non-interactive path stays the fully-testable one.
 */
import { cancel, confirm, isCancel, multiselect, select, text } from '@clack/prompts';
import { HarnessError } from './errors.js';
import { COST_TIERS, GATE_IDS, ROLE_IDS, TOOL_IDS } from './vocabulary.js';
import type { CostTier, GateId, RoleId, ToolId } from './vocabulary.js';
import type { HarnessConfig, PartialHarnessConfig, RoleSelection } from './config.js';
import type { WritePlan } from './writer.js';
import type { InitIO } from './init.js';

export interface PromptDefaults {
  /** Already fully resolved: role membership settled, tiers derived from canonical
   *  `cost_tier`, overrides applied. Prompts read tiers from here — they never
   *  re-derive a tier and never need a literal fallback (AL-4). */
  readonly config: HarnessConfig;
  /** Tool ids that have a generator, shown with a distinguishing hint. */
  readonly available: readonly ToolId[];
  /**
   * Questions already answered by a flag; these are skipped and reported.
   *
   * **(AMENDED — AL-1.)** Question 2 (role selection) is preset by `preset.roleIds`,
   * a `readonly RoleId[]` — *not* by a list of `RoleSelection` objects. The previous
   * shape invited exactly the crash that shipped: `cli.ts` wrote bare `RoleId`
   * strings into the single `roles` field while `prompts.ts` read `role.id` off each
   * element, yielding `[undefined]` and an empty role set. Question 3 (per-role model)
   * is preset by `preset.roleOverrides`.
   */
  readonly preset: PartialHarnessConfig;
}

const CUSTOM_MODEL_OPTION = 'custom…';

/** Raises HarnessError('CANCELLED') for any clack `isCancel` result, after
 *  emitting clack's own cancellation message. */
function unwrapOrCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Init cancelled.');
    throw new HarnessError('CANCELLED', 'The init prompts were cancelled by the user.');
  }
  return value as T;
}

/** Asks exactly the five plan.md §4 questions, in order. Throws
 *  HarnessError('CANCELLED') when the user aborts (clack `isCancel`). */
export async function runInitPrompts(defaults: PromptDefaults, io: InitIO): Promise<HarnessConfig> {
  const { config, available, preset } = defaults;

  // Q1: which agent tool(s)?
  let tools: readonly ToolId[];
  if (preset.tools !== undefined) {
    tools = preset.tools;
    io.log(`Tools already set by a flag: ${tools.join(', ')}`);
  } else {
    const answer = await multiselect<ToolId>({
      message: 'Which agent tool(s) should this harness generate for?',
      options: TOOL_IDS.map((id) => ({
        value: id,
        label: id,
        hint: available.includes(id) ? undefined : 'generator not shipped yet',
      })),
      initialValues: [...config.tools],
      required: true,
    });
    tools = unwrapOrCancel(answer);
  }

  // Q2: which roles to enable? (the conductor is always on)
  // (AMENDED — AL-1.) Preset by `preset.roleIds` (RoleId[]), never by `.id`-mapping
  // a list of RoleSelection-shaped objects — that mapping is exactly what crashed.
  let roleIds: readonly RoleId[];
  if (preset.roleIds !== undefined) {
    roleIds = preset.roleIds;
    io.log(`Roles already set by a flag: ${roleIds.join(', ')}`);
  } else {
    const answer = await multiselect<RoleId>({
      message: 'Which roles should be enabled? (the conductor is always on, regardless of this choice)',
      options: ROLE_IDS.map((id) => ({ value: id, label: id })),
      initialValues: config.roles.map((role) => role.id),
      required: true,
    });
    roleIds = unwrapOrCancel(answer);
  }

  // Q3: model per role. Preset per-role by `preset.roleOverrides` — a role named
  // there is skipped and reported; every other selected role is asked normally.
  // `config` is already fully resolved (any flag-supplied roleOverride was already
  // applied by the merge that produced it), so the per-role default read off
  // `config.roles` never needs a literal tier fallback (AL-4).
  const overriddenRoleIds = new Set<RoleId>((preset.roleOverrides ?? []).map((entry) => entry.id));
  const roles: RoleSelection[] = [];
  for (const roleId of roleIds) {
    const resolved = config.roles.find((role) => role.id === roleId);
    if (resolved === undefined) {
      // Guaranteed not to happen on the real init pipeline: `config` passed here is
      // always a superset of `roleIds` (see runInit step 4/5), but fail loudly
      // rather than silently defaulting if that invariant is ever violated.
      throw new Error(`Internal: role "${roleId}" selected at question 2 has no resolved tier in the merged config.`);
    }

    if (overriddenRoleIds.has(roleId)) {
      io.log(`Model for ${roleId} already set by a flag: ${resolved.modelOverride ?? resolved.tier}`);
      roles.push(resolved);
      continue;
    }

    const tierAnswer = await select<string>({
      message: `Model tier for ${roleId}? (production-proven default: ${resolved.tier})`,
      options: [
        ...COST_TIERS.map((tier) => ({ value: tier, label: tier })),
        { value: CUSTOM_MODEL_OPTION, label: CUSTOM_MODEL_OPTION },
      ],
      initialValue: resolved.tier,
    });
    const selected = unwrapOrCancel(tierAnswer);

    if (selected === CUSTOM_MODEL_OPTION) {
      const modelAnswer = await text({
        message: `Literal model id to use for ${roleId}:`,
      });
      const modelOverride = unwrapOrCancel(modelAnswer);
      roles.push({ id: roleId, tier: resolved.tier, modelOverride });
    } else {
      roles.push({ id: roleId, tier: selected as CostTier });
    }
  }

  // Q4: which human gates are active?
  let gates: readonly GateId[];
  if (preset.gates !== undefined) {
    gates = preset.gates;
    io.log(`Gates already set by a flag: ${gates.length > 0 ? gates.join(', ') : '(none)'}`);
  } else {
    const answer = await multiselect<GateId>({
      message: 'Which human gates are active? (fewer than three is permitted, but not recommended)',
      options: GATE_IDS.map((id) => ({ value: id, label: id })),
      initialValues: [...config.gates],
      required: false,
    });
    gates = unwrapOrCancel(answer);
  }

  // Q5: project stack (captured only).
  let stack: string | undefined;
  if (preset.stack !== undefined) {
    stack = preset.stack;
  } else {
    const answer = await text({
      message: 'Project stack? (captured only — nothing in this feature reads it)',
      placeholder: '(none)',
      initialValue: '',
    });
    const value = unwrapOrCancel(answer);
    stack = value.length > 0 ? value : undefined;
  }

  const orderedRoles = ROLE_IDS.filter((id) => roles.some((role) => role.id === id)).map(
    (id) => roles.find((role) => role.id === id)!,
  );

  const result: HarnessConfig = {
    version: config.version,
    tools,
    roles: orderedRoles,
    gates,
  };
  return stack !== undefined ? { ...result, stack } : result;
}

/** Final "write these files?" confirmation. Skipped under `--yes`. */
export async function confirmWrite(plan: WritePlan, _io: InitIO): Promise<boolean> {
  const answer = await confirm({
    message: `Write ${plan.files.length} file(s) into ${plan.targetDir}?`,
  });

  if (isCancel(answer)) {
    cancel('Write cancelled.');
    throw new HarnessError('CANCELLED', 'The write confirmation was cancelled by the user.');
  }
  if (!answer) {
    throw new HarnessError('CANCELLED', 'The user declined to write the planned files.');
  }
  return true;
}
