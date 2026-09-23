/**
 * Repository-root discovery (contract.md "Public API — src/repo.ts", G1, G3).
 * The first git-aware module in `src/`. It answers exactly two questions —
 * *where is the repository root?* and *what is this install's workflow
 * called?* — and does nothing else. Its position in the strictly-downward
 * import order is: `cli.ts` -> `init.ts` -> `doctor.ts` -> `engine.ts` ->
 * `repo.ts` -> `feedback.ts`. Nothing imports it back (CLI-11).
 *
 * Deliberately a filesystem walk, never a `git` subprocess: no dependency on
 * git being installed or on PATH, no locale- or config-dependent output to
 * parse, and the same answer in a container that carries the checkout but not
 * the tool (ADR 0033). Nothing here reads the clock, the environment, or the
 * network, or spawns a process — it reads the filesystem and manipulates
 * strings, which is the whole budget (CW-11).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CI_WORKFLOW_PATH } from './feedback.js';

/**
 * Where an install directory sits inside its enclosing git repository — the one fact
 * that decides where the CI workflow goes, because GitHub reads
 * `.github/workflows/` only at a repository root.
 */
export interface InstallLocation {
  /** Absolute, resolved path of the install directory (`runInit`'s `targetDir`). */
  readonly targetDir: string;
  /** Absolute, resolved path of the enclosing repository root. Equal to `targetDir`
   *  when `insideRepo` is false — the degenerate root, so every consumer can treat
   *  the no-repository case as "the install directory is the root" without
   *  branching. */
  readonly repoRoot: string;
  /** POSIX path from `repoRoot` to `targetDir`. Empty string when the install
   *  directory IS the repository root, and empty string when `insideRepo` is false. */
  readonly prefix: string;
  /** Whether a `.git` entry was found at `targetDir` or above it. */
  readonly insideRepo: boolean;
}

/** The entry whose presence marks a repository root. A directory in a normal clone;
 *  a FILE in a worktree or submodule checkout — both count (CW-2). */
export const GIT_ENTRY_NAME = '.git';

/**
 * Walks upward from `startDir` looking for a `.git` entry of any type, stopping at the
 * filesystem root. Returns the first directory that has one, or `undefined`.
 *
 * Deliberately a filesystem walk, not `git rev-parse --show-toplevel`: no dependency
 * on git being installed or on PATH, no subprocess, no locale- or config-dependent
 * output to parse, and the same answer in a container that carries the checkout but
 * not the tool (ADR 0033). An entry that exists but cannot be stat'ed (permissions) is
 * treated as absent and the walk continues upward.
 */
export async function findRepoRoot(startDir: string): Promise<string | undefined> {
  let current = path.resolve(startDir);
  for (;;) {
    const gitEntry = path.join(current, GIT_ENTRY_NAME);
    try {
      await fs.lstat(gitEntry);
      return current;
    } catch {
      // Absent, or unstattable (permissions) — treated the same: keep walking up.
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined; // Reached the filesystem root without finding a .git entry.
    }
    current = parent;
  }
}

/** `findRepoRoot` plus the derived prefix, packaged as the one value every consumer
 *  passes around. Never throws for a missing repository; that is `insideRepo: false`. */
export async function resolveInstallLocation(targetDir: string): Promise<InstallLocation> {
  const resolvedTargetDir = path.resolve(targetDir);
  const found = await findRepoRoot(resolvedTargetDir);
  if (found === undefined) {
    return {
      targetDir: resolvedTargetDir,
      repoRoot: resolvedTargetDir,
      prefix: '',
      insideRepo: false,
    };
  }
  const relative = path.relative(found, resolvedTargetDir);
  const prefix = relative === '' ? '' : relative.split(path.sep).join('/');
  return {
    targetDir: resolvedTargetDir,
    repoRoot: found,
    prefix,
    insideRepo: true,
  };
}

/**
 * Turns an install prefix into the file-name fragment that distinguishes one install's
 * workflow from another's, by a fixed five-step rule (CW-5):
 *   1. lower-case;
 *   2. replace every character outside `[a-z0-9]` with `-`;
 *   3. collapse runs of `-` to one;
 *   4. trim leading and trailing `-`;
 *   5. if the result is empty, return `'install'`.
 * Pure, synchronous, total, and deterministic. `'apps/web'` -> `'apps-web'`;
 * `'packages/@scope/ui'` -> `'packages-scope-ui'`; `'services/api_v2'` ->
 * `'services-api-v2'`.
 */
export function componentSlug(prefix: string): string {
  const slug = prefix
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? 'install' : slug;
}

/**
 * The workflow's path, POSIX, **relative to the repository root**.
 *
 * `ciWorkflowPathFor('')` returns `CI_WORKFLOW_PATH` itself, byte-for-byte (CW-4) —
 * the value is re-used, never re-typed (`AGENTS.md` S5). A non-empty prefix splices
 * `-<slug>` before the extension of that same constant, so the directory, the base
 * name, and the extension all continue to have exactly one home in `src/feedback.ts`.
 */
export function ciWorkflowPathFor(prefix: string): string {
  if (prefix === '') {
    return CI_WORKFLOW_PATH;
  }
  const dir = path.posix.dirname(CI_WORKFLOW_PATH);
  const ext = path.posix.extname(CI_WORKFLOW_PATH);
  const base = path.posix.basename(CI_WORKFLOW_PATH, ext);
  return `${dir}/${base}-${componentSlug(prefix)}${ext}`;
}

/**
 * The same file, expressed **relative to the install directory** — what the readiness
 * check needs, because `run-doctor.mjs` resolves every `anyOf` entry against the
 * directory it runs in. `''` yields `CI_WORKFLOW_PATH` unchanged; `'apps/web'` yields
 * `'../../.github/workflows/harny-feedback-apps-web.yml'`.
 */
export function ciWorkflowPathFromInstallDir(prefix: string): string {
  if (prefix === '') {
    return CI_WORKFLOW_PATH;
  }
  const depth = prefix.split('/').length;
  const climb = '../'.repeat(depth);
  return `${climb}${ciWorkflowPathFor(prefix)}`;
}
