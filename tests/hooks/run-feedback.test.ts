/**
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md § Data Models "Touched-file accumulation record" (G2, V2, V3);
 * Behavior Guarantees 1 (one run per turn), 3 (no per-edit invocation), 4 (empty turn
 * is a no-op), 5 (loop safety / re-entry), 9 (absent tooling is skipped, not failed);
 * intent.md SC6a (the batching proof); roadmap.md Phase 1 step 6; tasks.md Tasks
 * 1.3–1.7.
 *
 * `templates/hooks/run-feedback.mjs` does not exist yet at red time. Every test below
 * drives it as a real subprocess (per roadmap.md's stated Phase 1 test approach,
 * since it is a template artifact copied verbatim into target repos — contract.md
 * BG-11 — never a `src/` module imported in-process). At red time `node <that path>`
 * fails immediately with a "Cannot find module" error and a non-zero exit code, which
 * is the expected red-phase failure for every test in this file.
 *
 * ---
 * ## The runner interface these tests establish
 *
 * `contract.md` fixes the mapping module, the three path constants and the turn-file
 * record's location/lifecycle, but deliberately leaves the runner script's own CLI a
 * `templates/hooks/run-feedback.mjs` implementation detail (roadmap.md Phase 1 step 6
 * describes its two modes only in prose). Per the harny-test procedure, this test file
 * is what pins that detail down as the acceptance interface `harny-implement` must
 * satisfy:
 *
 * - Invocation: `node run-feedback.mjs <mode>`, where `<mode>` is `accumulate` or
 *   `run`, executed with `cwd` set to the target repo root (mirroring how a real
 *   tool's hook runs the script and matching `TOUCHED_FILES_DIR`'s repo-relative
 *   path).
 * - The tool's raw hook event is piped to the runner as JSON on STDIN, carrying at
 *   least a turn-key field (`session_id` is used throughout this file, one of the
 *   four fields contract.md's precedence list allows) and, for `accumulate` only,
 *   `tool_input.file_path` — the one field contract.md V3 actually verifies (Claude
 *   Code's `PostToolUse` payload).
 * - `run` mode additionally takes `--commands <path-to-json-file>`, a JSON array of
 *   `FeedbackCommand`-shaped objects. This is how the runner receives the resolved
 *   `STACK_PROFILES` commands without ever hard-coding a command string itself —
 *   `templates/hooks/run-feedback.mjs` is copied byte-for-byte to every target repo,
 *   so it cannot embed a mapping only `src/feedback.ts` may own (BG-7); a real
 *   per-tool hook config supplies this file, generated at `harny init` time.
 * - Exit code convention for `run` mode: `0` when the turn produced no
 *   blocking-worthy findings (including a clean pass, a skip-only outcome, or an
 *   empty turn); `2` when a mapped command's failure would otherwise warrant forcing
 *   the tool's blocking channel (mirroring the exit-2 convention contract.md V4
 *   already documents as one of Claude Code's own two blocking mechanisms). BG-5's
 *   re-entry guard is therefore observable directly as "the same failing turn must
 *   not produce exit code 2 when `stop_hook_active` is true."
 *
 * The fake mapped commands below never invoke a real linter/type-checker (offline by
 * default, AGENTS.md S6); `tests/fixtures/hooks/record-invocation.mjs` stands in for
 * one, logging its own invocations so BG-1 is verified "by counting runner
 * invocations, not by inspecting findings" exactly as contract.md BG-1 requires.
 *
 * ---
 * Spec: specs/agent-feedback-controls (Post-audit amendment A1)
 * Covers: contract.md § "Runner CLI surface" (the new `run --whole-project`
 * invocation form); its aspect table (STDIN turn key not read/required, turn file
 * never read/written/deleted, `per-file` receives exactly `.`, `requires` probe
 * identical code path, `stop_hook_active` not applicable, exit code identical and
 * load-bearing); Behavior Guarantees 19 (CI's exit 2 is never translated/
 * suppressed) and 20 (CI never touches turn state); § Data Models "Whole-project
 * invocation record"; Error Handling Contract rows for a CI finding and a CI probe
 * skip; tasks.md Post-audit amendment A1.
 *
 * `templates/hooks/run-feedback.mjs`'s `parseRunArgs` does not recognize
 * `--whole-project` yet at red time — the flag is silently ignored by today's
 * argument loop, so `run` falls back to its ordinary turn-key/turn-file
 * requirement. Every test in the `--whole-project` describe block below drives
 * the runner with no turn key and no turn file (the exact case `--whole-project`
 * must handle), so today's runner takes its existing "no turn key -> exit 0,
 * nothing ran" early-return path (`runRunMode`'s `if (!turnKey) { process.exit(0);
 * }`) instead of running any mapped command. Every assertion that a command
 * actually ran, or that a finding actually propagated as exit 2, is therefore
 * expected to fail for that genuine reason (missing `--whole-project` support),
 * not a test-authoring bug.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, TESTS_DIR } from '../helpers/paths.js';

const RUNNER_PATH = path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs');
const RECORD_SCRIPT = path.join(TESTS_DIR, 'fixtures', 'hooks', 'record-invocation.mjs');

const tempDirs: string[] = [];

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-feedback-runner-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

interface RunnerResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/** Spawns the shared runner as a real subprocess over a fixture turn file/stdin
 *  payload, per roadmap.md Phase 1's stated test approach. */
function runRunner(
  mode: 'accumulate' | 'run',
  options: {
    cwd: string;
    /** `null` writes zero bytes to STDIN (a genuinely empty pipe) — used by the
     *  `--whole-project` tests below to prove the flag reads no STDIN turn key at
     *  all, not merely one lacking a recognized field. Omitted/an object writes
     *  that JSON, exactly as before. */
    stdin?: Record<string, unknown> | null;
    args?: string[];
    env?: Record<string, string>;
  },
): Promise<RunnerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [RUNNER_PATH, mode, ...(options.args ?? [])], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));

    if (options.stdin !== null) {
      child.stdin.write(JSON.stringify(options.stdin ?? {}));
    }
    child.stdin.end();
  });
}

async function writeCommandsFile(dir: string, commands: unknown): Promise<string> {
  const file = path.join(dir, `commands-${Math.random().toString(36).slice(2)}.json`);
  await fs.writeFile(file, JSON.stringify(commands), 'utf8');
  return file;
}

/** `.sdd/feedback/.turns/<turn-key>`, contract.md § Data Models. */
function turnFilePath(repoDir: string, turnKey: string): string {
  return path.join(repoDir, '.sdd', 'feedback', '.turns', turnKey);
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

describe('one run per turn, deduped by path — the batching proof (BG-1, SC6a)', () => {
  it('N edits across M distinct files trigger exactly one invocation per command, each receiving exactly M deduped paths', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'turn-batching-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const fileA = path.join(repoDir, 'src', 'a.ts');
    const fileB = path.join(repoDir, 'src', 'b.ts');
    const fileC = path.join(repoDir, 'src', 'c.ts');

    // 5 edits (N) across 3 distinct files (M): a, b, a, c, b — N > M > 1, with
    // repeats and an interleaved re-visit, mirroring intent.md's own example.
    const edits = [fileA, fileB, fileA, fileC, fileB];
    for (const file of edits) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'per-file-probe',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'PER_FILE'],
        pathMode: 'per-file',
        requires: {},
      },
      {
        id: 'whole-project-probe',
        kind: 'typecheck',
        argv: ['node', RECORD_SCRIPT, 'WHOLE_PROJECT'],
        pathMode: 'whole-project',
        requires: {},
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);

    const logLines = (await fs.readFile(invocationLog, 'utf8')).trim().split('\n').filter(Boolean);
    const invocations = logLines.map((line) => JSON.parse(line) as { argv: string[] });

    // Exactly one invocation per resolved command — not one per edit, and not
    // one per file. A per-edit implementation logs 5 PER_FILE invocations here.
    const perFileCalls = invocations.filter((inv) => inv.argv[0] === 'PER_FILE');
    const wholeProjectCalls = invocations.filter((inv) => inv.argv[0] === 'WHOLE_PROJECT');
    expect(perFileCalls).toHaveLength(1);
    expect(wholeProjectCalls).toHaveLength(1);

    // The one per-file invocation covers exactly the M=3 deduped absolute paths.
    const receivedPaths = perFileCalls[0].argv.slice(1);
    expect(receivedPaths).toHaveLength(3);
    expect(new Set(receivedPaths)).toEqual(new Set([fileA, fileB, fileC]));

    // whole-project mode ignores the touched-file set entirely (BG-1's "or none").
    expect(wholeProjectCalls[0].argv).toEqual(['WHOLE_PROJECT']);
  });

  it('deletes the turn file after running it, so a reused turn key cannot leak into the next turn', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'turn-cleanup-session';
    const file = path.join(repoDir, 'src', 'only.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const turnFile = turnFilePath(repoDir, sessionId);
    expect(await pathExists(turnFile)).toBe(true);

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'noop', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'NOOP'], pathMode: 'per-file', requires: {} },
    ]);
    const run = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
    });
    expect(run.code).toBe(0);

    expect(await pathExists(turnFile)).toBe(false);
  });
});

describe('accumulate mode appends and never executes a mapped command (BG-3)', () => {
  it('appends the touched path to the turn file and exits 0 without spawning anything', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'accumulate-only-session';
    const file = path.join(repoDir, 'src', 'touched.ts');
    const invocationLog = path.join(repoDir, 'invocations.log');

    const result = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);

    const turnFile = turnFilePath(repoDir, sessionId);
    const contents = await fs.readFile(turnFile, 'utf8');
    expect(contents).toContain(file);

    // No mapped command was ever spawned by accumulate mode — the log the
    // fake command would have written to must not exist at all.
    expect(await pathExists(invocationLog)).toBe(false);
  });

  it('several accumulate calls in the same turn still run no command until "run" mode is invoked', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'accumulate-multi-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    for (const name of ['one.ts', 'two.ts', 'three.ts']) {
      const result = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: path.join(repoDir, 'src', name) } },
        env: { INVOCATION_LOG: invocationLog },
      });
      expect(result.code).toBe(0);
    }

    expect(await pathExists(invocationLog)).toBe(false);
  });
});

describe('a turn touching zero files is a no-op (BG-4)', () => {
  it('runs no command and produces no output when the turn file was never created', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'empty-turn-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'never-run', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'NEVER'], pathMode: 'per-file', requires: {} },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('');
    expect(result.stderr.trim()).toBe('');
    expect(await pathExists(invocationLog)).toBe(false);
  });
});

describe('a command whose requires probe is false is skipped, not failed (BG-9)', () => {
  it('skips the command with a notice and leaves exit status unaffected', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'probe-skip-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const file = path.join(repoDir, 'src', 'skipped.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'absent-linter',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'SHOULD_NOT_RUN'],
        pathMode: 'per-file',
        requires: { binary: 'harny-test-definitely-missing-binary-zzz' },
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    // Skipping never fails the run: exit status unaffected.
    expect(result.code).toBe(0);

    // The fake command was never actually spawned.
    expect(await pathExists(invocationLog)).toBe(false);

    // A notice names the skipped command, on whichever stream the runner uses.
    const combinedOutput = (result.stdout + result.stderr).toLowerCase();
    expect(combinedOutput).toContain('skip');
    expect(result.stdout + result.stderr).toContain('absent-linter');
  });
});

describe('the re-entry flag suppresses any blocking response (BG-5)', () => {
  it('a failing mapped command normally causes the runner to signal a blocking finding', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'reentry-baseline-session';
    const file = path.join(repoDir, 'src', 'broken.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'failing-check', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'FAIL'], pathMode: 'per-file', requires: {} },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { FAKE_EXIT_CODE: '1' },
    });

    // Baseline: this is the same scenario the re-entry test below re-runs with
    // stop_hook_active set. Establishing that it *would* block here is what
    // gives the re-entry assertion below actual teeth.
    expect(result.code).toBe(2);
  });

  it('the identical failing turn, re-entered (stop_hook_active), never signals a blocking response', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'reentry-suppressed-session';
    const file = path.join(repoDir, 'src', 'broken.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'failing-check', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'FAIL'], pathMode: 'per-file', requires: {} },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: true },
      args: ['--commands', commandsFile],
      env: { FAKE_EXIT_CODE: '1' },
    });

    // Same failing command, only the re-entry flag differs — the runner must
    // not drive a tool's loop-safety override (Claude/Copilot's 8-block
    // override, Cursor's loop_limit of 5) by emitting a blocking response.
    expect(result.code).toBe(0);
  });
});

describe('run --whole-project: the CI-only mode that bypasses turn state entirely (A1; BG-19, BG-20)', () => {
  it('runs mapped commands with no turn file and no turn key on STDIN at all, and never creates or reads .sdd/feedback/.turns (BG-20)', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');
    const turnsDir = path.join(repoDir, '.sdd', 'feedback', '.turns');

    // No `accumulate` call was ever made in this repo — nothing has created a
    // turn file or even the .turns directory.
    expect(await pathExists(turnsDir)).toBe(false);

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'ci-check',
        kind: 'typecheck',
        argv: ['node', RECORD_SCRIPT, 'CI_CHECK'],
        pathMode: 'whole-project',
        requires: {},
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null, // genuinely empty STDIN — "not read, not required" (contract.md)
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);

    const logLines = (await fs.readFile(invocationLog, 'utf8').catch(() => ''))
      .trim()
      .split('\n')
      .filter(Boolean);
    expect(logLines).toHaveLength(1);

    // Still never created — a whole-project run has no reason to touch it.
    expect(await pathExists(turnsDir)).toBe(false);
  });

  it('appends exactly "." as the sole argument to a per-file command — the documented whole-project substitute for the (absent) turn\'s touched paths', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'per-file-check',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'PER_FILE'],
        pathMode: 'per-file',
        requires: {},
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null,
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);
    expect(await pathExists(invocationLog)).toBe(true);

    const logLines = (await fs.readFile(invocationLog, 'utf8')).trim().split('\n').filter(Boolean);
    expect(logLines).toHaveLength(1);
    const invocation = JSON.parse(logLines[0]) as { argv: string[] };
    expect(invocation.argv).toEqual(['PER_FILE', '.']);
  });

  it('still skips a command whose requires probe is false, through the identical code path as normal run mode (BG-9)', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'absent-tool-ci',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'SHOULD_NOT_RUN'],
        pathMode: 'whole-project',
        requires: { binary: 'harny-test-definitely-missing-binary-zzz' },
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null,
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    // Skipping never fails the run: exit status unaffected, same as normal mode.
    expect(result.code).toBe(0);
    expect(await pathExists(invocationLog)).toBe(false);

    const combinedOutput = (result.stdout + result.stderr).toLowerCase();
    expect(combinedOutput).toContain('skip');
    expect(result.stdout + result.stderr).toContain('absent-tool-ci');
  });

  it('a finding still exits 2 in whole-project mode', async () => {
    const repoDir = await makeTempRepo();

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'failing-ci-check',
        kind: 'typecheck',
        argv: ['node', RECORD_SCRIPT, 'FAIL'],
        pathMode: 'whole-project',
        requires: {},
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null,
      args: ['--whole-project', '--commands', commandsFile],
      env: { FAKE_EXIT_CODE: '1' },
    });

    expect(result.code).toBe(2);
  });

  it('never honors stop_hook_active in whole-project mode — exit 2 propagates unconditionally, unlike normal run mode\'s re-entry suppression (BG-19)', async () => {
    const repoDir = await makeTempRepo();

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'failing-ci-check',
        kind: 'typecheck',
        argv: ['node', RECORD_SCRIPT, 'FAIL'],
        pathMode: 'whole-project',
        requires: {},
      },
    ]);

    // A `stop_hook_active: true` payload is exactly what suppresses exit 2 in
    // normal `run` mode (see "the re-entry flag suppresses..." above). CI has no
    // re-entry concept, so --whole-project must not read or honor it at all —
    // the runner's exit code is the CI step's exit code, unmediated (BG-19).
    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { stop_hook_active: true },
      args: ['--whole-project', '--commands', commandsFile],
      env: { FAKE_EXIT_CODE: '1' },
    });

    expect(result.code).toBe(2);
  });
});
