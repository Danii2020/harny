#!/usr/bin/env node
/**
 * Test-only fixture (not part of src/ or templates/, exempt from canonical-prose
 * rules exactly like tests/helpers/toml-decode.ts).
 *
 * Stands in for `templates/hooks/run-feedback.mjs`'s "run" mode CLI surface for
 * `tests/generators/claude-code.test.ts`'s Stop-hook wrapper tests. The real
 * runner's own behavior is already covered end-to-end by
 * `tests/hooks/run-feedback.test.ts`; this fixture isolates the wrapper script
 * `claudeCodeGenerator.renderHook` generates — the subprocess-orchestration and
 * `hookSpecificOutput.additionalContext` JSON-emission logic — from the runner's
 * own internals, so a wrapper bug and a runner bug can never be confused for one
 * another.
 *
 * Ignores its argv and stdin entirely. Writes `FAKE_STDOUT` (if set) to its own
 * stdout, then exits with `FAKE_EXIT_CODE` (default `0`).
 */
const stdout = process.env.FAKE_STDOUT;
if (stdout) {
  process.stdout.write(stdout);
}

const exitCode = Number.parseInt(process.env.FAKE_EXIT_CODE ?? '0', 10);
process.exit(Number.isNaN(exitCode) ? 0 : exitCode);
