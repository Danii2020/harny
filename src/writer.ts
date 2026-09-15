/**
 * Write planning, conflict detection, path containment, and application.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { HarnessError } from './errors.js';
import type { GeneratedFile } from './generators/types.js';

export interface WritePlan {
  readonly targetDir: string;
  readonly files: readonly GeneratedFile[];
  /** Relative paths that already exist on disk. */
  readonly conflicts: readonly string[];
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

export async function planWrites(
  files: readonly GeneratedFile[],
  targetDir: string,
): Promise<WritePlan> {
  const conflicts: string[] = [];
  for (const file of files) {
    assertContained(file.path, targetDir);
    // (NEW — context7-mcp, MC-7.) A merge-marked file's `contents` were already
    // computed by extending whatever was on disk at this path, so a pre-existing
    // file there is never a conflict — it is the input the merge already
    // accounted for. Every other path keeps today's behavior exactly.
    if (file.merge) continue;
    const absolute = path.join(targetDir, file.path);
    try {
      await fs.access(absolute);
      conflicts.push(file.path);
    } catch {
      // Does not exist on disk: no conflict.
    }
  }
  return { targetDir, files, conflicts };
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
    const absolute = path.join(plan.targetDir, file.path);
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
        `Filesystem error while writing "${file.path}": ${reason}. ` +
          `${written.length} file(s) already written before the failure: ` +
          `${written.length > 0 ? written.join(', ') : '(none)'}.`,
      );
      (disclosure as Error & { cause?: unknown }).cause = err;
      throw disclosure;
    }
    written.push(file.path);
  }
  return written;
}
