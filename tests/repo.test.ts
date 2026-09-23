/**
 * Spec: specs/ci-workflow-root
 * Covers: contract.md "Public API — src/repo.ts" (`InstallLocation`,
 * `GIT_ENTRY_NAME`, `findRepoRoot`, `resolveInstallLocation`, `componentSlug`,
 * `ciWorkflowPathFor`, `ciWorkflowPathFromInstallDir`); Behavior Guarantees
 * CW-1, CW-2, CW-3, CW-4, CW-5; intent.md SC1, SC3, SC4; audit.md Test Coverage
 * T1-T7.
 *
 * `src/repo.ts` does not exist yet at red time, so every test below is expected
 * to fail on module resolution ("Cannot find module '../src/repo.js'"), not on
 * a wrong assumption about the module's shape.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertNoRepoAbove, makeGitFileRepoDir, makeGitRepoDir } from './helpers/git.js';

const tempDirs: string[] = [];

async function makeTempDir(prefix = 'harny-repo-test-'): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('GIT_ENTRY_NAME', () => {
  it('is the literal ".git"', async () => {
    const { GIT_ENTRY_NAME } = await import('../src/repo.js');
    expect(GIT_ENTRY_NAME).toBe('.git');
  });
});

describe('findRepoRoot — the upward walk (CW-2) (T1)', () => {
  it('finds a .git DIRECTORY at the start directory itself', async () => {
    const { findRepoRoot } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);

    expect(await findRepoRoot(repoDir)).toBe(path.resolve(repoDir));
  });

  it('finds a .git DIRECTORY at an ancestor, from a nested subdirectory', async () => {
    const { findRepoRoot } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);
    const nested = path.join(repoDir, 'apps', 'web', 'src');
    await fs.mkdir(nested, { recursive: true });

    expect(await findRepoRoot(nested)).toBe(path.resolve(repoDir));
  });
});

describe('findRepoRoot — a .git FILE counts too (CW-2, worktree/submodule shape) (T2)', () => {
  it('finds a .git FILE at the start directory', async () => {
    const { findRepoRoot } = await import('../src/repo.js');
    const repoDir = await makeGitFileRepoDir();
    tempDirs.push(repoDir);

    expect(await findRepoRoot(repoDir)).toBe(path.resolve(repoDir));
  });

  it('finds a .git FILE at an ancestor, from a nested subdirectory', async () => {
    const { findRepoRoot } = await import('../src/repo.js');
    const repoDir = await makeGitFileRepoDir();
    tempDirs.push(repoDir);
    const nested = path.join(repoDir, 'packages', 'ui');
    await fs.mkdir(nested, { recursive: true });

    expect(await findRepoRoot(nested)).toBe(path.resolve(repoDir));
  });
});

describe('findRepoRoot / resolveInstallLocation — no repository above is a normal outcome (CW-3) (T3)', () => {
  it('findRepoRoot returns undefined, never throws, when no .git entry exists anywhere above', async () => {
    const { findRepoRoot } = await import('../src/repo.js');
    const dir = await makeTempDir();
    await assertNoRepoAbove(dir);

    await expect(findRepoRoot(dir)).resolves.toBeUndefined();
  });

  it('resolveInstallLocation returns the degenerate root: insideRepo false, repoRoot === targetDir, prefix ""', async () => {
    const { resolveInstallLocation } = await import('../src/repo.js');
    const dir = await makeTempDir();
    await assertNoRepoAbove(dir);

    const location = await resolveInstallLocation(dir);

    expect(location.insideRepo).toBe(false);
    expect(location.repoRoot).toBe(path.resolve(dir));
    expect(location.targetDir).toBe(path.resolve(dir));
    expect(location.prefix).toBe('');
  });
});

describe('resolveInstallLocation — prefix derivation is POSIX and total (CW-1) (T4)', () => {
  it('is total (never throws) for an existing directory', async () => {
    const { resolveInstallLocation } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);

    await expect(resolveInstallLocation(repoDir)).resolves.toBeDefined();
  });

  it('a root install (targetDir IS the repo root) has prefix "" and insideRepo true', async () => {
    const { resolveInstallLocation } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);

    const location = await resolveInstallLocation(repoDir);

    expect(location.insideRepo).toBe(true);
    expect(location.prefix).toBe('');
    expect(location.repoRoot).toBe(path.resolve(repoDir));
    expect(location.targetDir).toBe(path.resolve(repoDir));
  });

  it('a one-segment subdirectory install yields a POSIX prefix with no leading "./" and no trailing "/"', async () => {
    const { resolveInstallLocation } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);
    const installDir = path.join(repoDir, 'web');
    await fs.mkdir(installDir, { recursive: true });

    const location = await resolveInstallLocation(installDir);

    expect(location.insideRepo).toBe(true);
    expect(location.prefix).toBe('web');
    expect(location.prefix.startsWith('./')).toBe(false);
    expect(location.prefix.endsWith('/')).toBe(false);
  });

  it('a multi-segment subdirectory install yields a "/"-joined POSIX prefix with no ".." segment', async () => {
    const { resolveInstallLocation } = await import('../src/repo.js');
    const repoDir = await makeGitRepoDir();
    tempDirs.push(repoDir);
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });

    const location = await resolveInstallLocation(installDir);

    expect(location.prefix).toBe('apps/web');
    expect(location.prefix.split('/')).not.toContain('..');
  });
});

describe('componentSlug — the five-step rule (CW-5) (T5)', () => {
  it.each([
    ['apps/web', 'apps-web'],
    ['packages/@scope/ui', 'packages-scope-ui'],
    ['services/api_v2', 'services-api-v2'],
    ['A/B', 'a-b'],
    // All-punctuation collapses to empty after steps 1-4, so step 5's fallback applies.
    ['!!!---...', 'install'],
    ['', 'install'],
  ] as const)('componentSlug(%j) === %j', async (input, expected) => {
    const { componentSlug } = await import('../src/repo.js');
    expect(componentSlug(input)).toBe(expected);
  });

  it('is pure and deterministic: the same input always yields the same output', async () => {
    const { componentSlug } = await import('../src/repo.js');
    const first = componentSlug('apps/web');
    const second = componentSlug('apps/web');
    expect(first).toBe(second);
  });
});

describe('ciWorkflowPathFor — derived from CI_WORKFLOW_PATH, never re-typed (CW-4, AGENTS.md S5) (T6)', () => {
  it('returns CI_WORKFLOW_PATH itself, byte-for-byte, for an empty prefix', async () => {
    const { ciWorkflowPathFor } = await import('../src/repo.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');

    expect(ciWorkflowPathFor('')).toBe(CI_WORKFLOW_PATH);
  });

  it('splices "-<slug>" before the extension for a non-empty prefix', async () => {
    const { ciWorkflowPathFor } = await import('../src/repo.js');

    expect(ciWorkflowPathFor('apps/web')).toBe('.github/workflows/harny-feedback-apps-web.yml');
    expect(ciWorkflowPathFor('services/api_v2')).toBe('.github/workflows/harny-feedback-services-api-v2.yml');
  });
});

describe('ciWorkflowPathFromInstallDir — the same file, relative to the install directory (T7)', () => {
  it('returns CI_WORKFLOW_PATH unchanged for an empty prefix', async () => {
    const { ciWorkflowPathFromInstallDir } = await import('../src/repo.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');

    expect(ciWorkflowPathFromInstallDir('')).toBe(CI_WORKFLOW_PATH);
  });

  it('climbs one "../" per prefix segment, then the repo-relative path', async () => {
    const { ciWorkflowPathFromInstallDir } = await import('../src/repo.js');

    expect(ciWorkflowPathFromInstallDir('web')).toBe('../.github/workflows/harny-feedback-web.yml');
    expect(ciWorkflowPathFromInstallDir('apps/web')).toBe('../../.github/workflows/harny-feedback-apps-web.yml');
  });
});
