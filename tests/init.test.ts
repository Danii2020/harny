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
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantees 18, 19 ("Determinism, containment,
 * trailing newline" and "Conflict detection covers skill paths"); intent.md
 * SC14; roadmap.md Phase 4.8; tasks.md Tasks 4.28, 4.29. The well-formed
 * fixture now carries a `skills/` subtree (`tests/fixtures/templates/
 * well-formed/skills/**`, created for this feature per `roadmap.md`'s File
 * Change Map) with exactly the default-selected seven skills, so a full
 * `runInit` over it plans the nine skill-library files this feature adds,
 * alongside the twelve pre-existing contracted files.
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
        // No `.claude/skills/README.md` here: the well-formed fixture
        // deliberately omits `skills/README.md` to exercise tolerated absence
        // (see tests/templates.test.ts's matching assertion for this same
        // fixture: "absent for the well-formed fixture (no README.md there)").
        '.claude/skills/harny-audit/SKILL.md',
        '.claude/skills/harny-document/SKILL.md',
        '.claude/skills/harny-implement/SKILL.md',
        '.claude/skills/harny-propose/SKILL.md',
        '.claude/skills/harny-standards/SKILL.md',
        '.claude/skills/harny-sync/SKILL.md',
        '.claude/skills/harny-sync/capability-template.md',
        '.claude/skills/harny-test/SKILL.md',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(result.planned).toHaveLength(20);
  });
});

describe('runInit — skill artifacts inherit conflict detection, containment, and the trailing-newline rule (Gu 18, 19; templates-skill-library-parity) (Task 4.28, 4.29)', () => {
  it('lists skill paths in a dry-run plan, writing nothing', async () => {
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

    expect(result.written).toEqual([]);
    expect(result.planned).toContain('.claude/skills/harny-sync/SKILL.md');
    // No `.claude/skills/README.md` here: the well-formed fixture deliberately
    // omits `skills/README.md` (see tests/templates.test.ts and
    // tests/skills-placement.test.ts, which cover README placement against the
    // real, production `templates/skills/` tree).
  });

  it('raises CONFLICT (exit 3) and writes nothing when a planned skill path already exists, without --force', async () => {
    const { runInit } = await import('../src/init.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    await fs.mkdir(path.join(targetDir, '.claude', 'skills', 'harny-sync'), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, '.claude', 'skills', 'harny-sync', 'SKILL.md'),
      'pre-existing content\n',
      'utf8',
    );

    try {
      await runInit({
        targetDir,
        templatesRoot: fixtureTemplatesRoot('well-formed'),
        overrides: { tools: ['claude-code'] },
        interactive: false,
        dryRun: false,
        force: false,
        io,
      });
      expect.unreachable('expected runInit to throw CONFLICT');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      expect((err as any).details).toContain('.claude/skills/harny-sync/SKILL.md');
    }

    // Nothing else was written either: only the pre-existing file is present.
    const stillThere = await fs.readFile(
      path.join(targetDir, '.claude', 'skills', 'harny-sync', 'SKILL.md'),
      'utf8',
    );
    expect(stillThere).toBe('pre-existing content\n');
  });

  it('overwrites the conflicting skill path with --force', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    await fs.mkdir(path.join(targetDir, '.claude', 'skills', 'harny-sync'), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, '.claude', 'skills', 'harny-sync', 'SKILL.md'),
      'pre-existing content\n',
      'utf8',
    );

    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: true,
      io,
    });

    expect(result.written).toContain('.claude/skills/harny-sync/SKILL.md');
    const overwritten = await fs.readFile(
      path.join(targetDir, '.claude', 'skills', 'harny-sync', 'SKILL.md'),
      'utf8',
    );
    expect(overwritten).not.toBe('pre-existing content\n');
  });

  it('every written skill artifact is relative, resolves inside targetDir, and ends in exactly one newline', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    const result = await runInit({
      targetDir,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io,
    });

    const skillPaths = result.written.filter((p) => p.startsWith('.claude/skills/'));
    expect(skillPaths.length).toBeGreaterThan(0);

    for (const relativePath of skillPaths) {
      expect(path.isAbsolute(relativePath)).toBe(false);
      expect(relativePath.split('/')).not.toContain('..');

      const contents = await fs.readFile(path.join(targetDir, relativePath), 'utf8');
      expect(contents.endsWith('\n'), `${relativePath} does not end in a newline`).toBe(true);
      expect(contents.endsWith('\n\n'), `${relativePath} ends in more than one newline`).toBe(false);
    }
  });

  it('produces a byte-identical skill tree across two independent runs with the same config', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDirA = await makeTempDir();
    const targetDirB = await makeTempDir();

    const resultA = await runInit({
      targetDir: targetDirA,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });
    const resultB = await runInit({
      targetDir: targetDirB,
      templatesRoot: fixtureTemplatesRoot('well-formed'),
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    const skillPathsA = resultA.written.filter((p) => p.startsWith('.claude/skills/')).sort();
    const skillPathsB = resultB.written.filter((p) => p.startsWith('.claude/skills/')).sort();
    expect(skillPathsA.length).toBeGreaterThan(0);
    expect(skillPathsA).toEqual(skillPathsB);

    for (const relativePath of skillPathsA) {
      const contentsA = await fs.readFile(path.join(targetDirA, relativePath), 'utf8');
      const contentsB = await fs.readFile(path.join(targetDirB, relativePath), 'utf8');
      expect(contentsA).toBe(contentsB);
    }
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
  // Re-pointed onto a synthetic registry (specs/codex-generator tasks.md Task
  // 3.3, contract.md "SUPERSEDES — reachability of the unavailable-generator
  // paths"): now that all five `TOOL_IDS` have a real generator, no legal
  // `--tools` value can trigger the skip-and-warn branch or `NO_GENERATOR`
  // any more. Both branches, and their coverage, are kept — driven by a
  // `vi.doMock` of `src/generators/index.js` that deletes `codex` from a copy
  // of the real registry, rather than by a real unimplemented tool id. No
  // injection seam is added to `src/init.ts`.
  async function withCodexUnavailable<T>(run: () => Promise<T>): Promise<T> {
    vi.resetModules();
    vi.doMock('../src/generators/index.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/generators/index.js')>();
      const partial = new Map(actual.generators);
      partial.delete('codex');
      return {
        ...actual,
        generators: partial,
        getGenerator: (id: string) => partial.get(id as never),
        availableToolIds: () => [...partial.keys()],
      };
    });
    try {
      return await run();
    } finally {
      vi.doUnmock('../src/generators/index.js');
      vi.resetModules();
    }
  }

  it('reports a tool without a generator as skipped while another selected tool still generates', async () => {
    await withCodexUnavailable(async () => {
      const { runInit } = await import('../src/init.js');
      const targetDir = await makeTempDir();
      const { io, warnings } = collectingIO();

      const result = await runInit({
        targetDir,
        templatesRoot: fixtureTemplatesRoot('well-formed'),
        overrides: { tools: ['claude-code', 'codex'] },
        interactive: false,
        dryRun: true,
        force: false,
        io,
      });

      expect(result.skippedTools).toEqual(['codex']);
      expect(warnings.some((w) => w.includes('codex'))).toBe(true);
    });
  });

  it('throws NO_GENERATOR and writes nothing when no selected tool has a generator', async () => {
    await withCodexUnavailable(async () => {
      const { runInit } = await import('../src/init.js');
      const { isHarnessError } = await import('../src/errors.js');
      const targetDir = await makeTempDir();
      const { io } = collectingIO();

      try {
        await runInit({
          targetDir,
          templatesRoot: fixtureTemplatesRoot('well-formed'),
          overrides: { tools: ['codex'] },
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
    // though --model already targeted it (below). Q3 (templates-skill-library-
    // parity: new optional-skills question, inserted between roles and gates)
    // defaults to harny-standards. Q5: all three gates.
    clackMocks.multiselect
      .mockResolvedValueOnce([
        'sdd-architect',
        'sdd-test-writer',
        'sdd-executor',
        'sdd-documentation',
      ]) // Q2: roles (auditor deselected)
      .mockResolvedValueOnce(['harny-standards']) // Q3: optional skills
      .mockResolvedValueOnce(['post-specs', 'post-red-tests', 'post-audit']); // Q5: gates
    clackMocks.select.mockResolvedValue('most-capable'); // Q4: one per selected role
    clackMocks.text.mockResolvedValue(''); // Q6: stack

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
