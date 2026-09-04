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
  vi.clearAllMocks();
  clackMocks.isCancel.mockReturnValue(false);
});

async function loadDefaults() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  const { defaultConfig } = await import('../src/config.js');
  const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
  return { templates, config: defaultConfig(templates) };
}

describe('runInitPrompts — question order and widgets (G2, SC2) (T43)', () => {
  it('asks the five questions in order with the contracted widgets and defaults', async () => {
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
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q4: gates
    clackMocks.select.mockResolvedValue('most-capable'); // Q3: one per role
    clackMocks.text.mockResolvedValue(''); // Q5: stack

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

    // Q3: one select per enabled role, defaulting to that role's canonical tier.
    expect(clackMocks.select).toHaveBeenCalledTimes(5);
    for (const call of clackMocks.select.mock.calls) {
      const options = call[0].options.map((o: any) => o.value);
      expect(options).toEqual(expect.arrayContaining(['most-capable', 'mid', 'cheapest']));
      expect(options.some((v: string) => /custom/i.test(v))).toBe(true);
    }

    // Q4: gate selection — NOT required (fewer than three is permitted).
    const gatesCall = clackMocks.multiselect.mock.calls[2][0];
    expect(gatesCall.required).toBe(false);
    expect(gatesCall.initialValues).toEqual(['post-specs', 'post-red-tests', 'post-audit']);

    // Q5: stack — free text, empty allowed.
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
      ])
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']);
    clackMocks.select.mockResolvedValue('most-capable');
    clackMocks.text.mockResolvedValue('');

    const result = await runInitPrompts(
      { config, available: ['claude-code'], preset: { tools: ['claude-code'] } },
      { log: () => {}, warn: () => {} },
    );

    // Only 2 multiselect calls now: roles and gates — tools was preset.
    expect(clackMocks.multiselect).toHaveBeenCalledTimes(2);
    expect(result.tools).toEqual(['claude-code']);
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
