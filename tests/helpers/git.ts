/**
 * Shared git-repository fixture helpers for specs/ci-workflow-root's test suite.
 * Not part of `src/` — test-only plumbing, exempt from the "no canonical prose in
 * src/" constraint, exactly like `tests/helpers/paths.ts`.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Creates a fresh temp directory that is a real git repository — a `.git`
 *  DIRECTORY, the ordinary `git clone`/`git init` shape (CW-2's first case). */
export async function makeGitRepoDir(prefix = 'harny-git-repo-'): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

/** Creates a fresh temp directory whose `.git` entry is a FILE, not a directory —
 *  the shape a `git worktree` checkout or a submodule uses. `findRepoRoot` detects
 *  a `.git` entry by presence, never by type (CW-2), so it never reads this file's
 *  content — a syntactically-plausible `gitdir:` pointer is enough to exercise
 *  that rule without needing a second, real linked worktree. */
export async function makeGitFileRepoDir(prefix = 'harny-git-file-repo-'): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.writeFile(path.join(dir, '.git'), 'gitdir: /nonexistent/elsewhere/.git\n', 'utf8');
  return dir;
}

/**
 * Walks upward from `dir` to the filesystem root, asserting that NO `.git` entry
 * (file or directory) exists anywhere in that ancestry, `dir` included. A "no
 * repository above" fixture must prove this precondition itself rather than
 * assume it (roadmap.md Phase 4 step 3 / its own risk-table row): a temp
 * directory whose ancestry happens to already contain a `.git` (e.g. a CI runner
 * that checks this very repo out under a `.git`-bearing temp root) would
 * otherwise make a "no repository" test pass for the wrong reason. Throws,
 * naming the offending path, rather than silently tolerating that case.
 */
export async function assertNoRepoAbove(dir: string): Promise<void> {
  let current = path.resolve(dir);
  for (;;) {
    const gitEntry = path.join(current, '.git');
    let found = true;
    try {
      await fs.lstat(gitEntry);
    } catch {
      found = false;
    }
    if (found) {
      throw new Error(
        `Test precondition violated: found a .git entry at "${gitEntry}", so a fixture at ` +
          `"${dir}" asserting "no repository above" does not hold in this environment.`,
      );
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return; // Reached the filesystem root without finding a .git entry.
    }
    current = parent;
  }
}
