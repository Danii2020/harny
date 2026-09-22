#!/usr/bin/env node
/**
 * Test-only fixture (not part of src/ or templates/, exempt from canonical-prose
 * rules exactly like tests/fixtures/hooks/record-invocation.mjs).
 *
 * Stands in for a real per-file linter/type-checker binary (`ruff`, `mypy`) on a
 * temp `PATH`, for the end-to-end tests in tests/generators/claude-code.test.ts
 * (Task 3.2) and tests/engine.test.ts (Task 3.3) that drive a *real generated*
 * hook/CI command through the real runner (templates/hooks/run-feedback.mjs) as a
 * subprocess. Copied into a temp `bin/` directory as `ruff` and `mypy` (mode
 * 0o755) so each tool's `binary` probe resolves it on PATH, without ever
 * shelling out to a real linter/type-checker (AGENTS.md S6, offline by default).
 *
 * On every invocation:
 *   - appends one JSON line `{ "tool": <basename of argv[1]>, "argv":
 *     process.argv.slice(2) }` to the file named by the STUB_TOOL_LOG env var,
 *     if set. `argv[1]` (not `argv[0]`, which is always this script's own path
 *     once copied to `ruff`/`mypy`) is the invoking process's own script path —
 *     `tool` is read from `process.env.STUB_TOOL_NAME` when set, so callers do
 *     not have to rely on this script's on-disk name.
 *   - exits with the code named by the STUB_EXIT_CODE env var (default 0).
 */
import fs from 'node:fs';
import path from 'node:path';

const logPath = process.env.STUB_TOOL_LOG;
const exitCode = Number.parseInt(process.env.STUB_EXIT_CODE ?? '0', 10);
const argv = process.argv.slice(2);
const tool = process.env.STUB_TOOL_NAME ?? path.basename(process.argv[1] ?? 'stub-tool');

if (logPath) {
  fs.appendFileSync(logPath, `${JSON.stringify({ tool, argv })}\n`);
}

process.exit(Number.isNaN(exitCode) ? 0 : exitCode);
