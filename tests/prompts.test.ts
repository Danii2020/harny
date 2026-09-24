/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/prompts.ts" and its normative
 * "Question order and widgets" table (G2); intent.md success criterion SC2
 * (interactive init asks exactly the five plan.md §4 questions, in order,
 * with the production-proven defaults); R2; Error Handling Contract row for
 * prompt cancellation. C14. This test is additive to the audit's seeded
 * Test Coverage table (recorded as T43) because `interactive: false` is used
 * everywhere else in this suite by design, which would otherwise leave SC2
 * without any test at all.
 *
 * `@clack/prompts` is mocked at the module boundary: this tests OUR glue (what
 * defaults/options/order we pass it), not the library itself.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: tasks.md Task 3.5 (re-point the "generator not shipped yet" hint
 * assertion at `codex`, now that cursor/kiro/github-copilot ship real
 * generators, and assert the three newly available tools carry no hint); T21.
 *
 * Spec: specs/codex-generator
 * Covers: contract.md "SUPERSEDES — reachability of the unavailable-generator
 * paths" (G8); Behavior Guarantee 13; roadmap.md Phase 3; tasks.md Task 3.5.
 * The hint assertion below already passed a **partial** `available` array
 * (an existing `PromptDefaults` field — no production change) omitting
 * `codex`; that assertion is unchanged and still exercises the hint path,
 * driven by test data rather than by codex being genuinely unshipped. A new
 * assertion is added confirming that with the real `availableToolIds()`
 * (all five `TOOL_IDS`, codex included) **no** tool option carries a hint.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md "Public API — src/prompts.ts" (the sequence grows from
 * five questions to six, new Q3 inserted after role selection, former Q3-Q5
 * renumbered to Q4-Q6); Behavior Guarantee 15; intent.md SC11; roadmap.md
 * Phase 3.6; tasks.md Task 4.22. The pre-existing ordering test below is
 * rewritten onto the six-question sequence (not merely extended) because the
 * new Q3 shifts every subsequent `multiselect` call's mock queue position —
 * exactly the risk `roadmap.md`'s risk table names and Task 3.6 addresses by
 * "renumbering deliberately."
 *
 * ---
 * Spec: specs/monorepo-mode
 * Covers: contract.md Behavior Guarantees MC-25 (the repo-shape question,
 * asked before any stack question, defaulting to single repo; the monorepo
 * path/stack loop; flag presets skipped and reported) and MC-26 (the path
 * prompt's `validate` callback delegates to `normalizeComponentPath`);
 * intent.md SC15; audit.md Test Coverage T33, T34.
 *
 * ## The acceptance interface this file's new describe block establishes
 *
 * `contract.md` fixes the question's content (asked before any stack
 * question, default single repo, monorepo loops a path then a stack question
 * until an empty path) but leaves the exact widget choice an implementation
 * detail, mirroring how this file's own pre-existing docblock already pins
 * "Q3 = optional skills" as the acceptance interface for a similarly
 * under-specified insertion point. This suite pins: the shape question is a
 * `select` with two options (values containing "single" and "monorepo"),
 * defaulting to the single-repo value; each monorepo loop iteration asks a
 * `text` question for the path (whose `validate` callback is
 * `normalizeComponentPath`) followed by a `text` question for that
 * component's stack, repeating until an empty path is entered.
 *
 * No question in `runInitPrompts` asks about repo shape yet at red time, so
 * every test in the new describe block below fails one of two genuine ways:
 * the `select` mock is never called with a shape-shaped question at all (a
 * `toHaveBeenCalledTimes` or `.mock.calls[N]` assertion failing outright), or
 * the returned `HarnessConfig` carries neither `components` nor the expected
 * `stack` shape, because today's six-question sequence has no way to produce
 * either. Neither reflects a test-authoring bug.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureTemplatesRoot } from './helpers/paths.js';

const clackMocks = vi.hoisted(() => ({
  multiselect: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('@clack/prompts', () => clackMocks);

beforeEach(() => {
  // (Test-writer fix, templates-skill-library-parity.) `resetAllMocks`, not
  // `clearAllMocks`: the latter clears call history but leaves queued
  // `mockResolvedValueOnce` implementations in place, so a test whose queued
  // values outnumber the calls the code under test actually makes (exactly
  // the transitional state while Q3 doesn't exist yet) leaks its leftover
  // queued value into the next test's first call — cross-test contamination,
  // not a production bug. `resetAllMocks` also clears queued once-values.
  vi.resetAllMocks();
  clackMocks.isCancel.mockReturnValue(false);
});

async function loadDefaults() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  const { defaultConfig } = await import('../src/config.js');
  const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
  return { templates, config: defaultConfig(templates) };
}

describe('runInitPrompts — question order and widgets (G2, SC2) (T43)', () => {
  // (specs/monorepo-mode, MC-25 — green-phase amendment.) The sequence this
  // test walks is now SEVEN questions, not six: the repo-shape question is
  // inserted after Q3 (optional skills) and before the per-role tier selects,
  // and it is itself a `select`, so it shares the `select` mock queue with the
  // five tier questions. `select` is therefore called 6 times — once for the
  // shape question (call index 0) and once per enabled role (indices 1-5) —
  // and the "every select offers the three cost tiers" sweep below must skip
  // call 0, which offers repo shapes instead. The stack question stays last,
  // so MC-25's "before any stack question" holds.
  it('asks the seven questions in order with the contracted widgets and defaults (Q3 = optional skills, Q4 = repo shape)', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { config } = await loadDefaults();

    clackMocks.multiselect
      .mockResolvedValueOnce(['claude-code']) // Q1: tools
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ]) // Q2: roles
      .mockResolvedValueOnce(['harny-standards']) // Q3: optional skills
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q5: gates
    clackMocks.select.mockResolvedValue('most-capable'); // Q4: one per role
    clackMocks.text.mockResolvedValue(''); // Q6: stack

    const result = await runInitPrompts(
      { config, available: ['claude-code', 'cursor', 'kiro', 'github-copilot'], preset: {} },
      { log: () => {}, warn: () => {} },
    );

    // Q1: tool selection — required, defaults to claude-code, unimplemented tools hinted.
    const toolsCall = clackMocks.multiselect.mock.calls[0][0];
    expect(toolsCall.required).toBe(true);
    expect(toolsCall.initialValues).toEqual(['claude-code']);
    // Re-pointed from `cursor` to `codex` (Task 3.5): cursor, kiro and
    // github-copilot are now available and must carry NO hint; codex is the
    // one tool this feature deliberately leaves unshipped.
    const codexOption = toolsCall.options.find((o: any) => o.value === 'codex');
    expect(codexOption.hint).toMatch(/not shipped yet/i);
    for (const shippedId of ['claude-code', 'cursor', 'kiro', 'github-copilot']) {
      const option = toolsCall.options.find((o: any) => o.value === shippedId);
      expect(option.hint).toBeUndefined();
    }

    // Q2: role selection — required, defaults to all five.
    const rolesCall = clackMocks.multiselect.mock.calls[1][0];
    expect(rolesCall.required).toBe(true);
    expect(rolesCall.initialValues).toHaveLength(5);

    // Q3 (NEW): optional-skill selection — NOT required (the six core skills
    // are always scaffolded regardless of this choice), defaults to
    // DEFAULT_OPTIONAL_SKILL_IDS, and its options are exactly OPTIONAL_SKILL_IDS
    // (never a core id).
    const { OPTIONAL_SKILL_IDS, DEFAULT_OPTIONAL_SKILL_IDS, CORE_SKILL_IDS } = await import('../src/vocabulary.js');
    const skillsCall = clackMocks.multiselect.mock.calls[2][0];
    expect(skillsCall.required).toBe(false);
    expect(skillsCall.initialValues).toEqual([...DEFAULT_OPTIONAL_SKILL_IDS]);
    const skillOptionValues = skillsCall.options.map((o: any) => o.value);
    expect(new Set(skillOptionValues)).toEqual(new Set(OPTIONAL_SKILL_IDS));
    for (const coreId of CORE_SKILL_IDS) {
      expect(skillOptionValues).not.toContain(coreId);
    }

    // Q4 (NEW — MC-25): the repo-shape question, a `select`, asked before the
    // per-role tier selects and before the stack question.
    // Q5 (was Q4, was Q3): one select per enabled role, defaulting to that
    // role's canonical tier. Six `select` calls total: 1 shape + 5 roles.
    expect(clackMocks.select).toHaveBeenCalledTimes(6);
    const shapeSelectCall = clackMocks.select.mock.calls[0][0];
    expect(shapeSelectCall.message).toMatch(/monorepo/i);
    for (const call of clackMocks.select.mock.calls.slice(1)) {
      const options = call[0].options.map((o: any) => o.value);
      expect(options).toEqual(expect.arrayContaining(['most-capable', 'mid', 'cheapest']));
      expect(options.some((v: string) => /custom/i.test(v))).toBe(true);
    }

    // Q6 (was Q5, was Q4): gate selection — NOT required (fewer than three is permitted).
    const gatesCall = clackMocks.multiselect.mock.calls[3][0];
    expect(gatesCall.required).toBe(false);
    expect(gatesCall.initialValues).toEqual(['post-specs', 'post-red-tests', 'post-audit']);

    // Q7 (was Q6, was Q5): stack — free text, empty allowed.
    const stackCall = clackMocks.text.mock.calls[0][0];
    expect(stackCall.initialValue ?? '').toBe('');

    expect(result.tools).toEqual(['claude-code']);
    expect(result.gates).toEqual(['post-specs', 'post-red-tests', 'post-audit']);
  });

  it('skips a question already answered by a flag (preset)', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { config } = await loadDefaults();

    clackMocks.multiselect
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ]) // Q2: roles
      .mockResolvedValueOnce(['harny-standards']) // Q3: optional skills
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q5: gates
    clackMocks.select.mockResolvedValue('most-capable');
    clackMocks.text.mockResolvedValue('');

    const result = await runInitPrompts(
      { config, available: ['claude-code'], preset: { tools: ['claude-code'] } },
      { log: () => {}, warn: () => {} },
    );

    // Only 3 multiselect calls now: roles, skills and gates — tools was preset.
    expect(clackMocks.multiselect).toHaveBeenCalledTimes(3);
    expect(result.tools).toEqual(['claude-code']);
  });

  it('skips Q3 (optional skills) when preset by a flag, reporting the preset selection', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { config } = await loadDefaults();
    const logs: string[] = [];

    clackMocks.multiselect
      .mockResolvedValueOnce(['claude-code']) // Q1: tools
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ]) // Q2: roles
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q5: gates
    clackMocks.select.mockResolvedValue('most-capable');
    clackMocks.text.mockResolvedValue('');

    await runInitPrompts(
      { config, available: ['claude-code'], preset: { optionalSkillIds: ['harny-adr'] } },
      { log: (m: string) => logs.push(m), warn: () => {} },
    );

    // Only 3 multiselect calls now: tools, roles, gates — skills was preset.
    expect(clackMocks.multiselect).toHaveBeenCalledTimes(3);
    expect(logs.some((m) => m.includes('harny-adr'))).toBe(true);
  });

  it('carries no hint on any tool option when passed the real availableToolIds() (all five TOOL_IDS, codex included)', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { availableToolIds } = await import('../src/generators/index.js');
    const { config } = await loadDefaults();

    clackMocks.multiselect
      .mockResolvedValueOnce(['claude-code'])
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ])
      .mockResolvedValueOnce(['harny-standards'])
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']);
    clackMocks.select.mockResolvedValue('most-capable');
    clackMocks.text.mockResolvedValue('');

    await runInitPrompts(
      { config, available: availableToolIds(), preset: {} },
      { log: () => {}, warn: () => {} },
    );

    const toolsCall = clackMocks.multiselect.mock.calls[0][0];
    for (const option of toolsCall.options) {
      expect(option.hint, `${option.value} unexpectedly carries a hint`).toBeUndefined();
    }
  });

  it('throws HarnessError(CANCELLED) and calls clack\'s cancel() when the user aborts a prompt', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { isHarnessError } = await import('../src/errors.js');
    const { config } = await loadDefaults();

    const CANCEL_SYMBOL = Symbol('cancel');
    clackMocks.multiselect.mockResolvedValueOnce(CANCEL_SYMBOL);
    clackMocks.isCancel.mockImplementation((v: unknown) => v === CANCEL_SYMBOL);

    try {
      await runInitPrompts(
        { config, available: ['claude-code'], preset: {} },
        { log: () => {}, warn: () => {} },
      );
      expect.unreachable('expected runInitPrompts to throw CANCELLED');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CANCELLED');
      expect(clackMocks.cancel).toHaveBeenCalled();
    }
  });
});

describe('runInitPrompts — the repo-shape question (MC-25, MC-26, T33, T34)', () => {
  it('asks the shape question, defaulting to single repo; answering single repo leads to the unchanged stack question, and the result has no components', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { config } = await loadDefaults();

    clackMocks.multiselect
      .mockResolvedValueOnce(['claude-code']) // tools
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ]) // roles
      .mockResolvedValueOnce(['harny-standards']) // optional skills
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // gates
    clackMocks.select.mockImplementation(async (opts: any) => {
      // The shape question: two options, defaulting to the single-repo value.
      expect(opts.options).toHaveLength(2);
      expect(opts.initialValue).toBeDefined();
      const singleRepoOption = opts.options.find((o: any) => /single/i.test(String(o.value) + String(o.label)));
      expect(singleRepoOption).toBeDefined();
      expect(opts.initialValue).toBe(singleRepoOption.value);
      return singleRepoOption.value;
    });
    // Every role's model-tier question also uses `select` in this flow, so once
    // the shape question is answered, fall back to the tier default for the
    // rest of the calls.
    let shapeAnswered = false;
    const originalImpl = clackMocks.select.getMockImplementation()!;
    clackMocks.select.mockImplementation(async (opts: any) => {
      if (!shapeAnswered) {
        shapeAnswered = true;
        return originalImpl(opts);
      }
      return 'most-capable';
    });
    clackMocks.text.mockResolvedValue(''); // stack question: unchanged, empty

    const result = await runInitPrompts(
      { config, available: ['claude-code'], preset: {} },
      { log: () => {}, warn: () => {} },
    );

    expect((result as any).components).toBeUndefined();
    expect(result.stack).toBeUndefined();

    // The shape select call happened before the stack text call.
    const shapeCallOrder = clackMocks.select.mock.invocationCallOrder[0];
    const stackCallOrder = clackMocks.text.mock.invocationCallOrder[0];
    expect(shapeCallOrder).toBeLessThan(stackCallOrder);
  });

  it('answering monorepo loops a path question (validated by normalizeComponentPath) and a stack question until an empty path, requiring at least one component', async () => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { normalizeComponentPath } = await import('../src/config.js');
    const { config } = await loadDefaults();

    clackMocks.multiselect
      .mockResolvedValueOnce(['claude-code'])
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ])
      .mockResolvedValueOnce(['harny-standards'])
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']);

    let shapeAnswered = false;
    clackMocks.select.mockImplementation(async () => {
      if (!shapeAnswered) {
        shapeAnswered = true;
        const monorepoValue = 'monorepo';
        return monorepoValue;
      }
      return 'most-capable'; // per-role model tier, unrelated to this test
    });

    // Path/stack loop: '.' -> 'python', then 'apps/web' -> 'typescript', then
    // an empty path to terminate. The path question's own `validate` callback
    // must delegate to normalizeComponentPath (MC-26) — captured off the last
    // text() call carrying one, so it does not depend on call-index brittleness
    // for the assertion below.
    let capturedValidate: ((raw: string) => string | undefined) | undefined;
    const pathAndStackAnswers = ['.', 'python', 'apps/web', 'typescript', ''];
    let callIndex = 0;
    clackMocks.text.mockImplementation(async (opts: any) => {
      if (typeof opts.validate === 'function') {
        capturedValidate = opts.validate;
      }
      const answer = pathAndStackAnswers[callIndex];
      callIndex += 1;
      return answer;
    });

    const result = await runInitPrompts(
      { config, available: ['claude-code'], preset: {} },
      { log: () => {}, warn: () => {} },
    );

    expect((result as any).components).toEqual([
      { path: '.', stack: 'python' },
      { path: 'apps/web', stack: 'typescript' },
    ]);
    expect(result.stack).toBeUndefined();

    // MC-26: the path prompt's validate callback IS normalizeComponentPath (or
    // delegates to it) — an absolute path must be rejected the same way.
    expect(capturedValidate).toBeDefined();
    let rejectedAbsolute = false;
    try {
      const message = capturedValidate!('/abs/path');
      rejectedAbsolute = typeof message === 'string' && message.length > 0;
    } catch {
      rejectedAbsolute = true;
    }
    expect(rejectedAbsolute).toBe(true);
    expect(() => normalizeComponentPath('/abs/path', 'prompt')).toThrow();
  });

  it.each([
    ['--stack', { tools: ['claude-code'], stack: 'typescript' }],
    ['--component', { tools: ['claude-code'], components: [{ path: '.', stack: 'typescript' }] }],
  ] as const)('a %s flag presets the shape question, skipping it and reporting through io.log', async (_label, preset) => {
    const { runInitPrompts } = await import('../src/prompts.js');
    const { config } = await loadDefaults();
    const logs: string[] = [];

    clackMocks.multiselect
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-auditor',
        'sdd-documentation',
      ])
      .mockResolvedValueOnce(['harny-standards'])
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']);
    clackMocks.select.mockResolvedValue('most-capable');
    clackMocks.text.mockResolvedValue(''); // stack question, when reached

    await runInitPrompts(
      { config, available: ['claude-code'], preset: preset as any },
      { log: (m: string) => logs.push(m), warn: () => {} },
    );

    // The shape question is presented and skipped just like every other
    // preset question in this file (preset.tools/preset.gates both log "…
    // already set by a flag: …") — pinned here as "shape" appears somewhere
    // in a reported log line, the same convention this file already
    // establishes for every other preset question.
    expect(logs.some((m) => /shape/i.test(m))).toBe(true);
  });
});

describe('confirmWrite — the final write confirmation', () => {
  it('resolves true when the user confirms', async () => {
    const { confirmWrite } = await import('../src/prompts.js');
    clackMocks.confirm.mockResolvedValueOnce(true);

    const confirmed = await confirmWrite(
      { targetDir: '/tmp/x', files: [], conflicts: [] },
      { log: () => {}, warn: () => {} },
    );

    expect(confirmed).toBe(true);
  });

  it('throws HarnessError(CANCELLED) when the user declines', async () => {
    const { confirmWrite } = await import('../src/prompts.js');
    const { isHarnessError } = await import('../src/errors.js');
    clackMocks.confirm.mockResolvedValueOnce(false);

    try {
      await confirmWrite({ targetDir: '/tmp/x', files: [], conflicts: [] }, { log: () => {}, warn: () => {} });
      expect.unreachable('expected confirmWrite to throw CANCELLED');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CANCELLED');
    }
  });
});
