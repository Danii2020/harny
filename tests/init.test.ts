/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/init.ts", the normative 12-step
 * `runInit` sequence (G1, G3, G6, G7, G8, G9); Behavior Guarantees 3, 9, 12, 18;
 * C16; T29, T30, T31, T32.
 *
 * AL-2 amendment round: `roleIds` actually deselects roles on the emitted file
 * set, in isolation from `gates` — Behavior Guarantee 22, Task 5.16, T5.16.
 * AL-3 interactive-gap amendment round: a flag-supplied `roleOverride` for a
 * role deselected interactively at question 2 warns rather than errors or
 * silently drops — Behavior Guarantee 22, Task 5.18a, T5.18a.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fixtureTemplatesRoot } from './helpers/paths.js';

// Only used by the T5.18a interactive-path block below; every other test in
// this file drives runInit with interactive: false, so it never touches
// @clack/prompts and this mock is simply unused for those paths.
const clackMocks = vi.hoisted(() => ({
  multiselect: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@clack/prompts', () => clackMocks);

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-init-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function collectingIO() {
  const logs: string[] = [];
  const warnings: string[] = [];
  return {
    io: {
      log: (m: string) => logs.push(m),
      warn: (m: string) => warnings.push(m),
    },
    logs,
    warnings,
  };
}

describe('runInit — happy path over the well-formed fixture (T29)', () => {
  it('resolves defaults, builds the payload, and plans exactly the twelve contracted files', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: true,
      force: false,
      io,
    });

    expect(result.dryRun).toBe(true);
    expect(result.written).toEqual([]);
    expect(result.skippedTools).toEqual([]);
    expect(result.config.roles).toHaveLength(5);
    expect(result.config.gates).toEqual(['post-specs', 'post-red-tests', 'post-audit']);

    expect(result.planned.sort()).toEqual(
      [
        '.claude/agents/sdd-architect.md',
        '.claude/agents/sdd-test-writer.md',
        '.claude/agents/sdd-executor.md',
        '.claude/agents/sdd-auditor.md',
        '.claude/agents/sdd-documentation.md',
        '.claude/skills/sdd-conductor/SKILL.md',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
  });
});

describe('runInit — reduced gates warning (guarantee 9) (T30)', () => {
  it('warns naming the missing gates when fewer than three are configured', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io, warnings } = collectingIO();

    await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'], gates: ['post-specs'] },
      interactive: false,
      dryRun: true,
      force: false,
      io,
    });

    const joined = warnings.join(' ');
    expect(joined).toContain('post-red-tests');
    expect(joined).toContain('post-audit');
  });

  it('does not warn when all three gates are active', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io, warnings } = collectingIO();

    await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: true,
      force: false,
      io,
    });

    expect(warnings.some((w) => w.includes('gate'))).toBe(false);
  });
});

describe('runInit — generator availability (guarantee 18) (T31)', () => {
  it('reports a tool without a generator as skipped while another selected tool still generates', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io, warnings } = collectingIO();

    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code', 'cursor'] },
      interactive: false,
      dryRun: true,
      force: false,
      io,
    });

    expect(result.skippedTools).toEqual(['cursor']);
    expect(warnings.some((w) => w.includes('cursor'))).toBe(true);
  });

  it('throws NO_GENERATOR and writes nothing when no selected tool has a generator', async () => {
    const { runInit } = await import('../src/init.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    try {
      await runInit({
        targetDir,
        templatesRoot: fixtureTemplatesRoot('well-formed'),
        overrides: { tools: ['cursor'] },
        interactive: false,
        dryRun: false,
        force: false,
        io,
      });
      expect.unreachable('expected runInit to throw NO_GENERATOR');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('NO_GENERATOR');
    }

    const entries = await fs.readdir(targetDir);
    expect(entries).toEqual([]);
  });
});

describe('runInit — deselecting a role touches only the generated block (guarantee 3) (T32)', () => {
  it('leaves the conductor\'s canonical prose byte-identical whether one role or five are enabled', async () => {
    const { runInit } = await import('../src/init.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../src/generators/markdown-yaml.js');

    const fullTargetDir = await makeTempDir();
    const partialTargetDir = await makeTempDir();
    const { io: ioFull } = collectingIO();
    const { io: ioPartial } = collectingIO();

    await runInit({
      targetDir: fullTargetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: ioFull,
    });

    await runInit({
      targetDir: partialTargetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'], roles: ['sdd-architect'], gates: ['post-specs'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: ioPartial,
    });

    const fullConductor = await fs.readFile(
      path.join(fullTargetDir, '.claude', 'skills', 'sdd-conductor', 'SKILL.md'),
      'utf8',
    );
    const partialConductor = await fs.readFile(
      path.join(partialTargetDir, '.claude', 'skills', 'sdd-conductor', 'SKILL.md'),
      'utf8',
    );

    const fullProse = fullConductor.slice(0, fullConductor.indexOf(GENERATED_BLOCK_BEGIN));
    const partialProse = partialConductor.slice(0, partialConductor.indexOf(GENERATED_BLOCK_BEGIN));

    expect(fullProse).toBe(partialProse);
    expect(fullConductor).not.toBe(partialConductor); // the generated block itself must differ
  });
});

describe('runInit — "roleIds" actually deselects, independently of gates (AL-2, guarantee 22, replaces the weak T32) (T5.16)', () => {
  it('plans exactly one .claude/agents/*.md file for sdd-architect when only roleIds is overridden and gates stay at their default', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    // Deliberately vary ONLY roleIds -- no gates override -- so this test
    // cannot pass "for the wrong reason" the way T32 did (T32's "partial" run
    // varied gates and roles together, so its assertion held even had --roles
    // been a complete no-op).
    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'], roleIds: ['sdd-architect'] },
      interactive: false,
      dryRun: true,
      force: false,
      io,
    });

    const agentFiles = result.planned.filter((p) => p.startsWith('.claude/agents/'));
    expect(agentFiles).toEqual(['.claude/agents/sdd-architect.md']);
    expect(result.config.gates).toEqual(['post-specs', 'post-red-tests', 'post-audit']);
  });
});

describe('runInit — interactive-path AL-3 gap: a flag-supplied roleOverride for a role deselected at question 2 warns, not errors (guarantee 22, Error Handling Contract) (T5.18a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clackMocks.isCancel.mockReturnValue(false);
  });

  it('completes normally with an io.warn naming the role and the unapplied override, rather than erroring or dropping it silently', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io, warnings } = collectingIO();

    // Q2: the user deselects sdd-auditor at the role-selection prompt, even
    // though --model already targeted it (below). Q4: all three gates.
    clackMocks.multiselect
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-documentation',
      ]) // Q2: roles (auditor deselected)
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q4: gates
    clackMocks.select.mockResolvedValue('most-capable'); // Q3: one per selected role
    clackMocks.text.mockResolvedValue(''); // Q5: stack

    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: {
        tools: ['claude-code'],
        roleOverrides: [{ id: 'sdd-auditor', modelOverride: 'literal-model-x' }],
      },
      interactive: true,
      dryRun: true, // avoids needing a confirmWrite mock; step 6 runs before dry-run's early return
      force: false,
      io,
    });

    // The run completed at all (didn't throw) -- the "exit 0" half of the guarantee.
    expect(result.dryRun).toBe(true);
    expect(result.config.roles.some((role) => role.id === 'sdd-auditor')).toBe(false);

    const warningText = warnings.join(' ');
    expect(warningText).toContain('sdd-auditor');
    expect(warningText.toLowerCase()).toContain('not applied');
  });
});
