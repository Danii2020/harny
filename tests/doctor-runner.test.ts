/**
 * Spec: specs/readiness-doctor
 * Covers: contract.md "Public API — the canonical runner,
 * `templates/doctor/run-doctor.mjs`" (G2, G3); Behavior Guarantees 1, 2, 3, 6,
 * 8, 9, 10, 19, 20; Error Handling Contract rows for a missing/unreadable/
 * invalid `checks.json` and for a `require` entry's `requires` gate being
 * false; intent.md SC6, SC7, SC8; audit.md Test Coverage T6-T13.
 *
 * `templates/doctor/run-doctor.mjs` does not exist yet at red time. Every test
 * below drives it as a real subprocess, mirroring
 * `tests/hooks/run-feedback.test.ts`'s structural model (fixture repo, `cwd`
 * set to the fixture, JSON handed in via `--checks`) — never a `src/` module
 * imported in-process, since this is a template artifact copied verbatim into
 * target repos (contract.md BG-11). At red time `node <that path>` fails
 * immediately with a "Cannot find module" error and a non-zero exit code,
 * which is the expected red-phase failure for every test in this file.
 *
 * ---
 * ## The runner interface these tests establish
 *
 * `contract.md` fixes `DoctorChecksFile`'s shape, the exit-code table (0
 * ready / 2 not ready / 1 runner failure), and the four fixed-order check
 * families, but deliberately leaves the exact stdout line shape an
 * implementation detail (mirroring how `run-feedback.mjs`'s skip-notice
 * wording was left to its own test file to pin). Per the harny-test
 * procedure, this file is what pins that detail down as the acceptance
 * interface `harny-implement` must satisfy:
 *
 * - Invocation: `node run-doctor.mjs --checks <path-or-inline-json>`, `cwd`
 *   set to the repo being checked. `--checks` defaults to
 *   `.sdd/doctor/checks.json` when omitted; every test below passes it
 *   explicitly, pointing at a fixture file, exactly as
 *   `run-feedback.test.ts` does for `--commands`.
 * - One line per check, each containing the check's `id` and the literal
 *   word `ok`, `skip`, or `fail` (case-insensitive) as its outcome tag. A
 *   `fail` line additionally contains the check's `remediation` string (for a
 *   `require` entry) or the feature name (for a spec-state finding).
 * - The four families are emitted in this fixed order: environment (always
 *   exactly one `ok` line reporting the Node version), harness-manifest (one
 *   line per `require` entry), spec-state (one line per discovered feature
 *   finding), tests (one line per `commands` entry).
 * - A trailing summary line naming the ok/skip/fail counts.
 * - Exit codes: `0` when every check is `ok` or `skip`; `2` when at least one
 *   `fail` occurred; `1` when `--checks` is missing, unreadable, or not valid
 *   JSON, or an unknown flag is given.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, REPO_ROOT } from './helpers/paths.js';

const RUNNER_PATH = path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs');
const FEEDBACK_RUNNER_PATH = path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs');

const tempDirs: string[] = [];

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-doctor-runner-'));
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

function runRunner(options: { cwd: string; args?: string[] }): Promise<RunnerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [RUNNER_PATH, ...(options.args ?? [])], { cwd: options.cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end();
  });
}

async function writeChecksFile(dir: string, checks: unknown): Promise<string> {
  const file = path.join(dir, `checks-${Math.random().toString(36).slice(2)}.json`);
  await fs.writeFile(file, JSON.stringify(checks), 'utf8');
  return file;
}

const SPECS = {
  dir: 'specs',
  reservedDirs: ['current', 'archived'],
  schemaFiles: ['intent', 'contract', 'roadmap', 'tasks', 'audit'],
  shippedMarker: 'Shipped:',
  approvedVerdicts: ['APPROVED WITH RESERVATIONS', 'APPROVED'],
};

const OK_TEST_COMMAND = {
  id: 'always-ok',
  kind: 'test',
  argv: ['node', '-e', 'process.exit(0)'],
  pathMode: 'whole-project',
  requires: {},
};

async function writeFeature(
  repoDir: string,
  name: string,
  options: { schemaFiles?: readonly string[]; shipped?: boolean; approved?: boolean } = {},
): Promise<void> {
  const dir = path.join(repoDir, 'specs', name);
  await fs.mkdir(dir, { recursive: true });
  const schemaFiles = options.schemaFiles ?? SPECS.schemaFiles;
  for (const schema of schemaFiles) {
    const isIntent = schema === 'intent';
    const body = isIntent && options.shipped ? `# Intent: ${name}\n\nShipped: 2026-01-01\n` : `# ${schema}\n`;
    await fs.writeFile(path.join(dir, `${schema}.md`), body, 'utf8');
  }
  if (options.approved && schemaFiles.includes('audit')) {
    await fs.writeFile(path.join(dir, 'audit.md'), '# Audit\n\n**Status**: APPROVED\n', 'utf8');
  }
}

async function makeReadyRepo(): Promise<string> {
  const repoDir = await makeTempRepo();
  await fs.writeFile(path.join(repoDir, 'AGENTS.md'), '# AGENTS\n', 'utf8');
  await fs.mkdir(path.join(repoDir, '.sdd'), { recursive: true });
  await fs.writeFile(path.join(repoDir, '.sdd', 'harness.json'), '{}\n', 'utf8');
  await fs.mkdir(path.join(repoDir, '.sdd', 'feedback'), { recursive: true });
  await fs.writeFile(path.join(repoDir, '.sdd', 'feedback', 'run-feedback.mjs'), '// stub\n', 'utf8');
  await writeFeature(repoDir, 'a-shipped-and-archived-feature', { shipped: false, approved: false });
  return repoDir;
}

function readyChecks() {
  return {
    version: 1,
    specs: SPECS,
    require: [
      {
        id: 'conventions-doc',
        description: 'a conventions document exists',
        anyOf: ['AGENTS.md', 'CLAUDE.md'],
        remediation: 'add an AGENTS.md (or CLAUDE.md) documenting this repo\'s conventions',
      },
      {
        id: 'harness-manifest',
        description: '.sdd/harness.json exists',
        anyOf: ['.sdd/harness.json'],
        remediation: 'run npx harny init to scaffold .sdd/harness.json',
      },
      {
        id: 'feedback-runner',
        description: 'the feedback runner is scaffolded',
        anyOf: ['.sdd/feedback/run-feedback.mjs'],
        remediation: 'run npx harny init and commit .sdd/feedback/run-feedback.mjs',
        requires: { anyFile: ['.sdd/harness.json'] },
      },
    ],
    commands: [OK_TEST_COMMAND],
  };
}

describe('a correctly scaffolded repo is fully ready (T6, BG-1, BG-2)', () => {
  it('exits 0 and prints one line per check across all four families, in fixed family order', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });

    expect(result.code).toBe(0);
    const output = result.stdout + result.stderr;

    for (const id of ['conventions-doc', 'harness-manifest', 'feedback-runner', 'always-ok']) {
      expect(output, `missing a line for "${id}"`).toContain(id);
    }
    expect(output.toLowerCase()).toMatch(/node.*v?\d+\.\d+/);

    // Fixed family order: environment, harness-manifest, spec-state, tests.
    const nodeIndex = output.toLowerCase().indexOf('node');
    const requireIndex = output.indexOf('conventions-doc');
    const testsIndex = output.indexOf('always-ok');
    expect(nodeIndex).toBeGreaterThanOrEqual(0);
    expect(requireIndex).toBeGreaterThan(nodeIndex);
    expect(testsIndex).toBeGreaterThan(requireIndex);

    // A trailing summary line naming the counts.
    expect(output).toMatch(/\d+\s*(ok)[^\n]*\d+\s*(skip)/i);
  });
});

describe('a deleted required harness file fails that check, skips its dependents, and exits 2 (T7, BG-9)', () => {
  it('names the missing file and its remediation, and exits non-zero, distinct from a runner-internal error', async () => {
    const repoDir = await makeReadyRepo();
    await fs.rm(path.join(repoDir, '.sdd', 'harness.json'));
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    expect(result.code).not.toBe(1);
    expect(output).toContain('.sdd/harness.json');
    expect(output).toContain('run npx harny init');

    // feedback-runner is gated on .sdd/harness.json; with the gate false it is
    // SKIPPED, never independently failed (BG-9) — its own file is still on disk.
    expect(output.toLowerCase()).toMatch(/skip[^\n]*feedback-runner|feedback-runner[^\n]*skip/);
  });
});

describe('a feature directory missing a schema file is named by feature (T8, BG-10)', () => {
  it('reports the feature by name and exits 2', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'incomplete-feature', { schemaFiles: ['intent', 'contract', 'roadmap', 'tasks'] });
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    expect(output).toContain('incomplete-feature');
  });
});

describe('a shipped-but-unarchived feature requires both the marker and an approved verdict (T9, BG-10)', () => {
  it('reports the feature by name and exits 2 when both conditions hold', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'forgotten-to-archive', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    expect(output).toContain('forgotten-to-archive');
  });

  it('does not report a feature that is shipped but not yet approved (only one of the two conditions holds)', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'shipped-not-approved', { shipped: true, approved: false });
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output).not.toContain('shipped-not-approved');
  });

  it('does not report a feature that is approved but never stamped shipped (only one of the two conditions holds)', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'approved-not-shipped', { shipped: false, approved: true });
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output).not.toContain('approved-not-shipped');
  });
});

describe('an absent test-suite tool is skipped with a notice, never a failure (T10, BG-9)', () => {
  it('skips the command and still exits 0', async () => {
    const repoDir = await makeReadyRepo();
    const checks = readyChecks();
    checks.commands = [
      {
        id: 'missing-test-runner',
        kind: 'test',
        argv: ['node', '-e', 'process.exit(1)'],
        pathMode: 'whole-project',
        requires: { binary: 'harny-test-definitely-missing-binary-zzz' },
      },
    ];
    const checksFile = await writeChecksFile(repoDir, checks);

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output.toLowerCase()).toContain('skip');
    expect(output).toContain('missing-test-runner');
  });
});

describe('no readiness commands configured (unresolved/blank stack) is a notice, not a failure (T11, BG-8)', () => {
  it('runs every other family and still exits 0 when commands is empty', async () => {
    const repoDir = await makeReadyRepo();
    const checks = readyChecks();
    checks.commands = [];
    const checksFile = await writeChecksFile(repoDir, checks);

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    // The harness-manifest family still ran and reported ok.
    expect(output).toContain('harness-manifest');
  });
});

describe('"current" and "archived" are never treated as feature directories (T12, BG-10)', () => {
  it('does not fail on specs/current or specs/archived even when they lack schema files or carry ship/approve-looking text', async () => {
    const repoDir = await makeReadyRepo();
    await fs.mkdir(path.join(repoDir, 'specs', 'current'), { recursive: true });
    await fs.writeFile(path.join(repoDir, 'specs', 'current', '_index.md'), '# Index\n', 'utf8');
    await fs.mkdir(path.join(repoDir, 'specs', 'archived', 'some-old-feature'), { recursive: true });
    await fs.writeFile(
      path.join(repoDir, 'specs', 'archived', 'some-old-feature', 'intent.md'),
      '# Intent\n\nShipped: 2020-01-01\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(repoDir, 'specs', 'archived', 'some-old-feature', 'audit.md'),
      '**Status**: APPROVED\n',
      'utf8',
    );
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output).not.toContain('current');
    expect(output).not.toContain('archived');
    expect(output).not.toContain('some-old-feature');
  });
});

describe('runner-internal failures on a bad --checks value exit 1, distinct from a red readiness result (Error Handling Contract)', () => {
  it('exits 1 naming --checks when the file does not exist', async () => {
    const repoDir = await makeReadyRepo();

    const result = await runRunner({ cwd: repoDir, args: ['--checks', path.join(repoDir, 'does-not-exist.json')] });

    expect(result.code).toBe(1);
    expect(result.code).not.toBe(2);
    expect(result.stdout + result.stderr).toContain('--checks');
  });

  it('exits 1 when --checks points at invalid JSON', async () => {
    const repoDir = await makeReadyRepo();
    const badFile = path.join(repoDir, 'bad.json');
    await fs.writeFile(badFile, '{ not valid json', 'utf8');

    const result = await runRunner({ cwd: repoDir, args: ['--checks', badFile] });

    expect(result.code).toBe(1);
    expect(result.stdout + result.stderr).toContain('--checks');
  });

  it('accepts inline JSON (a leading "{") exactly like run-feedback.mjs\'s --commands dual form', async () => {
    const repoDir = await makeReadyRepo();
    const inline = JSON.stringify(readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', inline] });

    expect(result.code).toBe(0);
  });
});

describe('single-implementation gate — exactly one probe implementation exists (T13, BG-19)', () => {
  const PROBE_IDENTIFIERS = ['probeSatisfied', 'scriptExists', 'binaryExists', 'anyFileExists'];

  /** Every occurrence of `identifier` in `source` that is not part of the
   *  `import { ... } from '../shared/probes.mjs'` line. */
  function nonImportOccurrences(source: string, identifier: string): number {
    const importLine = source.split('\n').find((line) => line.includes("from '../shared/probes.mjs'")) ?? '';
    const withoutImportLine = source.replace(importLine, '');
    return (withoutImportLine.match(new RegExp(identifier, 'g')) ?? []).length;
  }

  it('run-doctor.mjs contains no probe logic of its own — only the import line', async () => {
    const source = await fs.readFile(RUNNER_PATH, 'utf8').catch(() => undefined);
    expect(source, `${RUNNER_PATH} does not exist yet`).toBeDefined();

    expect(source).toContain("from '../shared/probes.mjs'");
    for (const identifier of PROBE_IDENTIFIERS) {
      expect(
        nonImportOccurrences(source!, identifier),
        `"${identifier}" appears outside the import line in run-doctor.mjs`,
      ).toBe(0);
    }
  });

  it('run-feedback.mjs (once modified) contains no probe logic of its own either — only the import line', async () => {
    const source = await fs.readFile(FEEDBACK_RUNNER_PATH, 'utf8').catch(() => undefined);
    expect(source, `${FEEDBACK_RUNNER_PATH} does not exist`).toBeDefined();

    expect(source).toContain("from '../shared/probes.mjs'");
    for (const identifier of PROBE_IDENTIFIERS) {
      expect(
        nonImportOccurrences(source!, identifier),
        `"${identifier}" appears outside the import line in run-feedback.mjs`,
      ).toBe(0);
    }
  });

  it('the four probe identifiers are defined exactly once, in templates/shared/probes.mjs', async () => {
    const sharedPath = path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs');
    const source = await fs.readFile(sharedPath, 'utf8').catch(() => undefined);
    expect(source, `${sharedPath} does not exist yet`).toBeDefined();

    for (const identifier of PROBE_IDENTIFIERS) {
      expect(source, `templates/shared/probes.mjs does not define "${identifier}"`).toContain(
        `function ${identifier}`,
      );
    }
  });
});

describe('every check is evaluated even when an earlier one fails (BG-2)', () => {
  it('a failing require entry does not prevent later require entries or the tests family from running', async () => {
    const repoDir = await makeReadyRepo();
    await fs.rm(path.join(repoDir, 'AGENTS.md'));
    const checksFile = await writeChecksFile(repoDir, readyChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    // conventions-doc failed, but harness-manifest and the test command still ran.
    expect(output).toContain('harness-manifest');
    expect(output).toContain('always-ok');
  });
});
