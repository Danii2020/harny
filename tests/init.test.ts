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
 *
 * Spec: specs/agent-feedback-controls (Phase 2)
 * Covers: contract.md Behavior Guarantees 8 (escape hatch — inert, never fatal,
 * never silent), 12 (determinism/containment/trailing newline), 13 (conflict
 * detection extended to `.claude/settings.json`); intent.md SC2, SC20; roadmap.md
 * Phase 2 steps 4, 6, 9; tasks.md Tasks 2.7, 2.8, 2.9; T14, T15, T16.
 *
 * These three `describe` blocks below drive `runInit` against `REAL_TEMPLATES_ROOT`
 * (not the `well-formed` fixture): once Phase 2's green phase lands, generating a
 * hook artifact requires `templates/hooks/**` and `templates/ci/harny-feedback.yml`
 * to actually exist at the given `templatesRoot`, and only the real, production
 * templates tree carries those (`tests/generators/claude-code.test.ts` already
 * establishes this same real-templates-root convention for hook/role fidelity
 * tests). At red time, `runInit`'s render step does not yet call `renderHook` or
 * `buildFeedbackFiles` at all (Task 2.17 is pending), so `.claude/settings.json`
 * is never part of the planned/written set — every test below is expected to fail
 * because the expected artifact or behavior is simply absent, not because of a
 * wrong assumption about file contents.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § Integration Points ("`src/init.ts` step 11 —
 * `buildDoctorFiles(payload, resolvedGenerators)` is pushed into the same
 * render step... No fourteenth step; `CLI-1` holds verbatim"); § State
 * Changes; Behavior Guarantees 11, 12, 17; intent.md SC4; audit.md Test
 * Coverage T21.
 *
 * `FEEDBACK_PATHS_UNDER_TEST` below gains `.sdd/shared/probes.mjs` — it does
 * not exist on disk yet, so the two tests that iterate it are expected to
 * fail on a missing file, not a wrong assumption about newline/determinism
 * behavior. `runInit` does not yet call `buildDoctorFiles`/
 * `buildRuntimeSharedFiles` at all, so the new "doctor artifacts" describe
 * block below is expected to fail because those paths are absent from the
 * planned/written set entirely.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md § Integration Points ("`src/init.ts` step 11 — one
 * `await buildMcpFiles(...)` call plus a warning loop"); Behavior Guarantees
 * MC-1, MC-3, MC-4, MC-5, MC-6, MC-7, MC-8, MC-9, MC-14, MC-16, MC-17; Error
 * Handling Contract rows for a JSONC bail-out and for all five MCP files
 * pre-existing; intent.md SC1, SC2, SC3, SC4, SC5, SC7, SC8, SC9, SC10, SC19;
 * audit.md Test Coverage T14-T21, T29.
 *
 * `runInit` does not yet call `buildMcpFiles` at all, so every describe block
 * below is expected to fail because the five MCP paths are simply absent from
 * the planned/written set, not because of a wrong assumption about their
 * per-tool contents. Driven against `REAL_TEMPLATES_ROOT`, same as the
 * feedback/doctor blocks above, since `mcpConfig` is a fixed per-generator
 * fact independent of which templates root is loaded.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fixtureTemplatesRoot, REAL_TEMPLATES_ROOT } from './helpers/paths.js';

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
        // (agent-feedback-controls, Phase 3.) `harny-feedback` joined
        // CORE_SKILL_IDS (appended last, contract.md § "Insertion position"),
        // so it is always scaffolded too — including against this fixture,
        // which now carries a matching `skills/harny-feedback/` stub.
        '.claude/skills/harny-feedback/SKILL.md',
        // (readiness-doctor.) `harny-doctor` joined `CORE_SKILL_IDS` (appended
        // last, after `harny-feedback`), so it is always scaffolded too —
        // including against this fixture, which now carries a matching
        // `skills/harny-doctor/` stub. `buildDoctorFiles`/
        // `buildRuntimeSharedFiles` themselves contribute nothing here: this
        // lean fixture models no `doctor/`/`shared/` templates, and both
        // functions tolerate that absence (no `.sdd/doctor/*` or
        // `.sdd/shared/*` entries below).
        '.claude/skills/harny-doctor/SKILL.md',
        '.claude/skills/harny-implement/SKILL.md',
        '.claude/skills/harny-propose/SKILL.md',
        '.claude/skills/harny-standards/SKILL.md',
        '.claude/skills/harny-sync/SKILL.md',
        '.claude/skills/harny-sync/capability-template.md',
        '.claude/skills/harny-test/SKILL.md',
        // (context7-mcp.) The default Context7 MCP server, written to Claude
        // Code's own project-scope config file — a fixed per-generator fact,
        // independent of which templates root is loaded.
        '.mcp.json',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(result.planned).toHaveLength(23);
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

describe('runInit — a pre-existing .claude/settings.json is a CONFLICT before any write (BG-13) (Task 2.7)', () => {
  it('raises CONFLICT naming .claude/settings.json and leaves it untouched, without --force', async () => {
    const { runInit } = await import('../src/init.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    const { io } = collectingIO();

    await fs.mkdir(path.join(targetDir, '.claude'), { recursive: true });
    await fs.writeFile(
      path.join(targetDir, '.claude', 'settings.json'),
      '{"pre-existing": true}\n',
      'utf8',
    );

    try {
      await runInit({
        targetDir,
        templatesRoot: REAL_TEMPLATES_ROOT,
        overrides: { tools: ['claude-code'], stack: 'typescript' },
        interactive: false,
        dryRun: false,
        force: false,
        io,
      });
      expect.unreachable('expected runInit to throw CONFLICT');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      expect((err as any).details).toContain('.claude/settings.json');
    }

    const stillThere = await fs.readFile(path.join(targetDir, '.claude', 'settings.json'), 'utf8');
    expect(stillThere).toBe('{"pre-existing": true}\n');
    expect(await fs.readdir(path.join(targetDir, '.claude'))).toEqual(['settings.json']);
  });
});

describe('runInit — hook and CI artifacts are deterministic, contained, and end in exactly one newline (BG-12, CLI-4/S3) (Task 2.8)', () => {
  const FEEDBACK_PATHS_UNDER_TEST = [
    '.claude/settings.json',
    '.sdd/feedback/run-feedback.mjs',
    '.sdd/feedback/.turns/.gitignore',
    '.github/workflows/harny-feedback.yml',
    // (readiness-doctor) the shared probe module both the feedback runner and
    // the doctor runner import; tool-neutral, written exactly once (C27).
    '.sdd/shared/probes.mjs',
  ];

  it('produces byte-identical hook and CI artifacts across two independent runs of the same config', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDirA = await makeTempDir();
    const targetDirB = await makeTempDir();

    const resultA = await runInit({
      targetDir: targetDirA,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });
    const resultB = await runInit({
      targetDir: targetDirB,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    for (const relativePath of FEEDBACK_PATHS_UNDER_TEST) {
      expect(resultA.written, `${relativePath} was not written in run A`).toContain(relativePath);
      expect(resultB.written, `${relativePath} was not written in run B`).toContain(relativePath);

      const contentsA = await fs.readFile(path.join(targetDirA, relativePath), 'utf8');
      const contentsB = await fs.readFile(path.join(targetDirB, relativePath), 'utf8');
      expect(contentsA).toBe(contentsB);
    }
  });

  it('every hook/CI artifact path is relative, resolves inside targetDir, and ends in exactly one newline', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    for (const relativePath of FEEDBACK_PATHS_UNDER_TEST) {
      expect(result.written).toContain(relativePath);
      expect(path.isAbsolute(relativePath)).toBe(false);
      expect(relativePath.split('/')).not.toContain('..');

      const contents = await fs.readFile(path.join(targetDir, relativePath), 'utf8');
      expect(contents.endsWith('\n'), `${relativePath} does not end in a newline`).toBe(true);
      expect(contents.endsWith('\n\n'), `${relativePath} ends in more than one newline`).toBe(false);
    }
  });
});

describe('runInit — escape hatch: an unresolved stack still writes both feedback artifacts, inert and legible (BG-8, SC2) (Task 2.9)', () => {
  it('writes the runner and workflow, warns naming the unresolved value and every STACK_PROFILE_ID, and records "(no built-in profile)" in the conductor block', async () => {
    const { runInit } = await import('../src/init.js');
    const { STACK_PROFILE_IDS, FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const targetDir = await makeTempDir();
    const { io, warnings } = collectingIO();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'some-unrecognized-stack-xyz' },
      interactive: false,
      dryRun: false,
      force: false,
      io,
    });

    // Both tool-neutral feedback artifacts are still written — inert, never absent.
    expect(result.written).toContain(FEEDBACK_RUNNER_PATH);
    expect(result.written).toContain(CI_WORKFLOW_PATH);
    expect(result.written).toContain('.claude/settings.json');

    // io.warn names the unrecognized value and lists every built-in profile id.
    const warningText = warnings.join(' ');
    expect(warningText).toContain('some-unrecognized-stack-xyz');
    for (const id of STACK_PROFILE_IDS) {
      expect(warningText).toContain(id);
    }

    // The conductor's generated block records the escape hatch, naming the value.
    const conductorContents = await fs.readFile(
      path.join(targetDir, '.claude', 'skills', 'sdd-conductor', 'SKILL.md'),
      'utf8',
    );
    expect(conductorContents).toContain('some-unrecognized-stack-xyz');
    expect(conductorContents).toContain('(no built-in profile)');

    // The workflow is still well-formed, carrying the same notice rather than any
    // resolved profile's commands (BG-8: never silently empty).
    const workflowContents = await fs.readFile(path.join(targetDir, CI_WORKFLOW_PATH), 'utf8');
    expect(workflowContents.length).toBeGreaterThan(0);
    expect(workflowContents).not.toContain('eslint');
    expect(workflowContents).not.toContain('ruff');
  });
});

describe('runInit — the doctor runner and checks.json join the existing render step, no fourteenth step (readiness-doctor, CLI-1, BG-11, BG-17, T21)', () => {
  it('writes .sdd/doctor/run-doctor.mjs byte-identical to the template, and a deterministic, newline-terminated checks.json, exactly once regardless of tool count', async () => {
    const { runInit } = await import('../src/init.js');
    const { DOCTOR_RUNNER_PATH, DOCTOR_CHECKS_PATH } = await import('../src/doctor.js');

    const targetDirA = await makeTempDir();
    const targetDirB = await makeTempDir();

    const resultA = await runInit({
      targetDir: targetDirA,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code', 'cursor', 'kiro'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });
    const resultB = await runInit({
      targetDir: targetDirB,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    for (const relativePath of [DOCTOR_RUNNER_PATH, DOCTOR_CHECKS_PATH]) {
      expect(resultA.written.filter((p) => p === relativePath)).toHaveLength(1);
      expect(resultB.written.filter((p) => p === relativePath)).toHaveLength(1);
    }

    const runnerContents = await fs.readFile(path.join(targetDirA, DOCTOR_RUNNER_PATH), 'utf8');
    const sourceRunner = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs'), 'utf8');
    expect(runnerContents).toBe(sourceRunner);
    expect(runnerContents.endsWith('\n')).toBe(true);
    expect(runnerContents.endsWith('\n\n')).toBe(false);

    const checksContentsA = await fs.readFile(path.join(targetDirA, DOCTOR_CHECKS_PATH), 'utf8');
    expect(checksContentsA.endsWith('\n')).toBe(true);
    expect(checksContentsA.endsWith('\n\n')).toBe(false);
    expect(() => JSON.parse(checksContentsA)).not.toThrow();
  });

  it('never enters a fourteenth pipeline step: init.ts still resolves generators before writing any doctor artifact', async () => {
    const { runInit } = await import('../src/init.js');
    const { DOCTOR_RUNNER_PATH } = await import('../src/doctor.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code'], stack: 'typescript' },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    // The doctor artifact is a peer of the other tool-neutral files written in
    // the existing render step, not a new terminal step: it appears in the
    // same planned/written set init.ts already produces.
    expect(result.written).toContain(DOCTOR_RUNNER_PATH);
    expect(result.written).toContain('.sdd/harness.json');
  });
});

const ALL_TOOLS = ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'] as const;
const ALL_MCP_PATHS = [
  '.mcp.json',
  '.cursor/mcp.json',
  '.vscode/mcp.json',
  '.kiro/settings/mcp.json',
  '.codex/config.toml',
];

describe('runInit — Context7 MCP wiring: fresh five-file write in an empty repo', () => {
  it('writes all five MCP config files, each carrying a context7 entry pointing at the Context7 endpoint under that tool’s own root key', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: [...ALL_TOOLS] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    for (const relativePath of ALL_MCP_PATHS) {
      expect(result.written, `${relativePath} was not written`).toContain(relativePath);
    }

    const claudeJson = JSON.parse(await fs.readFile(path.join(targetDir, '.mcp.json'), 'utf8'));
    expect(claudeJson.mcpServers.context7).toEqual({ type: 'http', url: 'https://mcp.context7.com/mcp' });

    const cursorJson = JSON.parse(await fs.readFile(path.join(targetDir, '.cursor', 'mcp.json'), 'utf8'));
    expect(cursorJson.mcpServers.context7).toEqual({ url: 'https://mcp.context7.com/mcp' });

    const copilotJson = JSON.parse(await fs.readFile(path.join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    expect(copilotJson.servers.context7).toEqual({ type: 'http', url: 'https://mcp.context7.com/mcp' });
    expect(copilotJson.mcpServers).toBeUndefined();

    const kiroJson = JSON.parse(await fs.readFile(path.join(targetDir, '.kiro', 'settings', 'mcp.json'), 'utf8'));
    expect(kiroJson.mcpServers.context7).toEqual({ url: 'https://mcp.context7.com/mcp' });

    const codexToml = await fs.readFile(path.join(targetDir, '.codex', 'config.toml'), 'utf8');
    expect(codexToml).toContain('[mcp_servers.context7]');
    expect(codexToml).toContain('url = "https://mcp.context7.com/mcp"');
  });

  it('every written MCP artifact is relative, resolves inside targetDir, and ends in exactly one newline', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: [...ALL_TOOLS] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    for (const relativePath of ALL_MCP_PATHS) {
      expect(result.written).toContain(relativePath);
      expect(path.isAbsolute(relativePath)).toBe(false);
      expect(relativePath.split('/')).not.toContain('..');

      const contents = await fs.readFile(path.join(targetDir, relativePath), 'utf8');
      expect(contents.endsWith('\n'), `${relativePath} does not end in a newline`).toBe(true);
      expect(contents.endsWith('\n\n'), `${relativePath} ends in more than one newline`).toBe(false);
    }
  });
});

describe('runInit — Context7 MCP wiring: a subset tool selection writes only that subset’s MCP files', () => {
  it('selecting only claude-code and codex writes their two MCP files and none of the other three', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['claude-code', 'codex'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    expect(result.written).toContain('.mcp.json');
    expect(result.written).toContain('.codex/config.toml');
    expect(result.written).not.toContain('.cursor/mcp.json');
    expect(result.written).not.toContain('.vscode/mcp.json');
    expect(result.written).not.toContain('.kiro/settings/mcp.json');
  });
});

describe('runInit — Context7 MCP wiring: a pre-existing .vscode/mcp.json with unrelated servers keeps everything', () => {
  it('keeps both pre-existing servers, adds context7, and leaves every other top-level key untouched', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    await fs.mkdir(path.join(targetDir, '.vscode'), { recursive: true });
    const preExisting =
      '{\n' +
      '  "$schema": "https://example.com/schema.json",\n' +
      '  "servers": {\n' +
      '    "existing-a": { "url": "https://a.example/mcp" },\n' +
      '    "existing-b": { "type": "http", "url": "https://b.example/mcp" }\n' +
      '  }\n' +
      '}\n';
    await fs.writeFile(path.join(targetDir, '.vscode', 'mcp.json'), preExisting, 'utf8');

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['github-copilot'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    expect(result.written).toContain('.vscode/mcp.json');

    const parsed = JSON.parse(await fs.readFile(path.join(targetDir, '.vscode', 'mcp.json'), 'utf8'));
    expect(parsed['$schema']).toBe('https://example.com/schema.json');
    expect(parsed.servers['existing-a']).toEqual({ url: 'https://a.example/mcp' });
    expect(parsed.servers['existing-b']).toEqual({ type: 'http', url: 'https://b.example/mcp' });
    expect(parsed.servers.context7).toEqual({ type: 'http', url: 'https://mcp.context7.com/mcp' });
    expect(Object.keys(parsed)).toEqual(['$schema', 'servers']);
    expect(Object.keys(parsed.servers)).toEqual(['existing-a', 'existing-b', 'context7']);
  });
});

describe('runInit — Context7 MCP wiring: a pre-existing .codex/config.toml keeps its bytes as an exact prefix', () => {
  it('preserves the original Codex settings byte-for-byte and appends the context7 table once', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    await fs.mkdir(path.join(targetDir, '.codex'), { recursive: true });
    const preExisting = 'model = "gpt-5.6-sol"\napproval_policy = "never"\n\n[sandbox]\nmode = "workspace-write"\n';
    await fs.writeFile(path.join(targetDir, '.codex', 'config.toml'), preExisting, 'utf8');

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['codex'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    expect(result.written).toContain('.codex/config.toml');

    const contents = await fs.readFile(path.join(targetDir, '.codex', 'config.toml'), 'utf8');
    expect(contents.startsWith(preExisting)).toBe(true);
    expect(contents).toContain('[mcp_servers.context7]');
    expect(contents).toContain('url = "https://mcp.context7.com/mcp"');
    expect(contents.endsWith('\n')).toBe(true);
    expect(contents.endsWith('\n\n')).toBe(false);
  });
});

describe('runInit — Context7 MCP wiring: idempotence across two consecutive runs', () => {
  it('leaves all five MCP config files byte-identical between run 1 and run 2, warning "unchanged" on run 2, independently of the ~80 non-MCP artifacts correctly raising CONFLICT on that same second run', async () => {
    const { runInit } = await import('../src/init.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();

    await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: [...ALL_TOOLS] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO().io,
    });

    const afterRunOne = new Map<string, string>();
    for (const relativePath of ALL_MCP_PATHS) {
      afterRunOne.set(relativePath, await fs.readFile(path.join(targetDir, relativePath), 'utf8'));
    }

    // A second run over the same target directory, still without --force, is
    // NOT expected to succeed as a whole: the ~80 non-MCP artifacts (role,
    // skill, hook files) from run 1 are ordinary planned paths, unaffected by
    // this feature (CLI-5/MC-7 both explicitly stay unchanged for them), so
    // they correctly raise CONFLICT. Only the five merge-marked MCP paths are
    // exempted from that rule -- this test asserts idempotence for exactly
    // those five, by reading them directly off disk rather than through the
    // (never returned, because it throws) second result.
    const { io, warnings } = collectingIO();
    try {
      await runInit({
        targetDir,
        templatesRoot: REAL_TEMPLATES_ROOT,
        overrides: { tools: [...ALL_TOOLS] },
        interactive: false,
        dryRun: false,
        force: false,
        io,
      });
      expect.unreachable('expected the second run to throw CONFLICT on the ~80 non-MCP artifacts');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      for (const relativePath of ALL_MCP_PATHS) {
        expect((err as any).details, `${relativePath} unexpectedly appears as a CONFLICT`).not.toContain(
          relativePath,
        );
      }
    }

    // Bytes on disk are untouched by the second run, for all five MCP paths.
    for (const relativePath of ALL_MCP_PATHS) {
      const afterRunTwo = await fs.readFile(path.join(targetDir, relativePath), 'utf8');
      expect(afterRunTwo, `${relativePath} changed between run 1 and run 2`).toBe(afterRunOne.get(relativePath));
    }

    // Step 11 (which builds the MCP files and forwards their warnings) runs
    // before planWrites/applyWrites raise CONFLICT on the unrelated paths, so
    // the "unchanged" warning for each of the five is still observable even
    // though the run as a whole then throws.
    const warningText = warnings.join(' | ');
    for (const relativePath of ALL_MCP_PATHS) {
      expect(warningText, `no warning named ${relativePath}`).toContain(relativePath);
    }
  });
});

describe('runInit — Context7 MCP wiring: a JSONC .vscode/mcp.json triggers warn-and-skip, the run still succeeds', () => {
  it('writes nothing to .vscode/mcp.json, warns naming the path, and still writes every other artifact', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    await fs.mkdir(path.join(targetDir, '.vscode'), { recursive: true });
    const commented = '{\n  // a user comment\n  "servers": {}\n}\n';
    await fs.writeFile(path.join(targetDir, '.vscode', 'mcp.json'), commented, 'utf8');

    const { io, warnings } = collectingIO();
    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: ['github-copilot', 'claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io,
    });

    expect(result.written).not.toContain('.vscode/mcp.json');
    const stillThere = await fs.readFile(path.join(targetDir, '.vscode', 'mcp.json'), 'utf8');
    expect(stillThere).toBe(commented);

    const warningText = warnings.join(' | ');
    expect(warningText).toContain('.vscode/mcp.json');

    // The run still succeeds and writes every other artifact, including the
    // other selected tool's own MCP file.
    expect(result.written).toContain('.mcp.json');
    expect(result.written).toContain('.claude/agents/sdd-architect.md');
  });
});

describe('runInit — Context7 MCP wiring: all five MCP files pre-existing still lets the run succeed without --force', () => {
  async function seedAllFiveMcpFiles(targetDir: string): Promise<void> {
    await fs.mkdir(path.join(targetDir, '.cursor'), { recursive: true });
    await fs.mkdir(path.join(targetDir, '.vscode'), { recursive: true });
    await fs.mkdir(path.join(targetDir, '.kiro', 'settings'), { recursive: true });
    await fs.mkdir(path.join(targetDir, '.codex'), { recursive: true });

    await fs.writeFile(
      path.join(targetDir, '.mcp.json'),
      '{"mcpServers":{"context7":{"type":"http","url":"https://mcp.context7.com/mcp"}}}\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(targetDir, '.cursor', 'mcp.json'),
      '{"mcpServers":{"context7":{"url":"https://mcp.context7.com/mcp"}}}\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(targetDir, '.vscode', 'mcp.json'),
      '{"servers":{"context7":{"type":"http","url":"https://mcp.context7.com/mcp"}}}\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(targetDir, '.kiro', 'settings', 'mcp.json'),
      '{"mcpServers":{"context7":{"url":"https://mcp.context7.com/mcp"}}}\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(targetDir, '.codex', 'config.toml'),
      '[mcp_servers.context7]\nurl = "https://mcp.context7.com/mcp"\n',
      'utf8',
    );
  }

  it('succeeds without --force, warning "unchanged" for each of the five already-seeded MCP files', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();
    await seedAllFiveMcpFiles(targetDir);

    const { io, warnings } = collectingIO();
    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: [...ALL_TOOLS] },
      interactive: false,
      dryRun: false,
      force: false,
      io,
    });

    expect(result.written.length).toBeGreaterThan(0);
    const warningText = warnings.join(' | ');
    for (const relativePath of ALL_MCP_PATHS) {
      expect(warningText, `no "unchanged" warning named ${relativePath}`).toContain(relativePath);
    }
  });

  it('a pre-existing role file still raises CONFLICT, and none of the five pre-existing MCP paths appear among the conflicting paths', async () => {
    const { runInit } = await import('../src/init.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    await seedAllFiveMcpFiles(targetDir);

    await fs.mkdir(path.join(targetDir, '.claude', 'agents'), { recursive: true });
    await fs.writeFile(path.join(targetDir, '.claude', 'agents', 'sdd-architect.md'), 'pre-existing\n', 'utf8');

    try {
      await runInit({
        targetDir,
        templatesRoot: REAL_TEMPLATES_ROOT,
        overrides: { tools: [...ALL_TOOLS] },
        interactive: false,
        dryRun: false,
        force: false,
        io: collectingIO().io,
      });
      expect.unreachable('expected runInit to throw CONFLICT for the pre-existing role file');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      expect((err as any).details).toContain('.claude/agents/sdd-architect.md');
      for (const relativePath of ALL_MCP_PATHS) {
        expect((err as any).details, `${relativePath} unexpectedly appears as a CONFLICT`).not.toContain(
          relativePath,
        );
      }
    }
  });
});

describe('runInit — Context7 MCP wiring: --dry-run writes nothing but lists the five MCP paths', () => {
  it('plans all five MCP paths without creating any of them on disk', async () => {
    const { runInit } = await import('../src/init.js');
    const targetDir = await makeTempDir();

    const result = await runInit({
      targetDir,
      templatesRoot: REAL_TEMPLATES_ROOT,
      overrides: { tools: [...ALL_TOOLS] },
      interactive: false,
      dryRun: true,
      force: false,
      io: collectingIO().io,
    });

    expect(result.dryRun).toBe(true);
    expect(result.written).toEqual([]);
    for (const relativePath of ALL_MCP_PATHS) {
      expect(result.planned, `${relativePath} missing from the dry-run plan`).toContain(relativePath);
      await expect(fs.access(path.join(targetDir, relativePath))).rejects.toThrow();
    }
  });
});
