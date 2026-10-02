# Audit: Streamlined Spec Artifacts

Legacy 5-file feature dir (bootstrap): audited against `intent.md` SC1–SC17,
`contract.md` SA-1..SA-25 and `roadmap.md`, in place of an execution plan.
Round 1, 2026-10-01; round 2, 2026-10-02. Base `fd62060` on `main`, uncommitted
working tree. Tables below show the current (round 2) status; round 1 state is kept in
the Findings and Audit Log.

Evidence labels: `rerun` = executed by the auditor this round; `reused` = taken from
`tasks.md` and still current; `unavailable` = could not be executed.

## Gates (rerun)

| Command | Result |
|---|---|
| `npm run build` | exit 0 (rerun) |
| `npm test` | 1 failed / 1011 passed (48 files). Sole failure `tests/permissions/run-guard.test.ts` "denies a Read-tool read of .env ..." (`secrets/db/password.txt: expected +0 to be 2`), identical to the recorded baseline (rerun) |
| `npm run typecheck` | exit 0 (rerun) |
| `node .sdd/doctor/run-doctor.mjs` | 30 ok, 2 warned (git-hooks-active, gitleaks; environmental), 1 failed (`npm-test`, the baseline failure above) (rerun) |
| `node .sdd/doctor/run-doctor.mjs --only spec-state` | exit 0, no failure lines; all five in-flight dirs (4 legacy + this one) pass (rerun) |
| `git diff fd62060 -- package.json package-lock.json` | empty: no dependency added (rerun) |
| `git status --porcelain specs` | only `?? specs/streamlined-spec-artifacts/` (rerun) |

`tasks.md` Task 6.2 records 3 failures; two (`packaging` count, `canonical-fidelity`
T41 allowlist) were later fixed as recorded under "Post-implementation test fixes". The
current state is the baseline only.

## Gates, round 2 (rerun, 2026-10-02)

| Command | Result |
|---|---|
| `npm run build` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm test` | 1 failed / 1021 passed (48 files); sole failure is the same baseline `run-guard` `.env` test |
| `node .sdd/doctor/run-doctor.mjs` | 30 ok, 2 warned (environmental), 1 failed (`npm-test`, baseline) |
| `--only spec-state` | exit 0, no failure lines |
| manifest/lockfile diff vs `fd62060` | empty |
| `git status --porcelain specs` | only this feature dir |

Round 2 scratch-repo reproductions (built CLI, staged index as tracked baseline, rerun):

| Scenario | Round 1 | Round 2 |
|---|---|---|
| F1: dirty tracked `.agents/skills/harny-propose/SKILL.md` behind symlinked `.claude/skills/harny-propose`, `update` | exit 0, edit overwritten | exit 3, edit kept |
| F1: same, `--dry-run` | no refusal warning | warns naming `.claude/skills/harny-propose/SKILL.md`, exit 0 |
| F2: git absent from `PATH`, inside repo, `update` | no refusal | exit 3, edit kept |
| F2: same, `--dry-run` | no warning | "git could not report the working-tree state" warning, exit 0 |
| `--force` over the dirty symlinked file | n/a | exit 0, overwritten |
| Untracked legacy `contract.md` and untracked edited generated file | n/a | not blocking; file removed / overwritten, exit 0 |
| Legacy path that is a directory / a symlink to a file outside the root | n/a | both skipped with a warning; symlink target untouched |
| Second `update` | idempotent | `0 created, 0 updated, 39 unchanged, 0 removed.` |
| Not in git, no `--force` | exit 3 | exit 3, nothing written; `--dry-run` exit 0 |

## Requirements Checklist (AC results)
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Spec-schema set is exactly intent, execution-plan, tasks, audit | SC1 | PASS | `templates/spec-schema/` and `.sdd/spec-schema/` hold exactly the 4 files, `diff -r` identical; fresh init in scratch wrote the 4 only (rerun) |
| R2 | Architect writes three files, never `audit.md` | SC2 | PASS | `templates/roles/sdd-architect.md:17`, `.claude/agents/sdd-architect.md:14`, `harny-propose` step 3 in both trees (identical) (rerun) |
| R3 | No role/skill/conductor text cites `contract.md`/`roadmap.md` except the legacy note | SC3 | PASS | grep over `templates/`, `.agents/skills/`, `.claude/agents/`, `.claude/skills/{sdd-conductor,high-value-tests}`: every hit is a legacy-shape note (rerun). Remaining `contract.md` hits in `src/**` and runner/hook comments are provenance citations to archived specs, outside SA-6 scope |
| R4 | No separate Test Plan or checkpoint; stop only on tier/setup not in § Validation | SC4 | PASS | no `**Plan status**` / `### Test Plan` anywhere; conductor (template and live) carries only the relay bullet; test-writer role/skill stop rule present (rerun) |
| R5 | New-shape spec-state pass/fail | SC5 | PASS | `tests/doctor-runner.test.ts` new describe green (rerun); runner logic read |
| R6 | Legacy and both-shapes spec-state; in-flight specs pass | SC6 | PASS | tests green; real `--only spec-state` exit 0 (rerun) |
| R7 | Old `checks.json` behaves as today | SC7 | PASS | runner guards on `Array.isArray(legacySchemaFiles)`; test green (rerun) |
| R8 | Archive accepts both shapes | SC8 | PASS | `harny-sync` preconditions, SHA-256 over every file, capabilities from § Ownership or legacy `contract.md`, both trees (rerun, read) |
| R9 | Pointer block lists the deployed scaffolds | SC9 | PASS | derived from `SPEC_SCHEMA_NAMES`; states architect three / auditor `audit.md`; generator test green (rerun) |
| R10 | Goldens and `.sdd/` match fresh init; suite and typecheck at baseline | SC10 | PASS | `e2e-init` golden byte-compare green against the built CLI; `update --dry-run` on this repo reports every `.sdd/**` path `unchanged` (rerun). Suite at baseline. `.sdd/` refresh method is accepted deviation D1 |
| R11 | `AGENTS.md`/`README.md` updated, including `update` | SC11 | PASS | schema table, legacy note, traceability rule, S3 delete exception, S4 retarget, "law" line, `update` usage (rerun, read) |
| R12 | `init --force` removes only the known legacy paths | SC12 | PASS | `LEGACY_HARNESS_PATHS` constant is the only delete input; regular files only (`lstat`), realpath-of-parent containment, absent paths silent; tests green incl. directory and symlink skips (rerun) |
| R13 | `update` equals fresh init plus removals, per-path report | SC13 | PASS | test green; scratch repro reported `updated`/`removed` lines and summary (rerun) |
| R14 | `update` idempotent | SC14 | PASS | scratch second run: `0 created, 0 updated, 39 unchanged, 0 removed.` (rerun) |
| R15 | `update --dry-run` changes nothing | SC15 | PASS | dry-run on this repo left `git status` byte-identical; scratch dry-run followed by a real run still had work to do (rerun) |
| R16 | `update` refusals; untracked never blocks | SC16 | PASS (round 2) | Round 1 FAIL (F1, F2). Round 2: symlinked dirty tracked target and git failure both refuse with exit 3; earlier refusals and untracked-never-blocks unchanged (rerun) |
| R17 | `update` never touches `specs/` or `core.hooksPath` | SC17 | PASS | test green; scratch run left `core.hooksPath` unset and `.sdd/harness.json` bytes unchanged (rerun) |

## Contract Compliance (binding constraints)
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | SA-1, SA-14 schema set and deployment | PASS | `src/templates.ts` `SPEC_SCHEMA_NAMES`; doctor emits 4 `spec-schema:*` checks (rerun) |
| C2 | SA-2 schema sections, § Validation as the test plan | PASS | section headings of all 4 templates match the SA-2 table in order; content test green (rerun) |
| C3 | SA-3, SA-8 to SA-11 doctor | PASS | `src/doctor.ts` emits `schemaFiles` (3) + `legacySchemaFiles` (5); runner family 5; `.sdd` runner byte-identical to template (rerun) |
| C4 | SA-4 ownership | PASS | roles/skills assign `audit.md` to the auditor only, Tests/Red to the test-writer, Finding responses to the executor (rerun, read) |
| C5 | SA-5 to SA-7 prompt content and test scope | PASS | see R2–R4; auditor tier table present in shipped `harny-audit` (dogfood tree divergence is the pre-existing declared one from test-tiers) |
| C6 | SA-12 archive | PASS | see R8 |
| C7 | SA-13 pointer block | PASS | see R9 |
| C8 | SA-15 dogfood `.sdd/` | PASS (accepted deviation D1) | `.sdd/**` all `unchanged` under built `update --dry-run` (rerun) |
| C9 | SA-16, SA-25 no spec mutation | PASS | `git status specs` clean apart from this dir; T15 green (rerun) |
| C10 | SA-17 conventions docs | PASS | see R11 |
| C11 | SA-18, SA-20 `update` verb and report | PASS | `--help` test green; report lines and `would be` prefix observed (rerun) |
| C12 | SA-19, SA-23 legacy-path removals | PASS | see R12; removal after writes; `init` CONFLICT runs first (test green) |
| C13 | SA-21, SA-24 update equals init; idempotent | PASS | renders through `runInit` with `update: true`, `interactive: false`, `gitHooks: false`; see R13/R14 |
| C14 | SA-22 safety refusals | PASS (round 2) | Round 1 FAIL (F1, F2). `trackedPathsWithChanges` resolves real paths and throws on git failure; `runUpdateStep` treats that as `gitFailed` refusal (rerun, code read and reproduced) |
| C15 | S4 / Dependencies: none added | PASS | manifest and lockfile unchanged (rerun) |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Loader and init emit exactly the four schema files (SC1) | PASS (rerun) | `tests/streamlined-spec-artifacts-content.test.ts`, `templates`, `engine`, `init`, `e2e-init`, `packaging` |
| T2 | Generated `checks.json` `specs` keys (SA-3) | PASS (rerun) | `tests/doctor.test.ts` |
| T3 | New-shape dir pass/fail (SC5) | PASS (rerun) | `tests/doctor-runner.test.ts` |
| T4 | Legacy and both-shapes dir (SC6) | PASS (rerun) | `tests/doctor-runner.test.ts` |
| T5 | Old `checks.json` (SC7) | PASS (rerun) | `tests/doctor-runner.test.ts` |
| T6 | Prompt content greps (SC2–SC4) | PASS (rerun) | `tests/streamlined-spec-artifacts-content.test.ts`, `test-writer-templates`, `canonical-fidelity` |
| T7 | Pointer block (SC9) | PASS (rerun) | `tests/generators/markdown-yaml.test.ts` |
| T8 | Golden byte comparison (SC10) | PASS (rerun) | `tests/e2e-init.test.ts` |
| T9 | Writer removes only SA-19 regular files (SC12) | PASS (rerun) | `tests/update.test.ts` (through `init --force`) and, from round 2, `tests/writer.test.ts` `planRemovals / applyRemovals` (4 cases incl. outside-root parent and delete-failure disclosure) |
| T10 | `init --force` removes and reports legacy files (SC12) | PASS (rerun) | `tests/update.test.ts` |
| T11 | `update` equals fresh init (SC13) | PASS (rerun) | `tests/update.test.ts` |
| T12 | Idempotent second `update` (SC14) | PASS (rerun) | `tests/update.test.ts` |
| T13 | `--dry-run` changes nothing (SC15) | PASS (rerun) | `tests/update.test.ts` |
| T14 | `update` refusals (SC12, SC16) | PASS (rerun, round 2) | `tests/update.test.ts` (adds F1 staged/unstaged symlink cases and F2 failing-git case; red evidence recorded in `tasks.md` repair round 1, reused), `tests/cli.test.ts` |
| T15 | `specs/` and `core.hooksPath` untouched (SC17) | PASS (rerun) | `tests/update.test.ts` |
| T16 | Manual: `--only spec-state` on this repo exits 0 (SC6) | PASS (rerun) | run by the auditor: exit 0, no failure lines |
| T17 | Manual: no change under `specs/<other>/` or `specs/archived/` (G5) | PASS (rerun) | `git status --porcelain specs` shows only this feature dir. Remains manual in the sense that no automated test guards it |

Red evidence for T1–T15 is recorded in `tasks.md` (test-writer section; reused, not re-derived).

### Tier Results

Legacy dir: no § Validation. Checked against `contract.md` Integration Points and the
roadmap, which name vitest tests only, no new setup.

| Tier | Tests found | ACs verified | Setup matches plan | Ran | Status | Finding |
|---|---|---|---|---|---|---|
| unit/integration (vitest, temp dirs, real temp git repos, offline) | `update`, content, doctor-runner, generator and migrated suites | SC1–SC17 except the F1/F2 gaps | yes: no dependency, config or script added | yes (rerun) | PASS (round 2; round 1 PARTIAL for F1, F2) | none |

## Conventions (harny-standards S1–S7)

- S1, S2, S3, S4, S7: PASS. `node:` prefixes and `.js` specifiers kept; refusals use
  `HarnessError`; delete list constant and contained; no dependency; conductor template
  names `AskUserQuestion` only as an attributed example.
- S5: LOW note (F5). `src/doctor.ts` `ARCHITECT_SCHEMA_FILES` re-literals three names
  that `SPEC_SCHEMA_NAMES` owns; the contract states the list literally, so not a breach.
- S6: headers present on both new test files. Contract ids in `describe` names follow a
  pre-existing repo-wide pattern (79 occurrences at `fd62060`): pre-existing debt, note only.

## Feedback verification (harny-feedback)

- Per-turn hook (`Stop`/`SubagentStop` in `.claude/settings.json`) is wired; its
  firing during implementation leaves no persisted trace (`.sdd/feedback/.turns`
  absent): unavailable. The only mapped command that would run (`tsc`) is clean.
- CI workflow `.github/workflows/harny-feedback.yml` present. Latest run (36179914369,
  `main`, base commit) green with `1 of 2 command(s) ran, 1 skipped.` This change is
  uncommitted, so no CI run covers it: unavailable (F6).

## Accepted deviations

- **D1 (SA-15)**: this repo's `.sdd/` was refreshed by running the built
  `update --force` on a scratch copy and copying it back, not by `update` on the repo
  itself, because `update` writes through the `.claude/skills/harny-*` symlinks into the
  dogfood `.agents/skills/*`. Human-accepted. Auditor confirmed the outcome: built
  `update --dry-run` reports every `.sdd/**` path `unchanged`.

## Findings
| ID | Severity | Cites | Finding | Closure condition | Status |
|---|---|---|---|---|---|
| F1 | CRITICAL | SC16, SA-22 | `trackedPathsWithChanges` (`src/git-hooks.ts`) passes the un-resolved path to `git status`. For a generated path under a symlinked dir (e.g. `.claude/skills/harny-test/SKILL.md` -> `.agents/skills/...`), git silently reports nothing ("beyond a symbolic link"), so `update` without `--force` overwrites a tracked file with unstaged changes. Repro (rerun, scratch repo): `AM .agents/skills/harny-propose/SKILL.md`, `harny update` exit 0, `LOCAL EDIT` gone. On this repo, `update --dry-run` lists 7 symlinked skill files as `would be updated` over modified tracked `.agents/skills/*` files without naming them as refusal triggers. | The dirty check resolves each changing path to its real location (or otherwise checks the file that will actually be written) before querying git, so a dirty tracked target reached through a symlink refuses with exit 3 and changes nothing; a test in `tests/update.test.ts` shows red without the fix and green with it. | RESOLVED (round 2): `trackedPathsWithChanges` resolves each path (realpath or nearest existing ancestor) and the repo root before `git status`; repro now exits 3 with the edit kept; two F1 tests in `tests/update.test.ts` (red recorded in `tasks.md`, green rerun) |
| F2 | HIGH (blocking: SA-22) | SC16, SA-22 | `trackedPathsWithChanges` returns `[]` when git fails (`catch { return [] }`), so the safety check fails open. Repro (rerun): target inside a repo, dirty tracked `.claude/skills/harny-test/SKILL.md`, git absent from `PATH`: `update --dry-run` emits no refusal warning (with git present it refuses, exit 3). | A git failure while inside a repo refuses (CONFLICT or a USAGE-class error, nothing changed) unless `--force`; covered by a test. | RESOLVED (round 2): git failure throws; `runUpdateStep` sets `gitFailed` → CONFLICT exit 3 without `--force`, dry-run warns and exits 0, `--force` proceeds; repro with git absent exits 3; F2 test green (rerun) |
| F3 | LOW | SA-21 | In update mode the MCP merge warning says "Re-run with --force to replace that one entry", but `update --force` deliberately does not pass `force` to `buildMcpFiles` (`src/init.ts`), so the advice is wrong for `update`. | The warning under `update` no longer advises `--force`, or points to `init --force`. | DEFERRED (round 2, not requested by the human); still reproduces |
| F4 | LOW | Contract Integration Points | No direct `tests/writer.test.ts` cases for `planRemovals`/`applyRemovals` (the contract lists them); covered only through `init --force` in `tests/update.test.ts`. The delete-failure disclosure path (SA-23, exit 1) has no test. | Add direct writer cases, including a delete failure, or record the decision in `tasks.md`. | RESOLVED (round 2): 4 direct cases in `tests/writer.test.ts` `planRemovals / applyRemovals`, incl. delete-failure disclosure; green (rerun) |
| F5 | LOW | S5 | `ARCHITECT_SCHEMA_FILES` re-literals names owned by `SPEC_SCHEMA_NAMES`. | Derive it (e.g. filter out `audit`) or accept as-is in `tasks.md`. | DEFERRED (round 2, not requested by the human) |
| F6 | LOW | harny-feedback | No CI run covers this change (uncommitted). | Branch pushed; `harny feedback` run green with `N of M command(s) ran`, N >= 1. | OPEN: not actionable until the change is committed and pushed |

## Audit Log
| Date | Round | Verdict | Notes |
|---|---|---|---|
| 2026-10-01 | 1 | REJECTED | Gates at baseline; SC1–SC15 and SC17 pass. SC16/SA-22 fails for symlinked targets (F1) and fails open on git error (F2). D1 (SA-15) recorded as human-accepted. |
| 2026-10-02 | 2 | APPROVED WITH RESERVATIONS | Gates rerun at baseline (1021 passed, 1 baseline failure). F1, F2, F4 resolved and reproduced closed; no regressions (untracked never blocks, not-in-git exit 3, dry-run never refuses, legacy removals skip dirs and symlinks). F3, F5 deferred LOW; F6 open until commit. D1 kept. |

## Final verdict

APPROVED WITH RESERVATIONS

**Summary**: All 17 success criteria and all SA binding constraints pass, with the suite and typecheck at baseline. The round 1 SA-22 bypasses (F1 symlinked targets, F2 git failure) are fixed, tested and reproduced closed. Only LOW, non-blocking items remain.

**Critical Issues** (must fix before merge):
- None.

**Warnings** (should fix, not blocking):
- F6: no CI run covers this change until it is committed and pushed; confirm `harny feedback` is green with N >= 1.

**Recommendations** (nice to have):
- F3 (deferred): the MCP merge warning under `update` still advises `--force`, which `update` does not pass to the MCP merge.
- F5 (deferred): derive `ARCHITECT_SCHEMA_FILES` from `SPEC_SCHEMA_NAMES`.
- Decide in a separate feature whether `update` should skip symlinked generated paths, which would remove the need for D1 (accepted SA-15 deviation).

Round 1 verdict (REJECTED, 2026-10-01; F1, F2) is superseded; see the Audit Log.
