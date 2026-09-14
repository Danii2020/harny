#!/usr/bin/env node
/**
 * Test-only fixture (not part of src/ or templates/, exempt from canonical-prose
 * rules exactly like tests/helpers/toml-decode.ts).
 *
 * Stands in for a real mapped command (`npx eslint`, `tsc --noEmit`, `ruff check`,
 * `mypy`, …) in tests/hooks/run-feedback.test.ts so the suite never shells out to a
 * real linter/type-checker (AGENTS.md S6, offline by default) while still being able
 * to observe exactly how many times, and with what argv, the runner invoked it.
 *
 * On every invocation:
 *   - appends one JSON line `{ "argv": [...] }` (process.argv.slice(2)) to the file
 *     named by the INVOCATION_LOG env var, if set.
 *   - exits with the code named by the FAKE_EXIT_CODE env var (default 0).
 */
import fs from 'node:fs';

const logPath = process.env.INVOCATION_LOG;
const exitCode = Number.parseInt(process.env.FAKE_EXIT_CODE ?? '0', 10);
const argv = process.argv.slice(2);

if (logPath) {
  fs.appendFileSync(logPath, `${JSON.stringify({ argv })}\n`);
}

process.exit(Number.isNaN(exitCode) ? 0 : exitCode);
