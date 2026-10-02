/**
 * Spec: specs/streamlined-spec-artifacts
 * Covers: contract.md SA-18 (the `update` verb), SA-19 and SA-23 (known legacy
 * paths and their removal by `update` and `init --force`), SA-20 (report),
 * SA-21 (update equals init), SA-22 (safety refusals), SA-24 (idempotency),
 * SA-25 (untouched); the Error Handling Contract rows for `update`; intent.md
 * SC12-SC17; audit.md Test Coverage T9, T10, T11, T12, T13, T14, T15.
 *
 * Every test drives the real CLI in-process (`main`), the same style as
 * `tests/cli.test.ts`, against real temp directories and, where the contract
 * depends on git, real temp git repositories. Nothing touches the network.
 *
 * T9/T10 are asserted through `init --force` rather than a direct writer call:
 * the contract fixes the behavior and the exported constant, not the writer's
 * function names, so the observable removal rules are the stable surface.
 *
 * The report's exact wording is a contract suggestion (SA-20), so these tests
 * only rely on each path's line carrying its path and one status word
 * (`created`, `updated`, `unchanged`, `removed`), and dry-run lines saying `would`.
 *
 * Red-phase note: `update` is not registered yet, so every `update` test fails
 * on commander's unknown-command error (exit 1, not the contracted 0/2/3), and
 * the `init --force` removal tests fail because nothing deletes the legacy files.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertNoRepoAbove, makeGitRepoDir } from './helpers/git.js';

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function track(dir: string): Promise<string> {
  tempDirs.push(dir);
  return dir;
}

async function makeRepo(): Promise<string> {
  return track(await makeGitRepoDir('harny-update-'));
}

async function makePlainDir(): Promise<string> {
  const dir = await track(await fs.mkdtemp(path.join(os.tmpdir(), 'harny-update-plain-')));
  await assertNoRepoAbove(dir);
  return dir;
}

function git(dir: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

async function commitAll(dir: string): Promise<void> {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'snapshot');
}

async function captureOutput(fn: () => Promise<number>): Promise<{ code: number; text: string }> {
  const chunks: string[] = [];
  const record = (chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(record as any);
  vi.spyOn(process.stderr, 'write').mockImplementation(record as any);
  vi.spyOn(console, 'log').mockImplementation((...args) => void record(args.join(' ')));
  vi.spyOn(console, 'error').mockImplementation((...args) => void record(args.join(' ')));
  vi.spyOn(console, 'warn').mockImplementation((...args) => void record(args.join(' ')));
  try {
    const code = await fn();
    return { code, text: chunks.join('\n') };
  } finally {
    vi.restoreAllMocks();
  }
}

async function cli(args: string[]): Promise<{ code: number; text: string }> {
  const { main } = await import('../src/cli.js');
  return captureOutput(() => main(args) as Promise<number>);
}

async function initInstall(dir: string, extra: string[] = []): Promise<void> {
  const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks', ...extra]);
  expect(code, text).toBe(0);
}

/** Every regular file under `dir` (never `.git`), as relative POSIX path -> bytes. */
async function snapshot(dir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  async function walk(current: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) out.set(path.relative(dir, full).split(path.sep).join('/'), `-> ${await fs.readlink(full)}`);
      else if (entry.isDirectory()) await walk(full);
      else out.set(path.relative(dir, full).split(path.sep).join('/'), await fs.readFile(full, 'latin1'));
    }
  }
  await walk(dir);
  return out;
}

const LEGACY = ['.sdd/spec-schema/contract.md', '.sdd/spec-schema/roadmap.md'] as const;

/** A committed install in a git repo that looks like a pre-feature one: it holds the
 *  two legacy schema files, and `.sdd/spec-schema/intent.md` is stale. */
async function makeLegacyRepoInstall(): Promise<string> {
  const dir = await makeRepo();
  await initInstall(dir);
  for (const legacy of LEGACY) {
    await fs.writeFile(path.join(dir, legacy), `# legacy ${legacy}\n`, 'utf8');
  }
  await fs.appendFile(path.join(dir, '.claude', 'agents', 'sdd-architect.md'), '\nstale edit\n', 'utf8');
  await commitAll(dir);
  return dir;
}

function linesMentioning(text: string, needle: string): string[] {
  return text.split('\n').filter((line) => line.includes(needle));
}

describe('harny update equals a fresh init with the same config, plus the removals and a per-path report (SA-21, SA-20) (T11)', () => {
  it('produces byte-identical harness files to a fresh init and removes both legacy files', async () => {
    const dir = await makeLegacyRepoInstall();
    const fresh = await makeRepo();
    const freshInit = await cli(['init', fresh, '--yes', '--no-git-hooks', '--config', path.join(dir, '.sdd', 'harness.json')]);
    expect(freshInit.code, freshInit.text).toBe(0);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    expect(await snapshot(dir)).toEqual(await snapshot(fresh));
  });

  it('reports each path as created, updated, unchanged or removed', async () => {
    const dir = await makeLegacyRepoInstall();
    git(dir, 'rm', '-q', '.sdd/doctor/run-doctor.mjs');
    git(dir, '-c', 'user.name=t', 'commit', '-q', '-m', 'drop runner');

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    const statusOf = (p: string) => linesMentioning(text, p).join('\n');
    expect(statusOf('.claude/agents/sdd-architect.md')).toMatch(/\bupdated\b/);
    expect(statusOf('.sdd/doctor/run-doctor.mjs')).toMatch(/\bcreated\b/);
    expect(statusOf('.sdd/harness.json')).toMatch(/\bunchanged\b/);
    for (const legacy of LEGACY) {
      expect(statusOf(legacy), `no report line for ${legacy}`).toMatch(/\bremoved\b/);
    }
  });
});

describe('a second update is idempotent (SA-24) (T12)', () => {
  it('reports only unchanged paths, exits 0 and changes no bytes', async () => {
    const dir = await makeLegacyRepoInstall();
    expect((await cli(['update', dir])).code).toBe(0);
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    expect(await snapshot(dir)).toEqual(before);
    const reported = [...before.keys()].filter((p) => linesMentioning(text, p).length > 0);
    expect(reported.length, 'the report names no path').toBeGreaterThan(0);
    for (const p of reported) {
      const line = linesMentioning(text, p).join('\n');
      expect(line, p).toMatch(/\bunchanged\b/);
      expect(line, p).not.toMatch(/\b(created|updated|removed)\b/);
    }
    expect(text).not.toMatch(/\b[1-9]\d*\s+(created|updated|removed)\b/);
  });
});

describe('update --dry-run prints the plan and changes nothing (SA-22) (T13)', () => {
  it('leaves every byte in place, keeps the legacy files, and phrases the report as would-be', async () => {
    const dir = await makeLegacyRepoInstall();
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir, '--dry-run']);

    expect(code, text).toBe(0);
    expect(await snapshot(dir)).toEqual(before);
    expect(text).toMatch(/would/i);
    for (const legacy of LEGACY) {
      expect(linesMentioning(text, legacy).join('\n')).toMatch(/would[^\n]*removed/i);
    }
  });

  it('never refuses: on a dirty tracked tree it exits 0 and names the paths that would trigger a refusal', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.appendFile(path.join(dir, '.sdd', 'spec-schema', 'tasks.md'), 'dirty\n', 'utf8');

    const { code, text } = await cli(['update', dir, '--dry-run']);

    expect(code, text).toBe(0);
    expect(text).toContain('.sdd/spec-schema/tasks.md');
  });
});

describe('update refusals leave everything untouched (SA-22, error handling contract) (T14)', () => {
  it('exits 2 pointing at harny init when .sdd/harness.json is missing', async () => {
    const dir = await makeRepo();

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(2);
    expect(text).toMatch(/harny init/);
    expect([...(await snapshot(dir)).keys()]).toEqual([]);
  });

  it('exits 2 and writes nothing when .sdd/harness.json is not valid', async () => {
    const dir = await makeRepo();
    await fs.mkdir(path.join(dir, '.sdd'), { recursive: true });
    await fs.writeFile(path.join(dir, '.sdd', 'harness.json'), '{ not json', 'utf8');

    const { code } = await cli(['update', dir]);

    expect(code).toBe(2);
    expect([...(await snapshot(dir)).keys()]).toEqual(['.sdd/harness.json']);
  });

  it.each([
    ['an unstaged change', false],
    ['a staged change', true],
  ])('exits 3 naming the path and changes nothing when a path it would update has %s', async (_label, staged) => {
    const dir = await makeLegacyRepoInstall();
    await fs.appendFile(path.join(dir, '.sdd', 'spec-schema', 'tasks.md'), 'local edit\n', 'utf8');
    if (staged) git(dir, 'add', '.sdd/spec-schema/tasks.md');
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(3);
    expect(text).toContain('.sdd/spec-schema/tasks.md');
    expect(await snapshot(dir)).toEqual(before);
  });

  it('exits 3 when a legacy file it would remove has uncommitted changes', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.appendFile(path.join(dir, LEGACY[0]), 'my notes\n', 'utf8');
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(3);
    expect(text).toContain(LEGACY[0]);
    expect(await snapshot(dir)).toEqual(before);
  });

  it('does not block on a dirty tracked file it would not change', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.writeFile(path.join(dir, 'unrelated.md'), 'v1\n', 'utf8');
    await commitAll(dir);
    await fs.writeFile(path.join(dir, 'unrelated.md'), 'v2\n', 'utf8');

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    expect(await fs.readFile(path.join(dir, 'unrelated.md'), 'utf8')).toBe('v2\n');
  });

  it('never blocks on an untracked generated file, and overwrites it', async () => {
    const dir = await makeLegacyRepoInstall();
    const file = path.join(dir, '.sdd', 'spec-schema', 'tasks.md');
    const generated = await fs.readFile(file, 'utf8');
    git(dir, 'rm', '-q', '--cached', '.sdd/spec-schema/tasks.md');
    git(dir, '-c', 'user.name=t', 'commit', '-q', '-m', 'untrack');
    await fs.writeFile(file, 'hand-edited untracked\n', 'utf8');

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    expect(await fs.readFile(file, 'utf8')).toBe(generated);
  });

  it('exits 3 and changes nothing outside a git repo without --force, and proceeds with --force', async () => {
    const dir = await makePlainDir();
    await initInstall(dir);
    await fs.writeFile(path.join(dir, LEGACY[0]), '# legacy\n', 'utf8');
    const before = await snapshot(dir);

    const refused = await cli(['update', dir]);

    expect(refused.code, refused.text).toBe(3);
    expect(await snapshot(dir)).toEqual(before);

    const forced = await cli(['update', dir, '--force']);

    expect(forced.code, forced.text).toBe(0);
    await expect(fs.access(path.join(dir, LEGACY[0]))).rejects.toThrow();
  });

  it('--force proceeds past a dirty tracked path and overwrites it', async () => {
    const dir = await makeLegacyRepoInstall();
    const file = path.join(dir, '.sdd', 'spec-schema', 'tasks.md');
    const generated = await fs.readFile(file, 'utf8');
    await fs.appendFile(file, 'local edit\n', 'utf8');

    const { code, text } = await cli(['update', dir, '--force']);

    expect(code, text).toBe(0);
    expect(await fs.readFile(file, 'utf8')).toBe(generated);
  });
});

describe('update refuses on dirty tracked files reached through a symlinked directory (SA-22, SC16) (F1)', () => {
  /** Mirrors this repo's dogfood layout: `.claude/skills/harny-*` are symlinks to real
   *  `.agents/skills/harny-*` directories, committed. */
  async function makeSymlinkedSkillsRepo(): Promise<{ dir: string; real: string }> {
    const dir = await makeRepo();
    await initInstall(dir);
    const skillsDir = path.join(dir, '.claude', 'skills');
    await fs.mkdir(path.join(dir, '.agents', 'skills'), { recursive: true });
    for (const name of await fs.readdir(skillsDir)) {
      if (!name.startsWith('harny-')) continue;
      await fs.rename(path.join(skillsDir, name), path.join(dir, '.agents', 'skills', name));
      await fs.symlink(path.join('..', '..', '.agents', 'skills', name), path.join(skillsDir, name));
    }
    await commitAll(dir);
    return { dir, real: path.join(dir, '.agents', 'skills', 'harny-test', 'SKILL.md') };
  }

  it.each([
    ['an unstaged edit', false],
    ['a staged edit', true],
  ])('exits 3 and changes nothing when the real file behind a symlinked path has %s', async (_label, staged) => {
    const { dir, real } = await makeSymlinkedSkillsRepo();
    await fs.appendFile(real, 'LOCAL EDIT\n', 'utf8');
    if (staged) git(dir, 'add', '.agents/skills/harny-test/SKILL.md');
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(3);
    expect(await snapshot(dir)).toEqual(before);
    expect(await fs.readFile(real, 'utf8')).toContain('LOCAL EDIT');
  });

  it('--force proceeds and overwrites the edited file', async () => {
    const { dir, real } = await makeSymlinkedSkillsRepo();
    await fs.appendFile(real, 'LOCAL EDIT\n', 'utf8');

    const { code, text } = await cli(['update', dir, '--force']);

    expect(code, text).toBe(0);
    expect(await fs.readFile(real, 'utf8')).not.toContain('LOCAL EDIT');
  });
});

describe('update fails closed when git cannot answer inside a repo (SA-22, SC16) (F2)', () => {
  const realPath = process.env.PATH;

  afterEach(() => {
    process.env.PATH = realPath;
  });

  /** A repo with a dirty tracked generated file, and a PATH whose `git` behaves normally
   *  except that `git status` exits non-zero. */
  async function makeDirtyRepoWithFailingStatus(): Promise<{ dir: string; file: string }> {
    const dir = await makeLegacyRepoInstall();
    const file = path.join(dir, '.sdd', 'spec-schema', 'tasks.md');
    await fs.appendFile(file, 'local edit\n', 'utf8');
    const bin = await track(await fs.mkdtemp(path.join(os.tmpdir(), 'harny-fakegit-')));
    const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
    await fs.writeFile(
      path.join(bin, 'git'),
      `#!/bin/sh\nfor a in "$@"; do if [ "$a" = status ]; then echo "fatal: simulated failure" >&2; exit 128; fi; done\nexec "${realGit}" "$@"\n`,
      { mode: 0o755 },
    );
    process.env.PATH = `${bin}${path.delimiter}${realPath}`;
    return { dir, file };
  }

  it('exits 3 and writes nothing without --force', async () => {
    const { dir } = await makeDirtyRepoWithFailingStatus();
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(3);
    expect(await snapshot(dir)).toEqual(before);
  });

  it('proceeds with --force', async () => {
    const { dir, file } = await makeDirtyRepoWithFailingStatus();

    const { code, text } = await cli(['update', dir, '--force']);

    expect(code, text).toBe(0);
    expect(await fs.readFile(file, 'utf8')).not.toContain('local edit');
  });

  it('--dry-run never refuses and changes nothing', async () => {
    const { dir } = await makeDirtyRepoWithFailingStatus();
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir, '--dry-run']);

    expect(code, text).toBe(0);
    expect(await snapshot(dir)).toEqual(before);
  });
});

describe('update never touches specs/ or core.hooksPath (SA-25, SA-16) (T15)', () => {
  it('leaves a specs tree, including legacy-named files, byte-identical, and harness.json bytes unchanged', async () => {
    const dir = await makeLegacyRepoInstall();
    for (const [file, body] of Object.entries({
      'specs/live/intent.md': '# i\n',
      'specs/live/contract.md': '# c\n',
      'specs/live/roadmap.md': '# r\n',
      'specs/archived/old/contract.md': '# old\n',
    })) {
      await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await fs.writeFile(path.join(dir, file), body, 'utf8');
    }
    await commitAll(dir);
    const before = await snapshot(dir);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    const after = await snapshot(dir);
    for (const [file, bytes] of before) {
      if (file.startsWith('specs/') || file === '.sdd/harness.json') {
        expect(after.get(file), file).toBe(bytes);
      }
    }
  });

  it.each([
    ['a custom hooks path', '.custom-hooks'],
    ['no hooks path', undefined],
  ])('leaves core.hooksPath as it was (%s)', async (_label, hooksPath) => {
    const dir = await makeLegacyRepoInstall();
    if (hooksPath) git(dir, 'config', 'core.hooksPath', hooksPath);

    const { code, text } = await cli(['update', dir]);

    expect(code, text).toBe(0);
    let actual: string | undefined;
    try {
      actual = git(dir, 'config', '--get', 'core.hooksPath').trim();
    } catch {
      actual = undefined;
    }
    expect(actual).toBe(hooksPath);
  });
});

describe('init --force removes only the known legacy schema files (SA-19, SA-23) (T9, T10)', () => {
  it('removes both legacy files, reports them, and keeps unrelated files', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.writeFile(path.join(dir, '.sdd', 'spec-schema', 'custom-notes.md'), 'mine\n', 'utf8');
    await fs.mkdir(path.join(dir, 'specs', 'live'), { recursive: true });
    await fs.writeFile(path.join(dir, 'specs', 'live', 'contract.md'), '# keep\n', 'utf8');

    const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks', '--force']);

    expect(code, text).toBe(0);
    for (const legacy of LEGACY) {
      await expect(fs.access(path.join(dir, legacy)), legacy).rejects.toThrow();
      expect(linesMentioning(text, legacy).join('\n')).toMatch(/\bremoved\b/);
    }
    expect(await fs.readFile(path.join(dir, '.sdd', 'spec-schema', 'custom-notes.md'), 'utf8')).toBe('mine\n');
    expect(await fs.readFile(path.join(dir, 'specs', 'live', 'contract.md'), 'utf8')).toBe('# keep\n');
  });

  it('removes them despite uncommitted changes in a git repo (init --force has no dirty check)', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.appendFile(path.join(dir, LEGACY[0]), 'uncommitted\n', 'utf8');
    await fs.appendFile(path.join(dir, '.sdd', 'spec-schema', 'tasks.md'), 'uncommitted\n', 'utf8');

    const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks', '--force']);

    expect(code, text).toBe(0);
    await expect(fs.access(path.join(dir, LEGACY[0]))).rejects.toThrow();
  });

  it('keeps the legacy files when the CONFLICT refusal stops a run without --force', async () => {
    const dir = await makeLegacyRepoInstall();

    const { code } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks']);

    expect(code).toBe(3);
    for (const legacy of LEGACY) {
      await expect(fs.access(path.join(dir, legacy)), legacy).resolves.toBeUndefined();
    }
  });

  it('does not mention the legacy files on a fresh init where they are absent', async () => {
    const dir = await makeRepo();

    const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks']);

    expect(code, text).toBe(0);
    for (const legacy of LEGACY) expect(text).not.toContain(legacy);
  });

  it('skips a legacy path that is a directory, warning, and still removes the regular one', async () => {
    const dir = await makeLegacyRepoInstall();
    await fs.rm(path.join(dir, LEGACY[0]));
    await fs.mkdir(path.join(dir, LEGACY[0]));
    await fs.writeFile(path.join(dir, LEGACY[0], 'keep.txt'), 'kept\n', 'utf8');

    const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks', '--force']);

    expect(code, text).toBe(0);
    expect(await fs.readFile(path.join(dir, LEGACY[0], 'keep.txt'), 'utf8')).toBe('kept\n');
    expect(text).toContain(LEGACY[0]);
    await expect(fs.access(path.join(dir, LEGACY[1]))).rejects.toThrow();
  });

  it('skips a legacy path that is a symlink and never deletes what it points at', async () => {
    const dir = await makeLegacyRepoInstall();
    const outside = await track(await fs.mkdtemp(path.join(os.tmpdir(), 'harny-outside-')));
    const target = path.join(outside, 'precious.md');
    await fs.writeFile(target, 'precious\n', 'utf8');
    await fs.rm(path.join(dir, LEGACY[0]));
    await fs.symlink(target, path.join(dir, LEGACY[0]));

    const { code, text } = await cli(['init', dir, '--yes', '--tools', 'claude-code', '--no-git-hooks', '--force']);

    expect(code, text).toBe(0);
    expect(await fs.readFile(target, 'utf8')).toBe('precious\n');
    expect((await fs.lstat(path.join(dir, LEGACY[0]))).isSymbolicLink()).toBe(true);
  });
});
