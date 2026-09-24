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
 *
 * ---
 * Spec: specs/feedback-path-hygiene
 * Covers: contract.md § "Runner internals — templates/hooks/run-feedback.mjs"
 * (`matchesExtensions`, `existingPaths`, `perFilePathsFor`, and the modified
 * `runRunMode` loop); Behavior Guarantees PH-1 (vanished paths dropped), PH-2
 * (extension gate), PH-3 (case-sensitive suffix match), PH-5 (empty filtered
 * set skips silently, never a zero-arg spawn), PH-6 (absent/empty/non-array
 * `extensions` means no filter, existence check still applies), PH-7 (the `.`
 * sentinel bypasses both filters), PH-8 (whole-project ignores `extensions` in
 * turn mode); intent.md SC1–SC5; roadmap.md Phase 2 step 4; tasks.md Tasks
 * 2.1–2.8, 2.12.
 *
 * `matchesExtensions`, `existingPaths`, and `perFilePathsFor` do not exist in
 * `templates/hooks/run-feedback.mjs` yet at red time, and `runRunMode`'s loop
 * does not apply any extension gate or existence check to a `per-file`
 * command's touched paths — today it passes every deduped touched path
 * through unconditionally, whatever `command.extensions` says and whether or
 * not the path still exists on disk. Every test in the new "vanished path",
 * "extension gate", "empty filtered set", and "case-sensitive suffix"
 * describe blocks below is therefore expected to fail on a genuine argv-shape
 * mismatch (extra stale or non-matching paths present, or a command that
 * should have been silently skipped but ran and even blocked the turn),
 * rather than a test-authoring bug.
 *
 * Two exceptions, noted explicitly because they are expected to PASS already
 * at red time — the same documented posture the BG-7/BG-4 leak-gate tests in
 * `tests/feedback.test.ts` use for a guard that becomes load-bearing only once
 * its implementation lands: the "whole-project ignores extensions" test (PH-8)
 * already passes, because `runRunMode`'s whole-project branch never reads
 * touched paths at all, extension-filtered or not; and the "`.` sentinel
 * bypasses both filters under `--whole-project`" test (PH-7) already passes,
 * because `runWholeProject` is untouched by this feature by construction and
 * already appends exactly `.` regardless of any `extensions` field. Both stay
 * in this file as live regression guards: once `matchesExtensions` exists,
 * these are what prove it is never reachable from either code path.
 *
 * Task 2.12 (setup-only fix; no expected value changed in any of the four
 * tests below): the pre-existing "N edits across M distinct files…" (batching),
 * "deletes the turn file after running it…" (cleanup), and the two re-entry
 * tests ("a failing mapped command normally causes…" / "the identical failing
 * turn, re-entered…") accumulate paths that were never created on disk. Once
 * PH-1 lands, their `per-file` commands — which declare no `extensions` —
 * would be existence-filtered to an empty set and silently skipped, which
 * would break the batching and re-entry-baseline assertions outright and
 * silently weaken the cleanup test to a vacuous pass. Their setup now creates
 * the accumulated files for real, via the new `writeFile` helper below,
 * before `run` fires; no assertion in any of the four changed.
 *
 * ---
 * Spec: specs/feedback-path-hygiene (Post-audit amendment A1, audit finding AL-3)
 * Covers: contract.md § "Post-audit amendment A1" (the rewritten `matchesExtensions`
 * reference body: valid entries are non-empty strings; no filter when
 * `extensions` has no valid entry, not "match nothing"); the amended PH-6;
 * intent.md § "Post-audit amendment A1"; tasks.md Tasks A1.1, A1.2.
 *
 * `templates/hooks/run-feedback.mjs`'s `matchesExtensions` today (the
 * pre-amendment, audited reference body) treats `extensions` as "no filter"
 * only when the array itself is empty or absent — an array whose entries are
 * all invalid (`[null, '']`) is non-empty, so it falls through to `.some(...)`,
 * which finds no valid entry to match against and returns `false` for every
 * path. That silently filters the command's path set to empty and skips it
 * every turn (PH-5), which is AL-3's finding: "a misconfigured list can never
 * silently disable a linter" (PH-6's own rationale) does not yet hold for this
 * case. The Task A1.1 test below is therefore expected to fail at red time —
 * `README.md` is dropped instead of passed, because today's `matchesExtensions`
 * treats an all-invalid list as "match nothing", not "no filter".
 *
 * The Task A1.2 test below is documented as expected to ALREADY PASS at red
 * time: a *mixed* list (`[null, '', 5, '.py']`) already reaches `.some`'s
 * valid branch via its one genuinely valid entry (`'.py'`), so today's
 * `matchesExtensions` already suffix-matches correctly against it — AL-3's gap
 * is specific to a list with *zero* valid entries, not to a mixed list. This
 * test stays in the suite as the regression guard that pins "invalid entries
 * are ignored, valid entries still filter" once A1.3's fix lands alongside it.
 *
 * ---
 * Spec: specs/monorepo-mode
 * Covers: contract.md § "Runner wire format" (the three `--commands` rows,
 * MC-5); § "Path -> component resolution" (MC-9 through MC-12); § "Per-turn
 * and whole-project execution" (MC-17 through MC-19); Error Handling Contract
 * rows for an unassigned touched path and an object `--commands` value with no
 * `components` array; intent.md SC5-SC8; audit.md Test Coverage T12-T20.
 *
 * `normalizeCommandsPayload` and `componentDirFor` do not exist in
 * `templates/hooks/run-feedback.mjs` yet at red time, and `runRunMode`'s loop
 * still iterates the bare commands array directly with `cwd` fixed at the
 * runner's own `process.cwd()` for every command -- it never reads a
 * `{"components": [...]}` object form at all, never partitions touched paths
 * by component, and never resolves a per-component working directory. Every
 * describe block below that feeds the object form or asserts a per-component
 * `cwd`/skip/notice is therefore expected to fail one of two genuine ways: a
 * command spawned with the WRONG cwd or the WRONG (unfiltered) path set, or --
 * for the object-form cases -- no command running at all, because today's
 * `readCommands` returns `[]` for a top-level object it cannot iterate as an
 * array of `FeedbackCommand`s. Neither reflects a test-authoring bug.
 *
 * Four exceptions, called out explicitly per this repo's own established
 * convention (see the PH-7/PH-8 note above): the "single-component output
 * text is unchanged" test is expected to ALREADY PASS, because it drives the
 * runner with today's bare-array form only, which today's code already
 * handles with no component label anywhere in its output; the "N is always 0
 * for the legacy single-component form" test is expected to ALREADY PASS for
 * the same reason -- no code path exists yet that could print the
 * unassigned-paths notice at all, so it is trivially never printed; and the
 * two tolerant-fallback tests in the wire-format describe block (an
 * unparseable/non-array/non-object `--commands` value, and an object value
 * with no `components` array) are expected to ALREADY PASS, because today's
 * `readCommands` already returns `[]` for anything that is not a JSON array
 * -- both inputs already fall into that existing branch, unrelated to any new
 * object-form parsing. All four stay in this file as the live regression
 * guards MC-5 exists to be: once per-component dispatch lands, these are what
 * prove it changed nothing for the one-`.`-component case and left the
 * runner's existing tolerant posture intact.
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

/** (feedback-path-hygiene) Creates `relPath` (`/`-joined, relative to `repoDir`)
 *  as a real file on disk, making parent directories as needed, and returns its
 *  absolute path. An accumulated path that a test wants `perFilePathsFor`'s
 *  `fs.existsSync` check (PH-1) to find, rather than one that merely looks
 *  plausible via `path.join`. */
async function writeFile(repoDir: string, relPath: string, contents = ''): Promise<string> {
  const full = path.join(repoDir, ...relPath.split('/'));
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, contents, 'utf8');
  return full;
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

    // (feedback-path-hygiene, Task 2.12) Created for real: once PH-1 lands, a
    // per-file command would otherwise be existence-filtered to empty here.
    const fileA = await writeFile(repoDir, 'src/a.ts');
    const fileB = await writeFile(repoDir, 'src/b.ts');
    const fileC = await writeFile(repoDir, 'src/c.ts');

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
    // (feedback-path-hygiene, Task 2.12) Created for real, so the NOOP command
    // still actually runs once PH-1 lands, keeping this test non-vacuous.
    const file = await writeFile(repoDir, 'src/only.ts');

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
    // (feedback-path-hygiene, Task 2.12) Created for real, so the failing
    // command still actually runs once PH-1 lands.
    const file = await writeFile(repoDir, 'src/broken.ts');

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
    // (feedback-path-hygiene, Task 2.12) Created for real, so the failing
    // command still actually runs once PH-1 lands.
    const file = await writeFile(repoDir, 'src/broken.ts');

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

// ---------------------------------------------------------------------------
// feedback-path-hygiene: turn-based `run` mode's per-command path filtering
// (PH-1 through PH-8; tasks.md Tasks 2.1–2.8). See this file's top docblock
// for which of the blocks below are expected to fail at red time and which
// are documented live regression guards that already pass.
// ---------------------------------------------------------------------------

describe('vanished path dropped before a per-file command receives it (PH-1, SC1)', () => {
  it('drops a deleted accumulated path, passing only the surviving file to the per-file command', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'vanished-path-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const fileA = await writeFile(repoDir, 'src/a.py');
    const fileB = await writeFile(repoDir, 'src/b.py');

    for (const file of [fileA, fileB]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    // The vanished-path case (harny-sync archive mode / git mv / rm, later in
    // the same turn): b.py was accumulated, then deleted before `run` fires.
    await fs.rm(fileB);

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'per-file-probe',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'PER_FILE'],
        pathMode: 'per-file',
        extensions: ['.py'],
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
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv).toEqual(['PER_FILE', fileA]);
  });
});

describe('an all-vanished turn skips every per-file command silently but still runs whole-project (PH-1, PH-5, PH-8, PH-13, SC2)', () => {
  it('produces zero per-file invocations, one whole-project invocation with no path args, exit 0, empty stdout, and turn-file deletion', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'renamed-away-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const oldFile = await writeFile(repoDir, 'src/old.py');
    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: oldFile } },
    });
    expect(acc.code).toBe(0);

    const turnFile = turnFilePath(repoDir, sessionId);
    expect(await pathExists(turnFile)).toBe(true);

    // The git-mv case: only the old path was ever accumulated; the file now
    // lives at a path the turn never recorded.
    await fs.rename(oldFile, path.join(repoDir, 'src', 'new.py'));

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
    expect(result.stdout.trim()).toBe('');
    expect(result.stderr.trim()).toBe('');

    const logLines = (await fs.readFile(invocationLog, 'utf8').catch(() => ''))
      .trim()
      .split('\n')
      .filter(Boolean);
    const invocations = logLines.map((line) => JSON.parse(line) as { argv: string[] });
    expect(invocations.filter((inv) => inv.argv[0] === 'PER_FILE')).toHaveLength(0);
    const wholeProjectCalls = invocations.filter((inv) => inv.argv[0] === 'WHOLE_PROJECT');
    expect(wholeProjectCalls).toHaveLength(1);
    expect(wholeProjectCalls[0].argv).toEqual(['WHOLE_PROJECT']);

    expect(await pathExists(turnFile)).toBe(false);
  });
});

describe('extension gate: a gated command receives only matching paths; an ungated command still receives everything (PH-2, PH-6, SC3)', () => {
  it('command A (declaring extensions) gets only the .py file; command B (no extensions) gets all three touched paths', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'mixed-types-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const settingsFile = await writeFile(repoDir, '.claude/settings.json', '{}');
    const workflowFile = await writeFile(repoDir, '.github/workflows/ci.yml', 'name: ci\n');
    const appFile = await writeFile(repoDir, 'src/app.py');

    for (const file of [settingsFile, workflowFile, appFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'gated',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'GATED'],
        pathMode: 'per-file',
        extensions: ['.py', '.pyi'],
        requires: {},
      },
      {
        id: 'ungated',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'UNGATED'],
        pathMode: 'per-file',
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

    const gated = invocations.filter((inv) => inv.argv[0] === 'GATED');
    expect(gated).toHaveLength(1);
    expect(gated[0].argv).toEqual(['GATED', appFile]);

    const ungated = invocations.filter((inv) => inv.argv[0] === 'UNGATED');
    expect(ungated).toHaveLength(1);
    expect(new Set(ungated[0].argv.slice(1))).toEqual(new Set([settingsFile, workflowFile, appFile]));
  });
});

describe('an empty filtered set skips the command silently — never a zero-arg spawn (PH-5, SC4)', () => {
  it('invocation count is 0, exit code 0, and stdout is empty, even though the command would fail if spawned', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'non-matching-only-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const settingsFile = await writeFile(repoDir, '.claude/settings.json', '{}');
    const readmeFile = await writeFile(repoDir, 'README.md', '# readme\n');

    for (const file of [settingsFile, readmeFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'gated',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'GATED'],
        pathMode: 'per-file',
        extensions: ['.py'],
        requires: {},
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      // A failing exit code proves a spawn would have surfaced as a blocking
      // finding (exit 2) had the command actually run.
      env: { INVOCATION_LOG: invocationLog, FAKE_EXIT_CODE: '1' },
    });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('');
    expect(await pathExists(invocationLog)).toBe(false);
  });
});

describe('case-sensitive suffix matching — an upper-case extension never matches a lower-case declared suffix (PH-3)', () => {
  it('passes only the lower-case .py file, never the upper-case .PY file', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'case-sensitivity-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const upperFile = await writeFile(repoDir, 'src/A.PY');
    const lowerFile = await writeFile(repoDir, 'src/b.py');

    for (const file of [upperFile, lowerFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'gated',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'GATED'],
        pathMode: 'per-file',
        extensions: ['.py'],
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
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv).toEqual(['GATED', lowerFile]);
  });
});

describe('absent, empty, or non-array extensions all mean no filter — the existence check still applies (PH-6)', () => {
  it.each([
    ['an empty array', [] as unknown as string[]],
    ['a non-array value', 'py' as unknown as string[]],
  ])(
    'with extensions set to %s, a non-matching existing path is still passed, and a vanished path is still dropped',
    async (_label, extensions) => {
      const repoDir = await makeTempRepo();
      const sessionId = `no-filter-session-${Math.random().toString(36).slice(2)}`;
      const invocationLog = path.join(repoDir, 'invocations.log');

      const jsonFile = await writeFile(repoDir, 'config.json', '{}');
      const vanishedFile = await writeFile(repoDir, 'src/gone.py');

      for (const file of [jsonFile, vanishedFile]) {
        const acc = await runRunner('accumulate', {
          cwd: repoDir,
          stdin: { session_id: sessionId, tool_input: { file_path: file } },
        });
        expect(acc.code).toBe(0);
      }

      await fs.rm(vanishedFile);

      const commandsFile = await writeCommandsFile(repoDir, [
        {
          id: 'unfiltered',
          kind: 'lint',
          argv: ['node', RECORD_SCRIPT, 'UNFILTERED'],
          pathMode: 'per-file',
          extensions,
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
      expect(invocations).toHaveLength(1);
      expect(invocations[0].argv).toEqual(['UNFILTERED', jsonFile]);
    },
  );
});

describe('a whole-project command ignores extensions entirely in turn-based mode (PH-8)', () => {
  it('still runs once, with no path args, on a turn that touched only a non-matching file — already true by construction; a live regression guard', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'whole-project-ignores-extensions-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const readmeFile = await writeFile(repoDir, 'README.md', '# readme\n');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: readmeFile } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'whole-project-probe',
        kind: 'typecheck',
        argv: ['node', RECORD_SCRIPT, 'WHOLE_PROJECT'],
        pathMode: 'whole-project',
        extensions: ['.py'],
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
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv).toEqual(['WHOLE_PROJECT']);
  });
});

describe('run --whole-project bypasses both filters — the "." sentinel is unconditional (PH-7, SC5)', () => {
  it('passes exactly "." to a per-file command that declares extensions — already true by construction; a live regression guard', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'per-file-check',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'PER_FILE'],
        pathMode: 'per-file',
        extensions: ['.py'],
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
});

// ---------------------------------------------------------------------------
// feedback-path-hygiene, Post-audit amendment A1 (audit finding AL-3): an
// extensions list with no valid entry (valid = non-empty string) means "no
// filter", the same as an absent or empty extensions. See this file's top
// docblock for which of the two tests below is expected to fail at red time.
// ---------------------------------------------------------------------------

describe('an extensions list with no valid entry means no filter, not "match nothing" (A1, AL-3, PH-6)', () => {
  it('an all-invalid extensions list still passes a non-matching existing path, and still drops a vanished one', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'all-invalid-extensions-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const readmeFile = await writeFile(repoDir, 'README.md', '# readme\n');
    const goneFile = await writeFile(repoDir, 'src/gone.py');

    for (const file of [readmeFile, goneFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    await fs.rm(goneFile);

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'all-invalid',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'ALL_INVALID'],
        pathMode: 'per-file',
        // Non-empty, but every entry is invalid (null is not a string; '' is
        // a string of length 0) — AL-3's exact case.
        extensions: [null, ''],
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

    const logLines = (await fs.readFile(invocationLog, 'utf8').catch(() => ''))
      .trim()
      .split('\n')
      .filter(Boolean);
    const invocations = logLines.map((line) => JSON.parse(line) as { argv: string[] });
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv).toEqual(['ALL_INVALID', readmeFile]);
  });

  it('a mixed list of invalid and valid entries filters on the valid entries only', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'mixed-invalid-valid-extensions-session';
    const invocationLog = path.join(repoDir, 'invocations.log');

    const appFile = await writeFile(repoDir, 'src/app.py');
    const readmeFile = await writeFile(repoDir, 'README.md', '# readme\n');
    const jsonFile = await writeFile(repoDir, 'config.json', '{}');

    for (const file of [appFile, readmeFile, jsonFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeCommandsFile(repoDir, [
      {
        id: 'mixed',
        kind: 'lint',
        argv: ['node', RECORD_SCRIPT, 'MIXED'],
        pathMode: 'per-file',
        // Three invalid entries (null, '', a number) and one valid entry
        // ('.py') — invalid entries are ignored; the valid one still filters.
        extensions: [null, '', 5, '.py'],
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
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv).toEqual(['MIXED', appFile]);
  });
});

// ---------------------------------------------------------------------------
// specs/monorepo-mode: per-component dispatch (MC-9 through MC-19)
// ---------------------------------------------------------------------------

/** Writes the monorepo wire-format's object form: `{"components": [...]}`. */
async function writeComponentsCommandsFile(
  dir: string,
  components: readonly { dir: string; commands: unknown[] }[],
): Promise<string> {
  return writeCommandsFile(dir, { components });
}

interface RecordedInvocation {
  argv: string[];
  cwd: string;
}

async function readInvocations(logPath: string): Promise<RecordedInvocation[]> {
  const raw = await fs.readFile(logPath, 'utf8').catch(() => '');
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RecordedInvocation);
}

describe('wire format — the object form dispatches exactly like the equivalent bare array (MC-5, T12)', () => {
  it('a bare array and its equivalent {components: [{dir: ".", commands}]} object produce the identical single invocation', async () => {
    const repoDirA = await makeTempRepo();
    const repoDirB = await makeTempRepo();
    const sessionId = 'wire-format-equivalence-session';
    const fileA = await writeFile(repoDirA, 'src/a.ts');
    const fileB = await writeFile(repoDirB, 'src/a.ts');

    for (const [dir, file] of [[repoDirA, fileA], [repoDirB, fileB]] as const) {
      const acc = await runRunner('accumulate', {
        cwd: dir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandSpec = { id: 'probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'PROBE'], pathMode: 'per-file', requires: {} };
    const bareArrayFile = await writeCommandsFile(repoDirA, [commandSpec]);
    const objectFormFile = await writeComponentsCommandsFile(repoDirB, [{ dir: '.', commands: [commandSpec] }]);

    const logA = path.join(repoDirA, 'invocations.log');
    const logB = path.join(repoDirB, 'invocations.log');

    const resultA = await runRunner('run', {
      cwd: repoDirA,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', bareArrayFile],
      env: { INVOCATION_LOG: logA },
    });
    const resultB = await runRunner('run', {
      cwd: repoDirB,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', objectFormFile],
      env: { INVOCATION_LOG: logB },
    });

    expect(resultA.code).toBe(0);
    expect(resultB.code).toBe(0);

    const invocationsA = await readInvocations(logA);
    const invocationsB = await readInvocations(logB);
    expect(invocationsA).toHaveLength(1);
    expect(invocationsB).toHaveLength(1);
    expect(invocationsA[0].argv).toEqual(['PROBE', fileA]);
    expect(invocationsB[0].argv).toEqual(['PROBE', fileB]);
    expect(invocationsA[0].cwd).toBe(await fs.realpath(repoDirA));
    expect(invocationsB[0].cwd).toBe(await fs.realpath(repoDirB));
  });

  it('an unparseable or non-array/non-object --commands value tolerantly runs nothing, exit 0 — unchanged tolerant posture', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'tolerant-fallback-session';
    const file = await writeFile(repoDir, 'src/only.ts');
    const invocationLog = path.join(repoDir, 'invocations.log');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', '"just a json string, not an array or object"'],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);
    expect(await pathExists(invocationLog)).toBe(false);
  });

  it('an object --commands value with no "components" array normalizes to [] — no commands, no output, exit 0', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'object-no-components-session';
    const file = await writeFile(repoDir, 'src/only.ts');
    const invocationLog = path.join(repoDir, 'invocations.log');
    const commandsFile = await writeCommandsFile(repoDir, { notComponents: true });

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('');
    expect(await pathExists(invocationLog)).toBe(false);
  });
});

describe('longest segment-prefix match — never a raw string prefix (MC-9, MC-10, SC6)', () => {
  it('a touched path under apps/web-admin/ resolves to apps/web-admin, never to apps/web (the segment-boundary trap)', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'segment-boundary-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const adminFile = await writeFile(repoDir, 'apps/web-admin/x.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: adminFile } },
    });
    expect(acc.code).toBe(0);

    const webCommand = { id: 'web-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB'], pathMode: 'per-file', requires: {} };
    const webAdminCommand = { id: 'web-admin-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB_ADMIN'], pathMode: 'per-file', requires: {} };
    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: 'apps/web', commands: [webCommand] },
      { dir: 'apps/web-admin', commands: [webAdminCommand] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    expect(invocations.map((inv) => inv.argv[0])).toEqual(['WEB_ADMIN']);
  });

  it('a component with more segments wins over a shorter-matching ancestor component', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'longest-match-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const deepFile = await writeFile(repoDir, 'apps/web/deep/file.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: deepFile } },
    });
    expect(acc.code).toBe(0);

    const appsCommand = { id: 'apps-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'APPS'], pathMode: 'per-file', requires: {} };
    const appsWebCommand = { id: 'apps-web-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'APPS_WEB'], pathMode: 'per-file', requires: {} };
    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: 'apps', commands: [appsCommand] },
      { dir: 'apps/web', commands: [appsWebCommand] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    expect(invocations.map((inv) => inv.argv[0])).toEqual(['APPS_WEB']);
  });

  it('"." matches everything but loses to any longer-matching component', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'dot-catch-all-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const rootFile = await writeFile(repoDir, 'api/main.py');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');

    for (const file of [rootFile, webFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const dotCommand = { id: 'dot-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'DOT'], pathMode: 'per-file', requires: {} };
    const webCommand = { id: 'web-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB'], pathMode: 'per-file', requires: {} };
    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: '.', commands: [dotCommand] },
      { dir: 'apps/web', commands: [webCommand] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    const dotInvocation = invocations.find((inv) => inv.argv[0] === 'DOT');
    const webInvocation = invocations.find((inv) => inv.argv[0] === 'WEB');
    expect(dotInvocation?.argv.slice(1)).toEqual([rootFile]);
    expect(webInvocation?.argv.slice(1)).toEqual([webFile]);
  });
});

describe('two-component turn dispatch: each command receives only its own component\'s files, from its own cwd (MC-9, MC-12, SC5)', () => {
  it('a turn touching apps/web/page.tsx and api/main.py runs the "apps/web" command once with only its file and cwd apps/web, and the "." command once with only its file and cwd the install root', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'sc5-two-component-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');
    const apiFile = await writeFile(repoDir, 'api/main.py');

    for (const file of [webFile, apiFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const eslintLike = { id: 'eslint-like', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'ESLINT'], pathMode: 'per-file', requires: {} };
    const ruffLike = { id: 'ruff-like', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'RUFF'], pathMode: 'per-file', requires: {} };
    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: '.', commands: [ruffLike] },
      { dir: 'apps/web', commands: [eslintLike] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    expect(invocations).toHaveLength(2);

    const eslintInvocation = invocations.find((inv) => inv.argv[0] === 'ESLINT')!;
    const ruffInvocation = invocations.find((inv) => inv.argv[0] === 'RUFF')!;

    expect(eslintInvocation.argv.slice(1)).toEqual([webFile]);
    expect(eslintInvocation.cwd).toBe(await fs.realpath(path.join(repoDir, 'apps', 'web')));

    expect(ruffInvocation.argv.slice(1)).toEqual([apiFile]);
    expect(ruffInvocation.cwd).toBe(await fs.realpath(repoDir));

    // Turn-file deletion is unchanged under the component path (MC-19 note;
    // T20): the accumulator's turn file is still removed after the run,
    // regardless of how many components the deduped paths were partitioned
    // across.
    expect(await pathExists(turnFilePath(repoDir, sessionId))).toBe(false);
  });

  it('stop_hook_active suppression is unchanged under the component path: a finding in one component is still suppressed on re-entry (T20)', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'sc5-reentry-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: webFile } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: 'apps/web', commands: [{ id: 'web-fail', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'FAIL'], pathMode: 'per-file', requires: {} }] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: true },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog, FAKE_EXIT_CODE: '1' },
    });

    // Positive proof the command actually ran and failed (never a vacuous
    // "nothing ran, so nothing to suppress" pass): if the object-form
    // payload is not dispatched at all, this fails alongside the exit-code
    // assertion below.
    const invocations = await readInvocations(invocationLog);
    expect(invocations).toHaveLength(1);

    expect(result.code).toBe(0);
  });
});

describe('an unassigned touched path is dropped with exactly one count-naming stderr notice, never reassigned (MC-11, SC7)', () => {
  it('a path matching no declared component runs no command for it, and prints exactly one notice line naming the count', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'unassigned-path-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');
    const orphanFile = await writeFile(repoDir, 'tools/scratch/unowned.ts');

    for (const file of [webFile, orphanFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const webCommand = { id: 'web-probe', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB'], pathMode: 'per-file', requires: {} };
    const commandsFile = await writeComponentsCommandsFile(repoDir, [{ dir: 'apps/web', commands: [webCommand] }]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].argv.slice(1)).toEqual([webFile]);
    expect(invocations[0].argv).not.toContain(orphanFile);

    expect(result.stderr).toContain('harny-feedback: 1 touched path(s) matched no declared component; skipped.');
  });

  it('N is always 0 for the legacy single-"." -component form — the notice is never printed (MC-5)', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'single-component-no-notice-session';
    const file = await writeFile(repoDir, 'src/only.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'noop', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'NOOP'], pathMode: 'per-file', requires: {} },
    ]);
    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
    });

    expect(result.code).toBe(0);
    expect(result.stderr).not.toContain('matched no declared component');
  });
});

describe('a component with no assigned touched path runs nothing — per-file and whole-project alike (MC-17)', () => {
  it('only the component with an assigned path runs; the other two components run neither their per-file nor their whole-project commands', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'mc17-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');
    // `services/api` must EXIST on disk, otherwise "it ran nothing" would have
    // two possible causes — MC-17 (no assigned touched path) and the
    // absent-directory skip — and this test could not tell them apart. The
    // notice assertion below pins that the absent-directory branch stayed out
    // of it.
    await fs.mkdir(path.join(repoDir, 'services', 'api'), { recursive: true });

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: webFile } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      {
        dir: '.',
        commands: [
          { id: 'root-per-file', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'ROOT_PER_FILE'], pathMode: 'per-file', requires: {} },
          { id: 'root-whole', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'ROOT_WHOLE'], pathMode: 'whole-project', requires: {} },
        ],
      },
      {
        dir: 'services/api',
        commands: [
          { id: 'api-per-file', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'API_PER_FILE'], pathMode: 'per-file', requires: {} },
          { id: 'api-whole', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'API_WHOLE'], pathMode: 'whole-project', requires: {} },
        ],
      },
      {
        dir: 'apps/web',
        commands: [
          { id: 'web-per-file', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB_PER_FILE'], pathMode: 'per-file', requires: {} },
          { id: 'web-whole', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_WHOLE'], pathMode: 'whole-project', requires: {} },
        ],
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    const ran = new Set(invocations.map((inv) => inv.argv[0]));

    expect(ran.has('WEB_PER_FILE')).toBe(true);
    expect(ran.has('WEB_WHOLE')).toBe(true);
    expect(ran.has('ROOT_PER_FILE')).toBe(false);
    expect(ran.has('ROOT_WHOLE')).toBe(false);
    expect(ran.has('API_PER_FILE')).toBe(false);
    expect(ran.has('API_WHOLE')).toBe(false);
    expect(result.stderr).not.toContain('component directory');
  });
});

describe('whole-project commands run once per component with an assigned touched path, from that component\'s directory (MC-18, SC8)', () => {
  it('two affected components each run their whole-project command exactly once, from their own directory, with no path arguments', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'mc18-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    const webFile = await writeFile(repoDir, 'apps/web/page.tsx');
    const apiFile = await writeFile(repoDir, 'api/main.py');

    for (const file of [webFile, apiFile]) {
      const acc = await runRunner('accumulate', {
        cwd: repoDir,
        stdin: { session_id: sessionId, tool_input: { file_path: file } },
      });
      expect(acc.code).toBe(0);
    }

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: '.', commands: [{ id: 'root-whole', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'ROOT_WHOLE'], pathMode: 'whole-project', requires: {} }] },
      { dir: 'apps/web', commands: [{ id: 'web-whole', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_WHOLE'], pathMode: 'whole-project', requires: {} }] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    const rootWhole = invocations.find((inv) => inv.argv[0] === 'ROOT_WHOLE')!;
    const webWhole = invocations.find((inv) => inv.argv[0] === 'WEB_WHOLE')!;

    expect(rootWhole.argv).toEqual(['ROOT_WHOLE']);
    expect(rootWhole.cwd).toBe(await fs.realpath(repoDir));
    expect(webWhole.argv).toEqual(['WEB_WHOLE']);
    expect(webWhole.cwd).toBe(await fs.realpath(path.join(repoDir, 'apps', 'web')));
  });

  it('gating is "at least one assigned path", never "at least one path that also passed a sibling command\'s extension gate" (ADR 0041)', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'mc18-extension-independence-session';
    const invocationLog = path.join(repoDir, 'invocations.log');
    // A markdown file: it will never match a '.ts'-only extensions filter, but
    // it is still an ASSIGNED touched path for the "apps/web" component.
    const readmeFile = await writeFile(repoDir, 'apps/web/README.md');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: readmeFile } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      {
        dir: 'apps/web',
        commands: [
          {
            id: 'web-lint',
            kind: 'lint',
            argv: ['node', RECORD_SCRIPT, 'WEB_LINT'],
            pathMode: 'per-file',
            extensions: ['.ts'],
            requires: {},
          },
          { id: 'web-typecheck', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_TYPECHECK'], pathMode: 'whole-project', requires: {} },
        ],
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });
    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    const ran = new Set(invocations.map((inv) => inv.argv[0]));
    // The per-file lint command is extension-gated away (no '.ts' file touched)...
    expect(ran.has('WEB_LINT')).toBe(false);
    // ...but the whole-project typecheck still runs: the component has an
    // assigned touched path, full stop, regardless of any sibling command's
    // own extension filter.
    expect(ran.has('WEB_TYPECHECK')).toBe(true);
  });
});

describe('run --whole-project (CI mode) covers every component, "." sentinel per directory, counters summed (MC-19)', () => {
  it('every command of every component runs once from its own directory with "." as the sole per-file argument; a finding anywhere still exits 2', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');
    // (Green-phase fixture correction.) `--whole-project` reads no turn state,
    // so nothing else in this test puts `apps/web` on disk — and a declared
    // component whose directory is absent is now SKIPPED with a notice rather
    // than spawned into (contract.md Error Handling Contract, the `requires: {}`
    // row). Creating the directory is the realistic CI case this test means to
    // exercise: a checked-out monorepo whose declared components all exist. The
    // absent-directory branch has its own test below.
    await fs.mkdir(path.join(repoDir, 'apps', 'web'), { recursive: true });

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      {
        dir: '.',
        commands: [
          { id: 'root-lint', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'ROOT_LINT'], pathMode: 'per-file', requires: {} },
        ],
      },
      {
        dir: 'apps/web',
        commands: [
          { id: 'web-lint', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB_LINT'], pathMode: 'per-file', requires: {} },
          { id: 'web-typecheck', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_TYPECHECK'], pathMode: 'whole-project', requires: {} },
        ],
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null,
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    expect(result.code).toBe(0);

    const invocations = await readInvocations(invocationLog);
    expect(invocations).toHaveLength(3);

    const rootLint = invocations.find((inv) => inv.argv[0] === 'ROOT_LINT')!;
    const webLint = invocations.find((inv) => inv.argv[0] === 'WEB_LINT')!;
    const webTypecheck = invocations.find((inv) => inv.argv[0] === 'WEB_TYPECHECK')!;

    expect(rootLint.argv).toEqual(['ROOT_LINT', '.']);
    expect(rootLint.cwd).toBe(await fs.realpath(repoDir));
    expect(webLint.argv).toEqual(['WEB_LINT', '.']);
    expect(webLint.cwd).toBe(await fs.realpath(path.join(repoDir, 'apps', 'web')));
    expect(webTypecheck.argv).toEqual(['WEB_TYPECHECK']);
    expect(webTypecheck.cwd).toBe(await fs.realpath(path.join(repoDir, 'apps', 'web')));

    // The summed-across-components summary line: 3 of 3 ran, 0 skipped.
    expect(result.stdout).toContain('harny-feedback: 3 of 3 command(s) ran, 0 skipped.');
  });

  it('a finding in a NON-root component still exits 2, unmediated by stop_hook_active (BG-19 extended across components)', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');
    await fs.mkdir(path.join(repoDir, 'apps', 'web'), { recursive: true });

    // Only the non-root component's command may fail, so exit 2 can have
    // exactly one cause. (Green-phase correction: this test previously ran
    // with FAKE_EXIT_CODE set for BOTH commands and with `apps/web` absent on
    // disk, so the root command's finding alone produced exit 2 and the
    // "NON-root" claim in the name was never actually exercised.)
    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      { dir: '.', commands: [{ id: 'root-ok', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'ROOT_OK'], pathMode: 'whole-project', requires: {} }] },
      { dir: 'apps/web', commands: [{ id: 'web-fail', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_FAIL', '--fail'], pathMode: 'whole-project', requires: {} }] },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { stop_hook_active: true },
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog, FAKE_EXIT_CODE_WHEN: '--fail', FAKE_EXIT_CODE: '1' },
    });

    expect(result.code).toBe(2);
    const invocations = await readInvocations(invocationLog);
    expect(invocations.map((inv) => inv.argv[0]).sort()).toEqual(['ROOT_OK', 'WEB_FAIL']);
  });

  /**
   * (specs/monorepo-mode, contract.md § Error Handling Contract — the
   * `requires: {}` row, added during implementation.) A component directory
   * that does not exist on disk at runtime used to be created as a side
   * effect by the runner's own `resolveComponentCwd`; a feedback runner must
   * not write directories into the target repository as a result of running a
   * linter, so that side effect was removed and replaced by a visible,
   * non-fatal skip. This is the reachable half of that contract row:
   * `--whole-project` dispatches on the declared component list alone, with no
   * touched path to imply the directory exists.
   */
  it('a declared component whose directory is absent is skipped wholesale with one notice, its commands counted as skipped, never spawned into and never created', async () => {
    const repoDir = await makeTempRepo();
    const invocationLog = path.join(repoDir, 'invocations.log');
    const absentDir = path.join(repoDir, 'apps', 'web');

    const commandsFile = await writeComponentsCommandsFile(repoDir, [
      {
        dir: '.',
        commands: [{ id: 'root-lint', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'ROOT_LINT'], pathMode: 'per-file', requires: {} }],
      },
      {
        // No `requires` probe to fall back on: without the directory check
        // this component's commands would be handed a nonexistent `cwd`.
        dir: 'apps/web',
        commands: [
          { id: 'web-lint', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'WEB_LINT'], pathMode: 'per-file', requires: {} },
          { id: 'web-typecheck', kind: 'typecheck', argv: ['node', RECORD_SCRIPT, 'WEB_TYPECHECK'], pathMode: 'whole-project', requires: {} },
        ],
      },
    ]);

    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: null,
      args: ['--whole-project', '--commands', commandsFile],
      env: { INVOCATION_LOG: invocationLog },
    });

    // Never fatal.
    expect(result.code).toBe(0);

    // The other component still ran; the absent one's commands never spawned.
    const invocations = await readInvocations(invocationLog);
    expect(invocations.map((inv) => inv.argv[0])).toEqual(['ROOT_LINT']);

    // Exactly one notice, naming the directory and its command count.
    const notices = result.stderr
      .split('\n')
      .filter((line) => line.includes('component directory'));
    expect(notices).toEqual([
      'harny-feedback: component directory `apps/web` does not exist; 2 command(s) skipped.',
    ]);

    // The skipped commands still count toward the summary's totals (MC-19).
    expect(result.stdout).toContain('harny-feedback: 1 of 3 command(s) ran, 2 skipped.');

    // And the directory was not created as a side effect of the run.
    expect(await pathExists(absentDir)).toBe(false);
  });
});

describe('single-component output text stays byte-identical to today — no component label anywhere (MC-5, MC-14)', () => {
  it('a finding line and a skip line carry no bracketed component tag for the legacy bare-array form', async () => {
    const repoDir = await makeTempRepo();
    const sessionId = 'single-component-text-session';
    const file = await writeFile(repoDir, 'src/only.ts');

    const acc = await runRunner('accumulate', {
      cwd: repoDir,
      stdin: { session_id: sessionId, tool_input: { file_path: file } },
    });
    expect(acc.code).toBe(0);

    const commandsFile = await writeCommandsFile(repoDir, [
      { id: 'failing', kind: 'lint', argv: ['node', RECORD_SCRIPT, 'FAIL'], pathMode: 'per-file', requires: {} },
    ]);
    const result = await runRunner('run', {
      cwd: repoDir,
      stdin: { session_id: sessionId, stop_hook_active: false },
      args: ['--commands', commandsFile],
      env: { FAKE_EXIT_CODE: '1' },
    });

    expect(result.code).toBe(2);
    expect(result.stdout).toContain('finding from `failing`');
    // No "(component ...)"/"[component ...]" style suffix on the finding line.
    expect(result.stdout).not.toMatch(/\(apps|\[apps|\(\.\)|\[\.\]/);
  });
});
