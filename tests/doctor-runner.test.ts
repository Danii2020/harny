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
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: contract.md "Public API — the canonical runner,
 * `templates/doctor/run-doctor.mjs`" (the `warn` outcome, `evaluateEntry`, the
 * new family-3 emission point); Behavior Guarantees AR-1, AR-3, AR-4, AR-5,
 * AR-11, AR-12, AR-14, AR-15, AR-17; Error Handling Contract rows for a
 * must-have gap, a recommended gap, an unrecognised `tier`, and a pre-feature
 * `checks.json`; intent.md SC1-SC4, SC9, SC15; audit.md Test Coverage T6-T11.
 *
 * `run-doctor.mjs` does not yet know a `warn` outcome, a `repoReadiness` family,
 * or a `repoReadinessLabel` heading at red time: every test below that depends
 * on any of the three is expected to fail because the runner silently ignores
 * `checks.repoReadiness ?? []` today (ai-sdlc-readiness is additive over
 * readiness-doctor's shipped runner) — never a `WARN`/`FAIL` line, never a
 * non-zero exit for a missing `README.md`, and the summary line still reports
 * only three counts. That is the expected red-phase failure mode here, not a
 * bug in these tests' own setup.
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

/** The fifth family's three entries, exactly as tabulated in contract.md § Data
 *  Models "The fifth family's entries" — a fixture-level mirror of
 *  `buildRepoReadinessChecks`'s contracted output for a single `claude-code`
 *  selection, not a call into `src/doctor.ts` (this file drives the runner as a
 *  real subprocess, never a `src/` import — see file header). */
const REPO_READINESS_LABEL = 'repo readiness';
const REPO_READINESS_ENTRIES = [
  {
    id: 'repo-readiness:readme',
    description: 'a README exists',
    anyOf: ['README.md'],
    remediation: 'add a README.md describing what this project is and how to run it',
    tier: 'must-have',
  },
  {
    id: 'repo-readiness:architecture',
    description: 'an architecture or structure document exists',
    anyOf: ['ARCHITECTURE.md', 'AGENTS.md', 'docs/architecture.md'],
    remediation:
      "add an ARCHITECTURE.md (or an AGENTS.md section) describing this repo's components and how they fit together",
    tier: 'recommended',
  },
  {
    id: 'repo-readiness:agent-guidance:CLAUDE.md',
    description: 'CLAUDE.md or AGENTS.md exists',
    anyOf: ['CLAUDE.md', 'AGENTS.md'],
    remediation: 'add CLAUDE.md (or a root AGENTS.md) so this tool reads project guidance',
    tier: 'recommended',
    requires: { anyFile: ['.sdd/harness.json'] },
  },
];

/** `readyChecks()` plus the new family — a repo scaffolded and reported ready
 *  under both readiness-doctor and ai-sdlc-readiness at once. */
function readyChecksWithRepoReadiness() {
  return {
    ...readyChecks(),
    repoReadiness: REPO_READINESS_ENTRIES,
    repoReadinessLabel: REPO_READINESS_LABEL,
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

describe('repo readiness runs third, between harness-manifest and spec-state, in fixed order (T9, AR-1, SC1)', () => {
  it('prints repo-readiness ids after harness-manifest and before a spec-state finding, which itself precedes the tests family', async () => {
    const repoDir = await makeReadyRepo();
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Readme\n', 'utf8');
    await writeFeature(repoDir, 'shipped-and-approved', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    const harnessManifestIndex = output.indexOf('harness-manifest');
    const repoReadinessIndex = output.indexOf('repo-readiness:readme');
    const specStateIndex = output.indexOf('shipped-and-approved');
    const testsIndex = output.indexOf('always-ok');

    expect(harnessManifestIndex).toBeGreaterThanOrEqual(0);
    expect(repoReadinessIndex, 'no repo-readiness:readme line found').toBeGreaterThan(harnessManifestIndex);
    expect(specStateIndex, 'no shipped-and-approved spec-state finding found').toBeGreaterThan(repoReadinessIndex);
    expect(testsIndex).toBeGreaterThan(specStateIndex);
  });
});

describe('a missing must-have repo-readiness entry fails the run (T6, AR-3, SC2)', () => {
  it('exits 2 and prints a FAIL line naming the readme remediation when README.md is absent', async () => {
    const repoDir = await makeReadyRepo();
    // Deliberately no README.md.
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    expect(output).toMatch(/FAIL\s+repo-readiness:readme/i);
    expect(output).toContain('add a README.md describing what this project is and how to run it');
  });
});

describe('a missing recommended repo-readiness entry warns without failing the run (T7, AR-4, SC3)', () => {
  it('exits 0 and prints a WARN line naming the architecture remediation, when the conventions doc is CLAUDE.md (never AGENTS.md/ARCHITECTURE.md)', async () => {
    const repoDir = await makeReadyRepo();
    // makeReadyRepo() writes AGENTS.md, which is itself one of
    // repo-readiness:architecture's accepted paths (contract.md § Data Models):
    // asserting the warn requires a fixture that satisfies conventions-doc
    // WITHOUT ever satisfying architecture, so CLAUDE.md replaces AGENTS.md here.
    await fs.rm(path.join(repoDir, 'AGENTS.md'));
    await fs.writeFile(path.join(repoDir, 'CLAUDE.md'), '# CLAUDE\n', 'utf8');
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Readme\n', 'utf8');
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output).toMatch(/WARN\s+repo-readiness:architecture/i);
    expect(output).toContain("describing this repo's components and how they fit together");
    // A warned run is still a ready run (AR-2): distinct from a FAIL for the same id.
    expect(output).not.toMatch(/FAIL\s+repo-readiness:architecture/i);
  });
});

describe('the same evaluator gates family 3 exactly like family 2 — an unmet requires gate is a skip, never a failure (AR-12, Error Handling Contract)', () => {
  it('skips the harness-gated agent-guidance entry, with the identical wording family 2 uses, when .sdd/harness.json is absent', async () => {
    const repoDir = await makeReadyRepo();
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Readme\n', 'utf8');
    await fs.rm(path.join(repoDir, '.sdd', 'harness.json'));
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(output).toMatch(/SKIP\s+repo-readiness:agent-guidance:CLAUDE\.md.*requirement not met, skipping/i);
    // The two universal entries are ungated and still evaluate.
    expect(output).toMatch(/OK\s+repo-readiness:readme/i);
  });
});

describe('a pre-feature checks.json (no repoReadiness key) still runs correctly (T8, AR-5, SC9)', () => {
  it('produces no repo-readiness lines and leaves the four original families exactly as before', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, readyChecks()); // pre-feature shape

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(0);
    expect(output).not.toContain('repo-readiness');
    expect(output).toContain('conventions-doc');
    expect(output).toContain('harness-manifest');
  });
});

describe('an entry with an unrecognised tier value is treated as must-have, never silently downgraded (T8, Error Handling Contract)', () => {
  it('fails the run when its anyOf is unsatisfied and its tier is neither absent nor "recommended"', async () => {
    const repoDir = await makeReadyRepo();
    await fs.writeFile(path.join(repoDir, 'README.md'), '# Readme\n', 'utf8');
    const checks = readyChecksWithRepoReadiness();
    checks.repoReadiness = [
      {
        id: 'repo-readiness:bogus-tier',
        description: 'a bogus entry',
        anyOf: ['this-file-does-not-exist.md'],
        remediation: 'add this-file-does-not-exist.md',
        tier: 'not-a-real-tier',
      } as any,
    ];
    const checksFile = await writeChecksFile(repoDir, checks);

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(2);
    expect(output).toMatch(/FAIL\s+repo-readiness:bogus-tier/i);
    expect(output).not.toMatch(/WARN\s+repo-readiness:bogus-tier/i);
  });
});

describe('the summary line reports four counts, in order ok/skipped/warned/failed, and WARN is textually distinct from SKIP and FAIL (T9, AR-14, SC4)', () => {
  it('mixes one ok, one skip, one warn and one fail across repo-readiness and asserts both the per-line tags and the summary shape', async () => {
    const repoDir = await makeTempRepo();
    await fs.writeFile(path.join(repoDir, 'AGENTS.md'), '# AGENTS\n', 'utf8'); // conventions-doc -> ok
    // No README.md -> repo-readiness:readme FAILs.
    // No ARCHITECTURE.md/docs/architecture.md, but AGENTS.md exists, which would
    // satisfy architecture too; use a fixture-local entry set instead of the
    // shared fixture so architecture's anyOf deliberately excludes AGENTS.md,
    // isolating exactly one WARN.
    const checks = {
      version: 1,
      specs: SPECS,
      require: [
        {
          id: 'conventions-doc',
          description: 'a conventions document exists',
          anyOf: ['AGENTS.md', 'CLAUDE.md'],
          remediation: "add an AGENTS.md (or CLAUDE.md) documenting this repo's conventions",
        },
      ],
      repoReadiness: [
        REPO_READINESS_ENTRIES[0], // readme -> fail (no README.md)
        {
          id: 'repo-readiness:architecture-only',
          description: 'an architecture document exists',
          anyOf: ['ARCHITECTURE.md'],
          remediation: 'add an ARCHITECTURE.md',
          tier: 'recommended',
        }, // -> warn (no ARCHITECTURE.md)
        REPO_READINESS_ENTRIES[2], // agent-guidance -> skip (no .sdd/harness.json)
      ],
      repoReadinessLabel: REPO_READINESS_LABEL,
      commands: [],
    };
    const checksFile = await writeChecksFile(repoDir, checks);

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(output).toMatch(/FAIL\s+repo-readiness:readme/i);
    expect(output).toMatch(/WARN\s+repo-readiness:architecture-only/i);
    expect(output).toMatch(/SKIP\s+repo-readiness:agent-guidance/i);
    expect(result.code).toBe(2);
    expect(output).toMatch(/summary:\s*\d+\s*ok,\s*\d+\s*skipped,\s*\d+\s*warned,\s*\d+\s*failed/i);
  });
});

describe('repo-readiness asserts presence only, never a document\'s contents (AR-17)', () => {
  it('an empty README.md still satisfies repo-readiness:readme — presence, not content, is what is checked', async () => {
    const repoDir = await makeReadyRepo();
    await fs.writeFile(path.join(repoDir, 'README.md'), '', 'utf8');
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const output = result.stdout + result.stderr;

    expect(output).toMatch(/OK\s+repo-readiness:readme/i);
  });
});

describe('the runner hard-codes none of the new family\'s data (T10, AR-11, SC8)', () => {
  it('contains none of the contracted document names, accepted paths, or the family label as a quoted source literal', async () => {
    const source = await fs.readFile(RUNNER_PATH, 'utf8').catch(() => undefined);
    expect(source, `${RUNNER_PATH} does not exist yet`).toBeDefined();

    // Checked as a quoted JS string literal (`'…'`/`"…"`), not a bare
    // substring: the file's own top-of-file doc comment legitimately
    // cross-references `templates/doctor/README.md` (the behavior document
    // this script implements) in backticks, which is prose, not a data
    // literal, and must not make this guard fail for the wrong reason.
    for (const literal of [
      'README.md',
      'ARCHITECTURE.md',
      'docs/architecture.md',
      '.kiro/steering',
      '.github/copilot-instructions.md',
      REPO_READINESS_LABEL,
    ]) {
      expect(source, `run-doctor.mjs hard-codes "${literal}"`).not.toContain(`'${literal}'`);
      expect(source, `run-doctor.mjs hard-codes "${literal}"`).not.toContain(`"${literal}"`);
    }
  });
});

describe('a failing repo-readiness outcome writes nothing to the target repo (T11, AR-15, SC15)', () => {
  it('leaves the fixture file list identical before and after a red run caused by a missing README.md', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, readyChecksWithRepoReadiness());

    async function listFiles(dir: string): Promise<string[]> {
      async function walk(current: string): Promise<string[]> {
        const entries = await fs.readdir(current, { withFileTypes: true });
        const out: string[] = [];
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) out.push(...(await walk(full)));
          else out.push(path.relative(dir, full));
        }
        return out;
      }
      return (await walk(dir)).sort();
    }

    const before = await listFiles(repoDir);
    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });
    const after = await listFiles(repoDir);

    expect(result.code).toBe(2);
    expect(after).toEqual(before);
  });
});
