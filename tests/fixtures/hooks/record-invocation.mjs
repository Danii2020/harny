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
 *   - appends one JSON line `{ "argv": [...], "cwd": "..." }` (process.argv.slice(2),
 *     process.cwd()) to the file named by the INVOCATION_LOG env var, if set. The
 *     `cwd` field was added by specs/monorepo-mode so per-component dispatch tests
 *     (MC-12: each command runs from its own component's directory) can observe the
 *     runner's `spawnSync` cwd directly, without inventing a second fixture — every
 *     pre-existing test in tests/hooks/run-feedback.test.ts only reads `.argv`, so
 *     this is additive and does not change any existing assertion.
 *   - exits with the code named by the FAKE_EXIT_CODE env var (default 0), unless
 *     FAKE_EXIT_CODE_WHEN is also set, in which case FAKE_EXIT_CODE applies only to
 *     invocations whose argv contains that exact token and every other invocation
 *     exits 0. Env vars reach every spawned command alike, so without this a
 *     multi-component test could not make exactly ONE component's command fail —
 *     which is what a "a finding in component X exits 2" assertion needs in order to
 *     have a single possible cause.
 */
import fs from 'node:fs';

const logPath = process.env.INVOCATION_LOG;
const argv = process.argv.slice(2);
const failWhen = process.env.FAKE_EXIT_CODE_WHEN;
const shouldFail = failWhen === undefined || argv.includes(failWhen);
const exitCode = shouldFail ? Number.parseInt(process.env.FAKE_EXIT_CODE ?? '0', 10) : 0;

if (logPath) {
  fs.appendFileSync(logPath, `${JSON.stringify({ argv, cwd: process.cwd() })}\n`);
}

process.exit(Number.isNaN(exitCode) ? 0 : exitCode);
