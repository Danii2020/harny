# Tasks: Commit Checks

## Legend
- [x] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: `run --staged`
- [x] Task 1.1: Red tests for `--staged` — `tests/hooks/run-feedback.test.ts`
- [x] Task 1.2: Implement — `templates/hooks/run-feedback.mjs`

## Phase 2: Hook runner and shims
- [x] Task 2.1: Red tests in real repositories — `tests/git-hooks/run-git-hook.test.ts`
- [x] Task 2.2: Implement `templates/git-hooks/*`

## Phase 3: Generation and activation
- [x] Task 3.1: Red tests — `tests/git-hooks.test.ts`
- [x] Task 3.2: `executable` in writer; `src/git-hooks.ts`; init/CLI/prompt wiring

## Phase 4: CI, dogfood, docs, validation
- [x] Task 4.1: CI template + tests
- [x] Task 4.2: Dogfood regeneration, goldens, counts; activate in this checkout
- [x] Task 4.3: README; full suite; doctor

## Blocked Items
[None yet]

## Notes
Implementation completed 2026-09-24. `run --staged` shares the turn path's dispatch
(`dispatchTouchedPaths`) rather than copying it; the existing 44 feedback-runner tests
pass unchanged over the refactor. CI step coverage (T4) is the regenerated
`tests/fixtures/golden/ci-workflow-root/root-workflow-non-header.yml` byte comparison.

Gates waived for this run (intent.md). Stacked on permissions-baseline.
