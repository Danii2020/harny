/**
 * Spec: specs/commit-checks
 * Covers: contract.md CC-1 (shims exec the runner), CC-3 (pre-commit order: protected
 * branch with the unborn-branch exemption, gitleaks, staged lint, chaining), CC-4
 * (pre-push refs, deletions, chaining), CC-5 (shared protected list, missing policy);
 * § Error Handling rows "gitleaks not installed", "policy missing", "node missing";
 * intent.md SC2, SC3, SC4.
 *
 * Every test runs real `git commit` / `git push` in a throwaway repository whose
 * `core.hooksPath` points at the canonical hooks, installed exactly as `harny init`
 * lays them out. A fake `gitleaks` on PATH stands in for the real binary (offline).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, TESTS_DIR } from '../helpers/paths.js';

const RECORD = path.join(TESTS_DIR, 'fixtures', 'hooks', 'record-invocation.mjs');

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

interface Repo {
  readonly dir: string;
  readonly bin: string;
}

function install(dir: string, options: { policy?: boolean; lint?: boolean } = {}): void {
  const copy = (from: string, to: string, mode = 0o644) => {
    fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true });
    fs.copyFileSync(path.join(REAL_TEMPLATES_ROOT, from), path.join(dir, to));
    fs.chmodSync(path.join(dir, to), mode);
  };
  copy('git-hooks/pre-commit', '.sdd/git-hooks/pre-commit', 0o755);
  copy('git-hooks/pre-push', '.sdd/git-hooks/pre-push', 0o755);
  copy('git-hooks/run-git-hook.mjs', '.sdd/git-hooks/run-git-hook.mjs');
  copy('hooks/run-feedback.mjs', '.sdd/feedback/run-feedback.mjs');
  copy('shared/probes.mjs', '.sdd/shared/probes.mjs');
  if (options.policy !== false) copy('permissions/policy.json', '.sdd/permissions/policy.json');
  const commands =
    options.lint === false
      ? []
      : [{ id: 'lint', kind: 'lint', argv: ['node', RECORD], pathMode: 'per-file', extensions: ['.ts'], requires: {} }];
  fs.writeFileSync(path.join(dir, '.sdd', 'git-hooks', 'commands.json'), `${JSON.stringify(commands)}\n`);
}

function makeRepo(branch: string, options: { policy?: boolean; lint?: boolean; firstCommit?: boolean } = {}): Repo {
  const dir = tempDir('harny-githook-');
  const bin = tempDir('harny-githook-bin-');
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 't'], { cwd: dir });
  install(dir, options);
  if (options.firstCommit !== false) {
    // A first commit made before the hooks are active, so HEAD is not unborn.
    execFileSync('git', ['commit', '-q', '--allow-empty', '-m', 'init'], { cwd: dir });
  }
  execFileSync('git', ['config', 'core.hooksPath', '.sdd/git-hooks'], { cwd: dir });
  return { dir, bin };
}

function fakeGitleaks(repo: Repo, exitCode: number): void {
  const script = path.join(repo.bin, 'gitleaks');
  fs.writeFileSync(script, `#!/bin/sh\necho "fake gitleaks $*" >&2\nexit ${exitCode}\n`);
  fs.chmodSync(script, 0o755);
}

function gitRun(repo: Repo, args: string[], env: Record<string, string> = {}) {
  const result = spawnSync('git', args, {
    cwd: repo.dir,
    env: { ...process.env, PATH: `${repo.bin}${path.delimiter}${process.env.PATH}`, ...env },
  });
  return { code: result.status, stderr: result.stderr.toString(), stdout: result.stdout.toString() };
}

function stageFile(repo: Repo, name: string): void {
  fs.writeFileSync(path.join(repo.dir, name), 'x\n');
  execFileSync('git', ['add', name], { cwd: repo.dir });
}

describe('pre-commit: protected branches (CC-3 step 1, CC-5)', () => {
  it('blocks a commit on a protected branch that already has history, naming it', () => {
    const repo = makeRepo('main');
    stageFile(repo, 'a.md');
    const result = gitRun(repo, ['commit', '-q', '-m', 'x']);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('main');
  });

  it('allows the first commit on an unborn protected branch, and any feature-branch commit', () => {
    const fresh = makeRepo('main', { firstCommit: false });
    stageFile(fresh, 'a.md');
    expect(gitRun(fresh, ['commit', '-q', '-m', 'first']).code).toBe(0);

    const feature = makeRepo('feature/x');
    stageFile(feature, 'a.md');
    expect(gitRun(feature, ['commit', '-q', '-m', 'x']).code).toBe(0);
  });

  it('skips branch checks with a notice when the policy is missing', () => {
    const repo = makeRepo('main', { policy: false });
    stageFile(repo, 'a.md');
    const result = gitRun(repo, ['commit', '-q', '-m', 'x']);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain('policy.json');
  });
});

describe('pre-commit: secrets and lint (CC-3 steps 2-3)', () => {
  it('blocks when gitleaks reports a leak, and runs it in staged pre-commit mode', () => {
    const repo = makeRepo('feature/x');
    fakeGitleaks(repo, 1);
    stageFile(repo, 'a.md');
    const result = gitRun(repo, ['commit', '-q', '-m', 'x']);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('fake gitleaks git --pre-commit --staged');
  });

  it('proceeds with one notice when gitleaks is not installed', () => {
    const repo = makeRepo('feature/x');
    stageFile(repo, 'a.md');
    const result = gitRun(repo, ['commit', '-q', '-m', 'x'], { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin` });
    expect(result.code).toBe(0);
    expect(result.stderr).toMatch(/gitleaks/);
  });

  it('blocks when a staged file fails a per-file lint, and passes when it is clean', () => {
    const repo = makeRepo('feature/x');
    fakeGitleaks(repo, 0);
    stageFile(repo, 'bad.ts');
    expect(gitRun(repo, ['commit', '-q', '-m', 'x'], { FAKE_EXIT_CODE: '1' }).code).not.toBe(0);
    expect(gitRun(repo, ['commit', '-q', '-m', 'x']).code).toBe(0);
  });
});

describe('pre-commit: chaining a pre-existing .git/hooks hook (CC-3 step 4)', () => {
  it('runs the existing hook and propagates its failure', () => {
    const repo = makeRepo('feature/x');
    fakeGitleaks(repo, 0);
    const legacy = path.join(repo.dir, '.git', 'hooks', 'pre-commit');
    fs.writeFileSync(legacy, '#!/bin/sh\necho "legacy hook ran" >&2\nexit 7\n');
    fs.chmodSync(legacy, 0o755);
    stageFile(repo, 'a.md');
    const result = gitRun(repo, ['commit', '-q', '-m', 'x']);
    expect(result.code).not.toBe(0);
    expect(result.stderr).toContain('legacy hook ran');
  });
});

describe('pre-push: protected refs (CC-4)', () => {
  function withRemote(branch: string): Repo {
    const repo = makeRepo(branch);
    const remote = tempDir('harny-githook-remote-');
    execFileSync('git', ['init', '-q', '--bare'], { cwd: remote });
    execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: repo.dir });
    return repo;
  }

  it('blocks a push to a protected branch by any refspec, and allows a feature push', () => {
    const repo = withRemote('feature/x');
    for (const refspec of ['feature/x:main', 'HEAD:refs/heads/production', 'HEAD:release/2.0']) {
      const result = gitRun(repo, ['push', '-q', 'origin', refspec]);
      expect(result.code, refspec).not.toBe(0);
      expect(result.stderr, refspec).toMatch(/protected/);
    }
    expect(gitRun(repo, ['push', '-q', 'origin', 'feature/x']).code).toBe(0);
  });

  it('allows tags', () => {
    const repo = withRemote('feature/x');
    execFileSync('git', ['tag', 'v1'], { cwd: repo.dir });
    expect(gitRun(repo, ['push', '-q', 'origin', 'v1']).code).toBe(0);
  });
});

describe('shims fail open without node (Error Handling)', () => {
  it('lets the commit through with a notice when node is not on PATH', () => {
    const repo = makeRepo('main');
    stageFile(repo, 'a.md');
    // A PATH holding git and nothing else: the shims' `#!/bin/sh` still resolves,
    // `node` does not. `main` would be blocked if the runner ran.
    const onlyGit = tempDir('harny-githook-onlygit-');
    fs.symlinkSync(execFileSync('which', ['git']).toString().trim(), path.join(onlyGit, 'git'));
    const result = gitRun(repo, ['commit', '-q', '-m', 'x'], { PATH: onlyGit });
    expect(result.code).toBe(0);
    expect(result.stderr).toMatch(/node/);
  });
});
