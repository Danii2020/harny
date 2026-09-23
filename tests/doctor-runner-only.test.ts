/**
 * Spec: specs/documentation-role-completion
 * Covers: contract.md § Interfaces item 1 (`templates/doctor/run-doctor.mjs` —
 * a family selector); Behavior Guarantees RC-1, RC-2, RC-3, RC-4, RC-5, RC-6,
 * RC-9, RC-13; Error Handling Contract rows for an unknown `--only` value, a
 * missing `--only` value, `--only spec-state` against one/two/no stranded
 * features, and `specs/` absent or empty; intent.md SC1, SC2, SC3;
 * audit.md Test Coverage T1-T9; tasks.md Tasks 1.1R, 1.2R, 1.3R.
 *
 * `templates/doctor/run-doctor.mjs`'s `parseArgs` does not recognize `--only`
 * at red time — it is not `--checks`, so every invocation below that passes
 * `--only` falls straight into today's generic `else { fail(...) }` branch
 * ("unknown flag \"--only\" (expected --checks <path-or-inline-json>)") and
 * exits 1 *before* any family ever runs. That is the expected red-phase
 * failure for every describe block below except the first (RC-1, `--only`
 * absent), which exercises no new code path and is a declared regression
 * guard that passes already and stays green — the same "expected to pass
 * already at red time" posture `tests/canonical-fidelity.test.ts`'s
 * ci-workflow-root golden-copy block and this repo's other continuity guards
 * document explicitly.
 *
 * Several assertions below deliberately go beyond "exit code 1" for the
 * unknown-value/missing-value cases: because *any* `--only` usage today
 * already exits 1 via the generic unknown-flag branch, an assertion of exit
 * code alone would incidentally already pass at red time — a false green for
 * this test suite itself. Each such test additionally asserts on message
 * content (naming the offending value / the accepted `FAMILY_TOKENS` set, and
 * NOT reusing the generic "unknown flag" wording), pinning the acceptance
 * interface a dedicated `--only` validation branch must satisfy per
 * contract.md's `parseArgs` pseudocode ("`--only <family>`: missing value ->
 * fail(...); value not in FAMILY_TOKENS -> fail(...) naming the accepted
 * set"), distinct from the pre-existing catch-all for a wholly unrecognized
 * flag like `--foo`.
 *
 * Mirrors `tests/doctor-runner.test.ts`'s structural model: the runner is
 * driven as a real subprocess (never a `src/` import), since it is a template
 * artifact copied verbatim into target repos (contract.md BG-11, RC-17).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';

const RUNNER_PATH = path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs');

/** The five check families, in the fixed order `main` runs them — contract.md
 *  § Interfaces item 1's `FAMILY_TOKENS`. Duplicated here deliberately: this
 *  is the acceptance interface the test pins, not a value imported from the
 *  implementation under test. */
const FAMILY_TOKENS = ['environment', 'harness', 'repo-readiness', 'spec-state', 'tests'];

const tempDirs: string[] = [];

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-doctor-only-'));
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

/** Creates a sentinel file when spawned — the RC-2 "no child process
 *  whatsoever" assertion depends on this file staying absent, not merely on
 *  no test-family *output* appearing, which is a materially weaker claim
 *  (tasks.md Task 1.2R). */
function sentinelCommand(sentinelPath: string) {
  return {
    id: 'sentinel-writer',
    kind: 'test',
    argv: ['node', '-e', `require('fs').writeFileSync(${JSON.stringify(sentinelPath)}, 'spawned')`],
    pathMode: 'whole-project',
    requires: {},
  };
}

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
  return repoDir;
}

function fullChecks(extra: Record<string, unknown> = {}) {
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
    ],
    repoReadiness: [],
    repoReadinessLabel: 'repo readiness',
    commands: [
      {
        id: 'always-ok',
        kind: 'test',
        argv: ['node', '-e', 'process.exit(0)'],
        pathMode: 'whole-project',
        requires: {},
      },
    ],
    ...extra,
  };
}

describe('`--only` absent reproduces today\'s five-family run, unaffected by the selector\'s existence (RC-1)', () => {
  it('runs environment, harness, spec-state and tests, and exits 0 for a clean repo', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile] });

    expect(result.code).toBe(0);
    expect(result.stdout.toLowerCase()).toMatch(/node.*v?\d+\.\d+/);
    expect(result.stdout).toContain('conventions-doc');
    expect(result.stdout).toContain('always-ok');
  });
});

describe('`--only spec-state` evaluates family 4 alone (RC-2, RC-4; intent SC1, SC3)', () => {
  it('emits no environment/harness/repo-readiness/tests lines, names a stranded feature, and is deterministic across two runs', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'stranded-feature', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const first = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });
    const second = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });

    for (const result of [first, second]) {
      expect(result.code, 'a selector-scoped run with a real finding must exit 2, never 1').toBe(2);
      expect(result.stdout).not.toContain('node-version');
      expect(result.stdout).not.toContain('conventions-doc');
      // The family-3 label line is printed unconditionally by today's runner
      // whenever `repoReadinessLabel` is set, regardless of family-3 entry
      // count — asserting on the label text itself (not the hyphenated CLI
      // selector token) is what actually pins "no family-3 label line" (RC-2).
      expect(result.stdout).not.toContain('repo readiness');
      expect(result.stdout).not.toContain('always-ok');
      expect(result.stdout).toContain('stranded-feature');
    }

    // RC-4: identical state + identical args -> byte-identical stdout and exit code.
    expect(first.stdout).toBe(second.stdout);
    expect(first.code).toBe(second.code);
  });
});

describe('`--only spec-state` spawns no child process whatsoever (RC-2)', () => {
  it('leaves a tests-family sentinel file unwritten, and the run is genuinely evaluated (exit is not 1)', async () => {
    const repoDir = await makeReadyRepo();
    const sentinelPath = path.join(repoDir, 'sentinel.txt');
    const checksFile = await writeChecksFile(repoDir, fullChecks({ commands: [sentinelCommand(sentinelPath)] }));

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });

    expect(result.code, 'exit 1 here would mean --only was rejected, not that it ran and skipped spawning').not.toBe(1);
    await expect(fs.access(sentinelPath)).rejects.toThrow();
  });
});

describe('an unknown `--only` value is a loud usage error, never a silently-empty successful run (RC-3)', () => {
  it('exits 1, names the offending value and the accepted family set, and is not treated as "nothing to check, all clear"', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'totally-bogus-family'] });
    const output = result.stdout + result.stderr;

    expect(result.code, 'a typo in --only must never exit 0').toBe(1);
    expect(result.code).not.toBe(0);
    expect(output).toContain('totally-bogus-family');
    for (const token of FAMILY_TOKENS) {
      expect(output, `accepted set does not name "${token}"`).toContain(token);
    }
    // A dedicated --only validation branch, not the pre-existing generic
    // catch-all for a wholly unrecognized flag (which this value is not).
    expect(output.toLowerCase()).not.toContain('unknown flag');
  });
});

describe('`--only` given with no following value exits 1 (RC-3)', () => {
  it('exits 1, names --only, prints no family output, and is not the generic unknown-flag branch', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only'] });
    const output = result.stdout + result.stderr;

    expect(result.code).toBe(1);
    expect(result.stdout, 'no family evaluation should have started').toBe('');
    expect(output).toContain('--only');
    expect(output.toLowerCase()).not.toContain('unknown flag');
  });
});

describe('a repeated `--only` flag: last occurrence wins, consistent with --checks (RC-1)', () => {
  it('`--only environment --only spec-state` behaves as spec-state alone', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'stranded-again', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({
      cwd: repoDir,
      args: ['--checks', checksFile, '--only', 'environment', '--only', 'spec-state'],
    });

    expect(result.code).toBe(2);
    expect(result.stdout).not.toContain('node-version');
    expect(result.stdout).toContain('stranded-again');
  });
});

describe('the shipped-but-unarchived detector fires under the selector — the exact condition that reproduced three times (RC-5, RC-9, RC-13; intent SC2)', () => {
  it('names the feature and exits 2 while shipped-and-approved under specs/, then exits 0 once archived', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'documentation-role-completion-fixture', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const stranded = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });
    expect(stranded.code).toBe(2);
    expect(stranded.stdout).toContain('documentation-role-completion-fixture');
    expect(stranded.stdout).toContain('harny-sync');

    await fs.mkdir(path.join(repoDir, 'specs', 'archived'), { recursive: true });
    await fs.rename(
      path.join(repoDir, 'specs', 'documentation-role-completion-fixture'),
      path.join(repoDir, 'specs', 'archived', 'documentation-role-completion-fixture'),
    );

    const archived = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });
    expect(archived.code).toBe(0);
    expect(archived.stdout).not.toContain('documentation-role-completion-fixture');
  });

  it('reports a different feature\'s stranded line as a finding, and never suppresses it for an unrelated non-stranded feature', async () => {
    const repoDir = await makeReadyRepo();
    await writeFeature(repoDir, 'my-current-feature', { shipped: false, approved: true });
    await writeFeature(repoDir, 'someone-elses-stranded-feature', { shipped: true, approved: true });
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });

    expect(result.code).toBe(2);
    expect(result.stdout).toContain('someone-elses-stranded-feature');
    expect(result.stdout).not.toContain('my-current-feature');
  });
});

describe('`specs/` absent or empty exits 0 under the selector — distinct from the exit-1 error path (RC-3 Error Handling Contract)', () => {
  it('exits 0 with no family-4 lines when the repo has no specs/ directory at all', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, fullChecks());

    const result = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'spec-state'] });

    expect(result.code).toBe(0);
    expect(result.code).not.toBe(1);
  });
});

describe('a syntactically valid but locally-empty family selection is legitimately ready, distinguishable from an invalid selector (RC-3 boundary)', () => {
  it('`--only harness` with zero configured require entries exits 0, while an unknown value under the same checks file still exits 1', async () => {
    const repoDir = await makeReadyRepo();
    const checksFile = await writeChecksFile(repoDir, fullChecks({ require: [] }));

    const validEmpty = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'harness'] });
    const invalid = await runRunner({ cwd: repoDir, args: ['--checks', checksFile, '--only', 'nonexistent-family'] });

    expect(validEmpty.code, 'a real family with nothing configured is legitimately 0, not an error').toBe(0);
    expect(invalid.code, 'a typo must still be rejected under the identical checks file').toBe(1);
  });
});
