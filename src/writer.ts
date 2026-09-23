/**
 * Write planning, conflict detection, path containment, and application.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { HarnessError } from './errors.js';
import type { GeneratedFile } from './generators/types.js';

export interface WritePlan {
  readonly targetDir: string;
  /** **(NEW — ci-workflow-root.)** Absolute path of the enclosing repository root, or
   *  `targetDir` when the install directory is the root or is not in a repository at
   *  all. Every file that declares the non-default root resolves against this. */
  readonly repoRoot: string;
  readonly files: readonly GeneratedFile[];
  /** Paths that already exist on disk, as display paths (WR-7). */
  readonly conflicts: readonly string[];
}

/** The absolute directory a file's `path` is relative to. Total over `GeneratedFile`:
 *  the non-default root selects `repoRoot`, absent selects `targetDir`. */
export function resolveWriteRoot(
  file: GeneratedFile,
  targetDir: string,
  repoRoot: string,
): string {
  return file.root === 'repo' ? repoRoot : targetDir;
}

/** A file's path as a reader should see it: POSIX, relative to `targetDir`. Identical
 *  to `file.path` for every target-rooted file (so today's reporting is unchanged);
 *  `../`-prefixed for a repo-rooted file in a subdirectory install (WR-7). */
export function displayPath(file: GeneratedFile, targetDir: string, repoRoot: string): string {
  const root = resolveWriteRoot(file, targetDir, repoRoot);
  if (root === targetDir) {
    return file.path;
  }
  const absolute = path.join(root, file.path);
  const relative = path.relative(targetDir, absolute);
  return relative.split(path.sep).join('/');
}

/** Throws if `repoRoot` is neither `targetDir` nor an ancestor of it. A generated file
 *  may escape UPWARD along the install directory's own ancestry and nowhere else:
 *  never to a sibling, never to an unrelated absolute path, never below `targetDir`
 *  via a root that is a descendant. Like `assertContained`, this is a generator bug,
 *  not a user-facing `HarnessError` (`AGENTS.md` S2). */
function assertRepoRootPermitted(repoRoot: string, targetDir: string): void {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedTargetDir = path.resolve(targetDir);
  if (resolvedRepoRoot === resolvedTargetDir) {
    return;
  }
  const relative = path.relative(resolvedRepoRoot, resolvedTargetDir);
  const isProperAncestor =
    relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
  if (!isProperAncestor) {
    throw new Error(
      `Generated file declares root "repo" pointing at "${resolvedRepoRoot}", which is neither ` +
        `the install directory "${resolvedTargetDir}" nor a proper ancestor of it.`,
    );
  }
}

/** Throws if a generated path is absolute or escapes `targetDir` after
 *  normalization. This is treated as a generator bug (Error Handling
 *  Contract: "Treated as a generator bug"), not a user-facing HarnessError. */
export function assertContained(relativePath: string, targetDir: string): void {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Generated path "${relativePath}" must be relative, not absolute.`);
  }
  const resolvedTarget = path.resolve(targetDir);
  const resolvedPath = path.resolve(resolvedTarget, relativePath);
  const relative = path.relative(resolvedTarget, resolvedPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Generated path "${relativePath}" escapes the target directory "${targetDir}".`);
  }
}

/** **(MODIFIED — ci-workflow-root.)** `repoRoot` defaults to `targetDir`, so every
 *  existing caller and test keeps its exact behavior without edit. */
export async function planWrites(
  files: readonly GeneratedFile[],
  targetDir: string,
  repoRoot: string = targetDir,
): Promise<WritePlan> {
  const conflicts: string[] = [];
  for (const file of files) {
    const root = resolveWriteRoot(file, targetDir, repoRoot);
    if (file.root === 'repo') {
      assertRepoRootPermitted(repoRoot, targetDir);
    }
    assertContained(file.path, root);
    // (NEW — context7-mcp, MC-7.) A merge-marked file's `contents` were already
    // computed by extending whatever was on disk at this path, so a pre-existing
    // file there is never a conflict — it is the input the merge already
    // accounted for. Every other path keeps today's behavior exactly.
    if (file.merge) continue;
    const absolute = path.join(root, file.path);
    try {
      await fs.access(absolute);
      conflicts.push(displayPath(file, targetDir, repoRoot));
    } catch {
      // Does not exist on disk: no conflict.
    }
  }
  return { targetDir, repoRoot, files, conflicts };
}

/** Writes every file, creating parent directories. Throws HarnessError('CONFLICT')
 *  before writing anything when `plan.conflicts` is non-empty and `force` is false. */
export async function applyWrites(
  plan: WritePlan,
  options: { readonly force: boolean },
): Promise<readonly string[]> {
  if (!options.force && plan.conflicts.length > 0) {
    throw new HarnessError(
      'CONFLICT',
      `Refusing to overwrite ${plan.conflicts.length} existing file(s). Re-run with --force to overwrite.`,
      plan.conflicts,
    );
  }

  const written: string[] = [];
  for (const file of plan.files) {
    const root = resolveWriteRoot(file, plan.targetDir, plan.repoRoot);
    const absolute = path.join(root, file.path);
    const display = displayPath(file, plan.targetDir, plan.repoRoot);
    try {
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, file.contents, 'utf8');
    } catch (err) {
      // Partial state must be disclosed, never hidden: report which paths were
      // already written before the failure, then re-throw so `main` still exits
      // 1. This is deliberately a plain Error (not a HarnessError) — a mid-write
      // filesystem failure is unexpected, not a HarnessErrorCode-shaped condition.
      const reason = err instanceof Error ? err.message : String(err);
      const disclosure = new Error(
        `Filesystem error while writing "${display}": ${reason}. ` +
          `${written.length} file(s) already written before the failure: ` +
          `${written.length > 0 ? written.join(', ') : '(none)'}.`,
      );
      (disclosure as Error & { cause?: unknown }).cause = err;
      throw disclosure;
    }
    written.push(display);
  }
  return written;
}
