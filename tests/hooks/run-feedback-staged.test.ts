/**
 * Spec: specs/commit-checks
 * Covers: contract.md CC-2 (`run --staged`: staged ACMR paths only, extension and
 * existence filters, whole-project commands never run, exit 2 on a finding, 0 when
 * nothing is staged); intent.md SC5.
 *
 * Drives `templates/hooks/run-feedback.mjs` as a real subprocess inside a real git
 * repository, with `tests/fixtures/hooks/record-invocation.mjs` standing in for every
 * mapped command so the run stays offline and observable.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, TESTS_DIR } from '../helpers/paths.js';

const RUNNER = path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs');
const PROBES = path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs');
const RECORD = path.join(TESTS_DIR, 'fixtures', 'hooks', 'record-invocation.mjs');

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function git(dir: string, ...args: string[]): void {
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: dir, stdio: 'ignore' });
}

function makeRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-staged-'));
  tempDirs.push(dir);
  git(dir, 'init', '-q', '-b', 'feature/x');
  fs.mkdirSync(path.join(dir, '.sdd', 'feedback'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.sdd', 'shared'), { recursive: true });
  fs.copyFileSync(RUNNER, path.join(dir, '.sdd', 'feedback', 'run-feedback.mjs'));
  fs.copyFileSync(PROBES, path.join(dir, '.sdd', 'shared', 'probes.mjs'));
  return dir;
}

const COMMANDS = JSON.stringify([
  { id: 'lint', kind: 'lint', argv: ['node', RECORD, 'lint'], pathMode: 'per-file', extensions: ['.ts'], requires: {} },
  { id: 'types', kind: 'typecheck', argv: ['node', RECORD, 'types'], pathMode: 'whole-project', requires: {} },
]);

function runStaged(dir: string, env: Record<string, string> = {}) {
  const log = path.join(dir, 'invocations.jsonl');
  const result = spawnSync('node', ['.sdd/feedback/run-feedback.mjs', 'run', '--staged', '--commands', COMMANDS], {
    cwd: dir,
    env: { ...process.env, INVOCATION_LOG: log, ...env },
    input: '',
  });
  const invocations = fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line).argv as string[])
    : [];
  return { code: result.status, invocations };
}

describe('run --staged lints exactly the staged files, per-file only (CC-2)', () => {
  it('passes staged Added/Modified .ts files to per-file commands and never runs whole-project ones', () => {
    const dir = makeRepo();
    fs.writeFileSync(path.join(dir, 'a.ts'), 'x\n');
    fs.writeFileSync(path.join(dir, 'b.ts'), 'x\n');
    fs.writeFileSync(path.join(dir, 'notes.md'), 'x\n');
    fs.writeFileSync(path.join(dir, 'unstaged.ts'), 'x\n');
    git(dir, 'add', 'a.ts', 'b.ts', 'notes.md');

    const { code, invocations } = runStaged(dir);
    expect(code).toBe(0);
    expect(invocations).toHaveLength(1);
    const [lintArgv] = invocations;
    expect(lintArgv![0]).toBe('lint');
    expect(lintArgv!.slice(1).map((p) => path.basename(p)).sort()).toEqual(['a.ts', 'b.ts']);
    expect(lintArgv!.slice(1).every((p) => path.isAbsolute(p))).toBe(true);
  });

  it('ignores staged deletions and runs nothing when nothing is staged', () => {
    const dir = makeRepo();
    fs.writeFileSync(path.join(dir, 'gone.ts'), 'x\n');
    git(dir, 'add', 'gone.ts');
    git(dir, 'commit', '-q', '-m', 'add');
    git(dir, 'rm', '-q', 'gone.ts');
    expect(runStaged(dir)).toEqual({ code: 0, invocations: [] });

    const clean = makeRepo();
    expect(runStaged(clean)).toEqual({ code: 0, invocations: [] });
  });

  it('exits 2 when a per-file command reports a finding', () => {
    const dir = makeRepo();
    fs.writeFileSync(path.join(dir, 'a.ts'), 'x\n');
    git(dir, 'add', 'a.ts');
    expect(runStaged(dir, { FAKE_EXIT_CODE: '1' }).code).toBe(2);
  });
});
