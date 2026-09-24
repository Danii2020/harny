/**
 * Spec: specs/commit-checks
 * Covers: contract.md § Public API (`src/git-hooks.ts`, `GeneratedFile.executable`,
 * `InitOptions.gitHooks`), CC-1 (four files, once, shims executable), CC-6 (activation:
 * consent, not-a-repo, hook managers, existing hooksPath, idempotence, relative path
 * for a subdirectory install), CC-8 (determinism); intent.md SC1, SC6.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';
import { GIT_HOOKS_COMMANDS_PATH, GIT_HOOKS_DIR, activateGitHooks, buildGitHooksFiles } from '../src/git-hooks.js';
import { buildCommandsPayload, buildPayload } from '../src/engine.js';
import { defaultConfig } from '../src/config.js';
import { loadCanonicalTemplates } from '../src/templates.js';
import { runInit } from '../src/init.js';

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-gh-'));
  tempDirs.push(dir);
  return dir;
}

function gitRepo(): string {
  const dir = tempDir();
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function hooksPath(dir: string): string | undefined {
  try {
    return execFileSync('git', ['config', '--get', 'core.hooksPath'], { cwd: dir }).toString().trim();
  } catch {
    return undefined;
  }
}

const quietIo = { log: () => {}, warn: () => {} };

describe('buildGitHooksFiles (CC-1, CC-8)', () => {
  it('returns the two executable shims, the runner and the commands file, verbatim', async () => {
    const templates = await loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
    const payload = buildPayload(defaultConfig(templates), templates);
    const commands = buildCommandsPayload(payload.conductor.project.components);
    const files = buildGitHooksFiles(payload, commands);

    expect(GIT_HOOKS_DIR).toBe('.sdd/git-hooks');
    expect(GIT_HOOKS_COMMANDS_PATH).toBe('.sdd/git-hooks/commands.json');
    expect(files.map((f) => [f.path, f.executable ?? false])).toEqual([
      ['.sdd/git-hooks/pre-commit', true],
      ['.sdd/git-hooks/pre-push', true],
      ['.sdd/git-hooks/run-git-hook.mjs', false],
      ['.sdd/git-hooks/commands.json', false],
    ]);
    for (const name of ['pre-commit', 'pre-push', 'run-git-hook.mjs']) {
      expect(files.find((f) => f.path.endsWith(name))!.contents).toBe(
        fs.readFileSync(path.join(REAL_TEMPLATES_ROOT, 'git-hooks', name), 'utf8'),
      );
    }
    expect(JSON.parse(files[3]!.contents)).toEqual(commands);
    expect(buildGitHooksFiles(payload, commands)).toEqual(files);
  });
});

describe('runInit writes executable shims and activates only with consent (CC-1, CC-6)', () => {
  it('activates by default inside a git repository, and writes the shims with mode 0755', async () => {
    const dir = gitRepo();
    await runInit({ targetDir: dir, overrides: { tools: ['claude-code'] }, interactive: false, dryRun: false, force: false, io: quietIo });
    expect(hooksPath(dir)).toBe('.sdd/git-hooks');
    for (const shim of ['pre-commit', 'pre-push']) {
      expect(fs.statSync(path.join(dir, '.sdd', 'git-hooks', shim)).mode & 0o111).not.toBe(0);
    }
  });

  it('does not activate with gitHooks: false, nor on a dry run', async () => {
    const off = gitRepo();
    await runInit({ targetDir: off, overrides: { tools: ['claude-code'] }, interactive: false, dryRun: false, force: false, gitHooks: false, io: quietIo });
    expect(hooksPath(off)).toBeUndefined();
    expect(fs.existsSync(path.join(off, '.sdd', 'git-hooks', 'pre-commit'))).toBe(true);

    const dry = gitRepo();
    await runInit({ targetDir: dry, overrides: { tools: ['claude-code'] }, interactive: false, dryRun: true, force: false, io: quietIo });
    expect(hooksPath(dry)).toBeUndefined();
  });
});

describe('activateGitHooks (CC-6)', () => {
  it('skips outside a git repository', async () => {
    const dir = tempDir();
    expect((await activateGitHooks(dir, undefined)).kind).toBe('skipped');
  });

  it.each(['.husky', 'lefthook.yml', '.lefthook.yml', 'lefthook.yaml', '.pre-commit-config.yaml'])(
    'refuses to clobber a hook manager (%s), naming it',
    async (marker) => {
      const dir = gitRepo();
      if (marker === '.husky') fs.mkdirSync(path.join(dir, marker));
      else fs.writeFileSync(path.join(dir, marker), '');
      const outcome = await activateGitHooks(dir, dir);
      expect(outcome.kind).toBe('skipped');
      expect(outcome.kind === 'skipped' && outcome.reason).toContain(marker);
      expect(hooksPath(dir)).toBeUndefined();
    },
  );

  it('never overrides a different core.hooksPath, and is idempotent for its own', async () => {
    const other = gitRepo();
    execFileSync('git', ['config', 'core.hooksPath', 'tools/hooks'], { cwd: other });
    expect((await activateGitHooks(other, other)).kind).toBe('skipped');
    expect(hooksPath(other)).toBe('tools/hooks');

    const ours = gitRepo();
    expect(await activateGitHooks(ours, ours)).toEqual({ kind: 'activated', hooksPath: '.sdd/git-hooks' });
    expect(await activateGitHooks(ours, ours)).toEqual({ kind: 'already-active', hooksPath: '.sdd/git-hooks' });
  });

  it('points at the install directory, relative to the repository root, for a subdirectory install', async () => {
    const repo = gitRepo();
    const install = path.join(repo, 'apps', 'api');
    fs.mkdirSync(install, { recursive: true });
    expect(await activateGitHooks(install, repo)).toEqual({ kind: 'activated', hooksPath: 'apps/api/.sdd/git-hooks' });
    expect(hooksPath(repo)).toBe('apps/api/.sdd/git-hooks');
  });
});
