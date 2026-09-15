/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/cli.ts" (G1, G8), the interactivity
 * resolution rule, and the Error Handling Contract's exit-code column;
 * Behavior Guarantee 17; C17, C18b; T33, T34, T35.
 *
 * AL-3 amendment round: a `--model` assignment naming a role `--roles`
 * excluded is a USAGE error naming the role and the enabled set, not a
 * silent drop — Behavior Guarantee 22, the new Error Handling Contract row,
 * Task 5.17, T5.17.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: tasks.md Task 3.3 (re-point the `--tools cursor` → exit-4
 * "unimplemented tool" stand-in at `codex`, now that cursor ships a real
 * generator); T21.
 *
 * Spec: specs/codex-generator
 * Covers: contract.md "SUPERSEDES — reachability of the unavailable-generator
 * paths" (G8); Behavior Guarantee 13; roadmap.md Phase 3; tasks.md Task 3.4.
 * Re-points the exit-4 test again, now onto a synthetic registry
 * (`vi.doMock('../src/generators/index.js', …)`), since codex itself now
 * ships a real generator too.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md "Public API — src/cli.ts" (the new `doctor` sibling
 * command); Behavior Guarantees 6, 7; Error Handling Contract rows for a
 * missing scaffolded runner and a completed red run; intent.md SC16, SC17,
 * SC18, SC19; audit.md Test Coverage T19.
 *
 * `buildProgram` does not register a `doctor` command yet at red time, so
 * every `main(['doctor', ...])` call below fails with commander's own
 * "unknown command" usage error (exit 1, not the contracted 0/2/6), and every
 * `--skills harny-doctor` assertion fails because `harny-doctor` is not yet a
 * known skill id — not a wrong assumption about either surface's shape.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-cli-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

/** Captures everything written to stdout/stderr/console during `fn`. */
async function captureOutput(fn: () => Promise<unknown>): Promise<{ result: unknown; text: string }> {
  const chunks: string[] = [];
  const record = (chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  };
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(record as any);
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(record as any);
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => record(args.join(' ')));
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args) => record(args.join(' ')));
  const consoleWarnSpy = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => record(args.join(' ')));

  try {
    const result = await fn();
    return { result, text: chunks.join('\n') };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  }
}

describe('main() never calls process.exit (guarantee 17)', () => {
  it('returns an ExitCode instead of exiting the process, across success and failure paths', async () => {
    const { main } = await import('../src/cli.js');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code}) was called — guarantee 17 violated`);
    }) as never);

    await captureOutput(() => main(['--help']));
    await captureOutput(() => main(['totally-bogus-command']));

    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('--help (R1, C18b) (T35)', () => {
  it('renders "Usage: harny" (never "harness.js") and lists the init command', async () => {
    const { main } = await import('../src/cli.js');

    const { text } = await captureOutput(() => main(['--help']));

    expect(text).toContain('Usage: harny');
    expect(text).not.toContain('harness.js');
    expect(text).toContain('init');
  });
});

describe('--help lists exactly two commands, init and doctor (readiness-doctor, SC16, T19)', () => {
  it('still reads "Usage: harny [options] [command]" and lists both "init" and "doctor"', async () => {
    const { main } = await import('../src/cli.js');

    const { text } = await captureOutput(() => main(['--help']));

    expect(text).toContain('Usage: harny [options] [command]');
    expect(text).toContain('init');
    expect(text).toContain('doctor');
  });

  it('registers exactly two commands on the program', async () => {
    const { buildProgram } = await import('../src/cli.js');

    const program = buildProgram();
    const commandNames = program.commands.map((c) => c.name());

    expect(commandNames).toEqual(['init', 'doctor']);
  });

  it('the doctor command\'s own --help lists its [target] argument and --stack flag', async () => {
    const { main } = await import('../src/cli.js');

    const { text } = await captureOutput(() => main(['doctor', '--help']));

    expect(text).toContain('target');
    expect(text).toContain('--stack');
  });
});

describe('harny-doctor is unnameable via --skills, exactly like every other core skill (readiness-doctor, SC1)', () => {
  it('exits 2 naming harny-doctor as always-scaffolded when passed to --skills', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result, text } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code', '--skills', 'harny-doctor']),
    );

    expect(result).toBe(2);
    expect(text).toContain('harny-doctor');
    // Distinct from an "unknown skill id" error: harny-doctor must be
    // recognized and rejected specifically as an always-on core skill (the
    // same wording config.test.ts's "harny-propose" case already asserts),
    // not merely an unrecognized name.
    expect(text.toLowerCase()).toContain('always');

    const entries = await fs.readdir(targetDir);
    expect(entries).toEqual([]);
  });
});

describe('the doctor verb (readiness-doctor, G8, SC16-SC19, T19)', () => {
  it('exits USAGE (2) naming the missing scaffolded runner and the npx harny init remediation, never a stack trace, when the target has no doctor runner', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result, text } = await captureOutput(() => main(['doctor', targetDir]));

    expect(result).toBe(2);
    expect(text).toContain('.sdd/doctor/run-doctor.mjs');
    expect(text).toContain('npx harny init');
    expect(text).not.toContain('at ');
    expect(text.toLowerCase()).not.toContain('stack trace');
  });

  it('exits 0 in a properly onboarded, freshly scaffolded repo (SC17)', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const initResult = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']),
    );
    expect(initResult.result).toBe(0);

    // `runInit` scaffolds the harness, not a conventions document — no
    // feature writes one (intent.md's own problem statement wants a missing
    // conventions doc flagged, per the universal `conventions-doc` check).
    // A human actually onboarding a fresh scaffold adds one; this mirrors
    // that step so the test exercises "ready" on a fully onboarded repo,
    // not an incompletely-set-up fixture.
    await fs.writeFile(path.join(targetDir, 'AGENTS.md'), '# AGENTS\n\nProject conventions.\n', 'utf8');

    const { result } = await captureOutput(() => main(['doctor', targetDir]));
    expect(result).toBe(0);
  });

  it('exits with a code distinct from EXIT.UNEXPECTED (1) and from every other HarnessErrorCode mapping when the readiness check reports red (SC17)', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']));
    // Force a red readiness result by removing a required harness artifact
    // after scaffolding.
    await fs.rm(path.join(targetDir, '.sdd', 'harness.json'), { force: true });

    const { result } = await captureOutput(() => main(['doctor', targetDir]));

    expect(result).toBe(6);
    expect([0, 1, 2, 3, 4, 5, 130]).not.toContain(result);
  });

  it('writes absolutely nothing under the target directory across a green run, a red run, and a --stack override (SC19)', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']));

    async function snapshot(): Promise<string[]> {
      async function walk(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const out: string[] = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) out.push(...(await walk(full)));
          else out.push(path.relative(targetDir, full));
        }
        return out;
      }
      return (await walk(targetDir)).sort();
    }

    const before = await snapshot();
    const first = await captureOutput(() => main(['doctor', targetDir]));
    // The `--stack` override deliberately names an unrecognized stack rather
    // than a real built-in profile (e.g. "python"): a real profile's
    // readiness command probe (e.g. pytest's `{ binary: 'pytest' }`) depends
    // on what happens to be installed on the machine running this suite —
    // if a global `pytest` is present, it actually runs and leaves its own
    // `.pytest_cache/` side effect in `targetDir`, breaking this test
    // non-deterministically for reasons unrelated to the guarantee under
    // test. An unrecognized stack resolves to zero readiness commands
    // (BG-8), so no command is ever spawned here regardless of the host
    // environment — SC19's actual guarantee (the doctor verb itself writes
    // nothing) is exercised deterministically instead.
    const second = await captureOutput(() => main(['doctor', targetDir, '--stack', 'some-unrecognized-stack-xyz']));
    const after = await snapshot();

    // The doctor verb's only legitimate outcomes are "ready" (0) or "not
    // ready" (6, distinct from every CLI-failure code) — asserted here so
    // this test cannot pass merely because "doctor" is still an unrecognized
    // command today (which would exit 1 and trivially write nothing).
    expect([0, 6]).toContain(first.result);
    expect([0, 6]).toContain(second.result);
    expect(after).toEqual(before);
  });
});

describe('exit-code mapping (T34)', () => {
  it('maps an unknown command/flag to exit 1 (commander usage error)', async () => {
    const { main } = await import('../src/cli.js');
    const { result } = await captureOutput(() => main(['this-command-does-not-exist']));
    expect(result).toBe(1);
  });

  it('maps an unknown tool id (HarnessError USAGE) to exit 2', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'not-a-real-tool']),
    );
    expect(result).toBe(2);
  });

  it('maps a re-run over existing output without --force (HarnessError CONFLICT) to exit 3', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const first = await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code']));
    expect(first.result).toBe(0);

    const second = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code']),
    );
    expect(second.result).toBe(3);
  });

  it('succeeds with --force over an existing conflicting run', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code']));
    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code', '--force']),
    );
    expect(result).toBe(0);
  });

  it('maps no-available-generator (HarnessError NO_GENERATOR) to exit 4', async () => {
    // Re-pointed onto a synthetic registry (specs/codex-generator tasks.md
    // Task 3.4, contract.md "SUPERSEDES — reachability of the
    // unavailable-generator paths"): now that all five `TOOL_IDS` have a real
    // generator, no legal `--tools` value can trigger `NO_GENERATOR` any
    // more. The `HarnessError` → exit-4 mapping and the "nothing written"
    // guarantee are kept, driven by a `vi.doMock` of
    // `src/generators/index.js` that deletes `codex` from a copy of the real
    // registry, rather than by a real unimplemented tool id. No injection
    // seam is added to `src/init.ts` or `src/cli.ts`.
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
      const { main } = await import('../src/cli.js');
      const targetDir = await makeTempDir();

      const { result } = await captureOutput(() =>
        main(['init', targetDir, '--yes', '--tools', 'codex']),
      );
      expect(result).toBe(4);

      const entries = await fs.readdir(targetDir);
      expect(entries).toEqual([]);
    } finally {
      vi.doUnmock('../src/generators/index.js');
      vi.resetModules();
    }
  });
});

describe('--roles / --model contradiction is a USAGE error, not a silent drop (AL-3, guarantee 22, Error Handling Contract) (T5.17)', () => {
  it('exits 2 naming the excluded role and the enabled set when --model targets a role --roles left out, and writes nothing', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result, text } = await captureOutput(() =>
      main([
        'init',
        targetDir,
        '--yes',
        '--tools',
        'claude-code',
        '--roles',
        'sdd-architect',
        '--model',
        'sdd-auditor=opus',
      ]),
    );

    expect(result).toBe(2);
    expect(text).toContain('sdd-auditor');
    expect(text).toContain('sdd-architect');

    const entries = await fs.readdir(targetDir);
    expect(entries).toEqual([]);
  });
});

describe('interactivity resolution (Error Handling Contract row; R14) (T33)', () => {
  it('--yes forces non-interactive even without a TTY', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code']),
    );
    expect(result).toBe(0);
  });

  it('--config forces non-interactive even without --yes', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();
    const configPath = path.join(targetDir, 'harness.config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        tools: ['claude-code'],
        roles: [
          { id: 'sdd-architect', tier: 'most-capable' },
          { id: 'sdd-test-writer', tier: 'mid' },
          { id: 'sdd-executor', tier: 'mid' },
          { id: 'sdd-auditor', tier: 'most-capable' },
          { id: 'sdd-documentation', tier: 'cheapest' },
        ],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
      }),
    );

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--config', configPath]),
    );
    expect(result).toBe(0);
  });

  it('exits 2 naming both --yes and --config when stdin is not a TTY and neither is given', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    try {
      const { result, text } = await captureOutput(() => main(['init', targetDir]));
      expect(result).toBe(2);
      expect(text).toContain('--yes');
      expect(text).toContain('--config');
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    }
  });
});
