/**
 * Commit checks (specs/commit-checks): the single owner of the git-hooks install
 * paths, the files that ship there, and the one consented side effect that makes
 * them active — `core.hooksPath` on the enclosing repository (CC-1, CC-6, S5).
 *
 * Tool-neutral by construction: git hooks run for every agent and every person, so
 * nothing here, and no generator, knows which coding tool is in use.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { CommandsPayload, HarnessPayload } from './engine.js';
import { renderJson } from './generators/json.js';
import type { GeneratedFile } from './generators/types.js';

const execFileAsync = promisify(execFile);

/** Where the hooks are installed, relative to the install directory. */
export const GIT_HOOKS_DIR = '.sdd/git-hooks';
/** The resolved feedback commands the `pre-commit` hook lints staged files with. */
export const GIT_HOOKS_COMMANDS_PATH = `${GIT_HOOKS_DIR}/commands.json`;

/** Repository-root markers of hook managers whose setup activation must not clobber. */
const HOOK_MANAGER_MARKERS = ['.husky', 'lefthook.yml', '.lefthook.yml', 'lefthook.yaml', '.pre-commit-config.yaml'];

/** The two executable shims, the runner and the commands file, exactly once per run
 *  (CC-1). `[]` when the loaded templates root carries no git-hooks subsystem (lean
 *  test fixtures) — never for the real, packaged templates root. */
export function buildGitHooksFiles(payload: HarnessPayload, commands: CommandsPayload): readonly GeneratedFile[] {
  const { gitHooksPreCommit, gitHooksPrePush, gitHooksRunner } = payload;
  if (!gitHooksPreCommit || !gitHooksPrePush || !gitHooksRunner) {
    return [];
  }
  return [
    { path: `${GIT_HOOKS_DIR}/pre-commit`, contents: gitHooksPreCommit.contents, executable: true },
    { path: `${GIT_HOOKS_DIR}/pre-push`, contents: gitHooksPrePush.contents, executable: true },
    { path: `${GIT_HOOKS_DIR}/run-git-hook.mjs`, contents: gitHooksRunner.contents },
    { path: GIT_HOOKS_COMMANDS_PATH, contents: renderJson(commands) },
  ];
}

export type GitHooksActivation =
  | { readonly kind: 'activated'; readonly hooksPath: string }
  | { readonly kind: 'already-active'; readonly hooksPath: string }
  | { readonly kind: 'skipped'; readonly reason: string };

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function currentHooksPath(repoRoot: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['config', '--local', '--get', 'core.hooksPath'], { cwd: repoRoot });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Points the enclosing repository's `core.hooksPath` at this install's hooks, or says
 * why not (CC-6). Refusals are outcomes, never errors: a missing repository, a hook
 * manager already in charge, or a different hooks path already set all leave the
 * repository untouched.
 */
export async function activateGitHooks(targetDir: string, repoRoot: string | undefined): Promise<GitHooksActivation> {
  if (repoRoot === undefined) {
    return { kind: 'skipped', reason: 'not inside a git repository; git hooks were written but not activated' };
  }
  const prefix = path.relative(repoRoot, path.resolve(targetDir)).split(path.sep).join('/');
  const hooksPath = prefix === '' ? GIT_HOOKS_DIR : `${prefix}/${GIT_HOOKS_DIR}`;

  for (const marker of HOOK_MANAGER_MARKERS) {
    if (await exists(path.join(repoRoot, marker))) {
      return {
        kind: 'skipped',
        reason:
          `${marker} found: this repository already uses a git hook manager, so harny did not change ` +
          `core.hooksPath. Call "sh ${hooksPath}/pre-commit" and "sh ${hooksPath}/pre-push" from it.`,
      };
    }
  }

  const current = await currentHooksPath(repoRoot);
  if (current === hooksPath) {
    return { kind: 'already-active', hooksPath };
  }
  if (current !== undefined) {
    return {
      kind: 'skipped',
      reason: `core.hooksPath is already set to "${current}"; harny did not override it. Call "sh ${hooksPath}/pre-commit" from your hooks.`,
    };
  }

  try {
    await execFileAsync('git', ['config', '--local', 'core.hooksPath', hooksPath], { cwd: repoRoot });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { kind: 'skipped', reason: `could not set core.hooksPath (${reason})` };
  }
  return { kind: 'activated', hooksPath };
}
