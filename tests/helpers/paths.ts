/**
 * Shared path helpers for the cli-skeleton test suite (specs/cli-skeleton).
 * Not part of `src/` — test-only plumbing, so it is exempt from the
 * "no canonical prose in src/" constraint (guarantee 4/5).
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Absolute path to `tests/`, independent of cwd. */
export const TESTS_DIR = fileURLToPath(new URL('..', import.meta.url));

/** Absolute path to the repo root (parent of `tests/`). */
export const REPO_ROOT = path.resolve(TESTS_DIR, '..');

/** The real, read-only canonical templates root this feature consumes. */
export const REAL_TEMPLATES_ROOT = path.join(REPO_ROOT, 'templates');

/** The real, read-only `.claude/agents` oracle directory. */
export const REAL_CLAUDE_AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');

/** The real, read-only live conductor Skill file — the oracle for conductor placement. */
export const REAL_CLAUDE_CONDUCTOR_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'skills',
  'sdd-conductor',
  'SKILL.md',
);

/** Root of the test-authored fixture template trees. */
export const FIXTURES_TEMPLATES_ROOT = path.join(TESTS_DIR, 'fixtures', 'templates');

/** Absolute path to a named fixture canonical-templates tree, e.g. `well-formed`. */
export function fixtureTemplatesRoot(name: string): string {
  return path.join(FIXTURES_TEMPLATES_ROOT, name);
}
