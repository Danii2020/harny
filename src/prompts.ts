/**
 * The five interactive `plan.md` §4 questions, driven by `@clack/prompts`.
 * Kept to widget wiring only — every decision lives in `config.ts`/`init.ts`
 * so the non-interactive path stays the fully-testable one.
 */
import { cancel, confirm, isCancel, multiselect, select, text } from '@clack/prompts';
import { HarnessError } from './errors.js';
import { CORE_SKILL_IDS, COST_TIERS, DEFAULT_OPTIONAL_SKILL_IDS, GATE_IDS, OPTIONAL_SKILL_IDS, ROLE_IDS, SKILL_IDS, TOOL_IDS } from './vocabulary.js';
import type { CostTier, GateId, OptionalSkillId, RoleId, SkillId, ToolId } from './vocabulary.js';
import { normalizeComponentPath } from './config.js';
import type { ComponentSelection, HarnessConfig, PartialHarnessConfig, RoleSelection } from './config.js';
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

  // Q3: which optional skills? (the six core skills are always scaffolded)
  let optionalSkillIds: readonly OptionalSkillId[];
  if (preset.optionalSkillIds !== undefined) {
    optionalSkillIds = preset.optionalSkillIds;
    io.log(
      `Optional skills already set by a flag: ${
        optionalSkillIds.length > 0 ? optionalSkillIds.join(', ') : '(none)'
      }`,
    );
  } else {
    const answer = await multiselect<OptionalSkillId>({
      message: 'Which optional skills should be scaffolded? (the six core skills are always on)',
      options: OPTIONAL_SKILL_IDS.map((id) => ({ value: id, label: id })),
      initialValues: [...DEFAULT_OPTIONAL_SKILL_IDS],
      required: false,
    });
    optionalSkillIds = unwrapOrCancel(answer);
  }

  // (NEW — specs/monorepo-mode, MC-25.) Repo shape: single repo vs. monorepo,
  // asked before any stack question. A flag-supplied `--stack` or `--component`
  // presets this question, skipped and reported through `io.log` exactly like
  // every other preset question in this file. `select`, not `multiselect` — it
  // does not consume a slot in the `multiselect` mock queue above.
  const SHAPE_SINGLE_REPO = 'single-repo';
  const SHAPE_MONOREPO = 'monorepo';
  let components: ComponentSelection[] | undefined;
  let isMonorepo: boolean;

  if (preset.stack !== undefined || preset.components !== undefined) {
    isMonorepo = preset.components !== undefined;
    io.log(`Repo shape already set by a flag: ${isMonorepo ? 'monorepo' : 'single repo'}.`);
    if (isMonorepo) {
      components = [...preset.components!];
    }
  } else {
    const shapeAnswer = await select<string>({
      message: 'Is this a single repo or a monorepo?',
      options: [
        { value: SHAPE_SINGLE_REPO, label: 'Single repo' },
        { value: SHAPE_MONOREPO, label: 'Monorepo (multiple components)' },
      ],
      initialValue: SHAPE_SINGLE_REPO,
    });
    const shape = unwrapOrCancel(shapeAnswer);
    isMonorepo = shape === SHAPE_MONOREPO;

    if (isMonorepo) {
      // (MC-25.) Loops a path question then a stack question until an empty
      // path ends the loop, requiring at least one component.
      const collected: ComponentSelection[] = [];
      for (;;) {
        const pathAnswer = await text({
          message: 'Component path? (relative to the install directory; leave empty to finish)',
          placeholder: '(done)',
          initialValue: '',
          // (MC-26.) `prompts.ts` owns no rule, only the call: an empty answer
          // ends the loop rather than being validated as a path, and every
          // non-empty answer is validated by delegating to the one normalizer.
          validate: (value: string | undefined) => {
            if (!value || value.trim().length === 0) {
              return undefined;
            }
            try {
              normalizeComponentPath(value, 'prompt');
              return undefined;
            } catch (err) {
              return (err as Error).message;
            }
          },
        });
        const rawPath = unwrapOrCancel(pathAnswer);
        if (rawPath.trim().length === 0) {
          break;
        }

        const stackAnswer = await text({
          message: `Project stack for component "${rawPath}"? (typescript/python built-in feedback profiles; anything else is inert)`,
          placeholder: '(none)',
          initialValue: '',
        });
        const rawStack = unwrapOrCancel(stackAnswer);
        collected.push(rawStack.length > 0 ? { path: rawPath, stack: rawStack } : { path: rawPath });
      }

      if (collected.length === 0) {
        throw new HarnessError('USAGE', 'A monorepo install requires at least one declared component.');
      }
      components = collected;
    }
  }

  // Q4 (was Q3): model per role. Preset per-role by `preset.roleOverrides` — a role named
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

  // Q5 (was Q4): which human gates are active?
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

  // Q6 (was Q5): project stack — resolves the computational-feedback hook/CI
  // profile (agent-feedback-controls); an unrecognized value is inert, never an
  // error (SC2).
  // (specs/monorepo-mode, MC-25.) When the shape answer is monorepo — by preset
  // or by the loop above — the shape question already answered this one; the
  // stack question is not asked at all, and `components` carries the answer.
  let stack: string | undefined;
  if (isMonorepo) {
    stack = undefined;
  } else if (preset.stack !== undefined) {
    stack = preset.stack;
  } else {
    const answer = await text({
      message: 'Project stack? (typescript/python built-in feedback profiles; anything else is inert)',
      placeholder: '(none)',
      initialValue: '',
    });
    const value = unwrapOrCancel(answer);
    stack = value.length > 0 ? value : undefined;
  }

  const orderedRoles = ROLE_IDS.filter((id) => roles.some((role) => role.id === id)).map(
    (id) => roles.find((role) => role.id === id)!,
  );

  const skillSet = new Set<SkillId>([...CORE_SKILL_IDS, ...optionalSkillIds]);
  const skills = SKILL_IDS.filter((id) => skillSet.has(id));

  const result: HarnessConfig = {
    version: config.version,
    tools,
    roles: orderedRoles,
    gates,
    skills,
  };
  if (components !== undefined) {
    return { ...result, components };
  }
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
