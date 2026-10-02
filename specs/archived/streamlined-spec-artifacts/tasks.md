# Tasks: Streamlined Spec Artifacts

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: Schema and loader
- [x] Task 1.1: Write the new `intent`, `execution-plan` (§ Validation as the test plan), `tasks` and `audit` schema templates (SA-2), and delete `contract` and `roadmap` — `templates/spec-schema/*.md` — **Evidence**: 4 templates written, contract/roadmap deleted; `tests/streamlined-spec-artifacts-content.test.ts` schema blocks green
- [x] Task 1.2: Change `SPEC_SCHEMA_NAMES` (SA-1) — `src/templates.ts` — **Evidence**: `SPEC_SCHEMA_NAMES` = intent, execution-plan, tasks, audit; `tsc --noEmit` clean
- [x] Task 1.3: Migrate the fixture schema trees — `tests/fixtures/templates/*/spec-schema/` — **Evidence**: added `execution-plan.md` and removed contract/roadmap in the 4 fixture trees; `engine`/`templates` tests green

## Phase 2: Doctor
- [x] Task 2.1: Emit `schemaFiles` and `legacySchemaFiles` (SA-3) — `src/doctor.ts` — **Evidence**: `schemaFiles` (3) + `legacySchemaFiles` (5) emitted; `tests/doctor.test.ts` green
- [x] Task 2.2: Add shape-aware family 5 (SA-8 to SA-11) — `templates/doctor/run-doctor.mjs` — **Evidence**: runner picks the legacy list when contract/roadmap present; `tests/doctor-runner*.test.ts` green
- [x] Task 2.3: Update the family-5 description — `templates/doctor/README.md` — **Evidence**: README family-5 text updated

## Phase 3: Prompt content
- [x] Task 3.1: Update the role templates and conductor (SA-5 to SA-7), dropping hard rule 6 — `templates/roles/*.md`, `templates/conductor/sdd-conductor.md` — **Evidence**: roles + conductor updated, hard rule 6 and checkpoint dropped, relay moved to a Mechanics bullet; content + test-writer-templates tests green
- [x] Task 3.2: Update the shipped skills (SA-6, SA-7, SA-12) — `templates/skills/harny-{propose,test,implement,audit,document,sync,adr}/` — **Evidence**: shipped skills updated; `skills-fidelity`/`skill-references` green
- [x] Task 3.3: Mirror the changes to the dogfood skills, live agents, live conductor and `high-value-tests` — `.agents/skills/`, `.claude/agents/`, `.claude/skills/` — **Evidence**: `.agents/skills` (`.claude/skills/harny-*` are symlinks to it), live agents, live conductor, `high-value-tests` mirrored; DIVERGENCE_TABLE still passes

## Phase 4: Writer removals and `harny update`
- [x] Task 4.1: Add `LEGACY_HARNESS_PATHS`, removal planning and application, and unchanged-detection (SA-19, SA-23) — `src/writer.ts` — **Evidence**: `LEGACY_HARNESS_PATHS`, `classifyWrites`, `planRemovals`, `applyRemovals`, `applyWrites({skipUnchanged})` in `src/writer.ts`; `tests/update.test.ts` removal block green
- [x] Task 4.2: Apply removals in `init` (no dirty check), and add the update path with the tracked-only safety check (SA-21, SA-22, SA-24, SA-25) — `src/init.ts` — **Evidence**: `runInit` removals after writes; `update` mode + `runUpdate` (`src/init.ts`), `trackedPathsWithChanges` (`src/git-hooks.ts`); `tests/update.test.ts` all green
- [x] Task 4.3: Add the `update` verb with `--dry-run` and `--force`, and the report (SA-18, SA-20) — `src/cli.ts` — **Evidence**: `update [target] --dry-run --force` in `src/cli.ts`; `tests/cli.test.ts` green

## Phase 5: Generators, goldens, dogfood `.sdd/`
- [x] Task 5.1: Update the pointer block (SA-13) — `src/generators/markdown-yaml.ts` — **Evidence**: pointer block derives names from `SPEC_SCHEMA_NAMES`; `tests/generators` green
- [x] Task 5.2: Regenerate the goldens from the built CLI — `tests/fixtures/golden/monorepo-mode/` — **Evidence**: `npm run build`, then fresh built-CLI output copied into `tests/fixtures/golden/monorepo-mode/{ts-root,py-sub}` for everything except the 4 files the golden test excludes; `e2e-init` green
- [x] Task 5.3: Run the built `harny update` on this repo and record its report (SA-15) — `.sdd/` — **Evidence**: built `harny update --force` run on a scratch copy of `.sdd/` (see Notes: update on the real repo would overwrite `.agents/skills` through the `.claude/skills` symlinks); `.sdd/` copied back, `diff -r` identical, legacy files removed. Report: 6 updated/created in `.sdd`, 2 removed

## Phase 6: Docs and validation
- [x] Task 6.1: Update the conventions and docs (SA-17) — `AGENTS.md`, `README.md` — **Evidence**: AGENTS.md and README.md updated (schema table, traceability, S3/S4, law, tree, `update` section, file counts)
- [x] Task 6.2: Run `npm run typecheck` and `npm test` against the baseline, run `node .sdd/doctor/run-doctor.mjs --only spec-state`, and confirm with git status that SA-16 holds — repo root — **Evidence**: typecheck clean; `npm test` 1009 passed, 3 failed at the time (see Notes; the packaging and T41 failures were fixed afterwards, current state is the single baseline `run-guard` failure); `run-doctor --only spec-state` exit 0; `git status specs` shows only this feature dir

## Test-writer evidence (red phase, revision 3)
Baseline before this phase: one pre-existing failure, `tests/permissions/run-guard.test.ts`
("denies a Read-tool read of .env ...", `secrets/db/password.txt: expected 0 to be 2`).
Full run after writing tests: 70 failed | 942 passed; the 69 others are all red for this feature.

- **Tests**: `tests/update.test.ts` (new), `tests/streamlined-spec-artifacts-content.test.ts` (new),
  new describes in `tests/doctor-runner.test.ts` and `tests/generators/markdown-yaml.test.ts`;
  migrated `doctor`, `init`, `e2e-init`, `engine`, `templates`, `packaging`, `skill-references`,
  `cli`, `test-writer-templates`, `canonical-fidelity` per the contract's migration list.
- **Red** (each fails for missing behavior):
  - `update` tests (21): `error: unknown command 'update'` (exit 1, not the contracted 0/2/3); the
    `init --force` removal tests fail because the legacy files are never removed (and the template
    still ships `contract.md`/`roadmap.md`).
  - content tests (16): `templates/spec-schema/execution-plan.md` absent, spec-schema dir lists five
    legacy files, prompts still cite `contract.md`/`roadmap.md`, carry `**Plan status**`.
  - doctor-runner (6): runner ignores `legacySchemaFiles`; new-shape dir fails, legacy dir is judged
    against the wrong list.
  - `doctor.test.ts` (2): no `legacySchemaFiles`, `schemaFiles` still five.
  - `markdown-yaml` (2): pointer block still names five scaffolds.
  - migrated tests (counts/lists now 4 schema files, no Plan status, three commands): fail on the old
    behavior.
- **Green by design** (regression guards): old `checks.json` without `legacySchemaFiles` (SA-10); `init`
  without `--force` keeps legacy files on CONFLICT; fresh `init` does not mention legacy files; the
  "new-shape dir missing execution-plan fails naming it" case happens to pass today.
- **Executor notes**: Task 1.3 (fixture schema trees) and Task 5.2 (goldens) remain executor work; fixture-driven
  tests (`engine`, `templates`) are red until the fixtures gain `execution-plan.md`. T16/T17 are manual.

- **Post-implementation test fixes**: `packaging.test.ts` template count 32 -> 31; `canonical-fidelity.test.ts`
  T41 allowlist gained the architect/executor roles, `templates/spec-schema/`, `.claude/agents/`,
  `.claude/skills/high-value-tests/` and `.claude/skills/sdd-conductor/`.

## Blocked Items
None.

## Notes
- Baseline before Task 1.1: commit `fd62060` on `main`, Node v24.16.0, cwd the repo
  root. `node .sdd/doctor/run-doctor.mjs --only spec-state` currently exits 0. Record
  the `npm test` and `npm run typecheck` baseline before changing anything.
- `specs/current/` and `CHANGELOG.md` are updated at ship time by
  documentation/`harny-sync`, not in this task list.

## Executor notes (implementation)
- Baseline before changes: `npm test` 70 failed | 942 passed (69 red for this feature plus the known
  `tests/permissions/run-guard.test.ts` `.env` failure); typecheck clean. No lint script exists in
  `package.json`, so `tsc --noEmit` is the only mapped check.
- Final: `npm run typecheck` clean; `npm test` 3 failed | 1009 passed. Remaining failures:
  1. `tests/permissions/run-guard.test.ts` `.env` read: the known baseline failure, unchanged.
  2. `tests/packaging.test.ts` "thirty-two templates": **test bug**. It still asserts
     `EXPECTED_TEMPLATE_FILES` has length 32, but the migrated list swaps two files for one and so has 31
     (`templates/` now ships 31 files). Not edited, per instructions.
  3. `tests/canonical-fidelity.test.ts` T41 (non-mutation): **test gap**. It fails while the tree is
     uncommitted because `isContractedEntry` does not allowlist paths this feature legitimately changes
     (`templates/roles/sdd-architect.md`, `sdd-executor.md`, `templates/spec-schema/**`,
     `.claude/agents/**`, `.claude/skills/{high-value-tests,sdd-conductor}/**`). Earlier features added
     allowlist entries for the same reason. Not edited, per instructions.
- TT-28 rows in `tests/test-writer-templates.test.ts`: no re-fragmenting was needed. The shipped
  `harny-audit` skill carries rows containing "the plan did not name" and "has no tests" at `**HIGH**`.
- SA-15 deviation: `harny update` resolves `.claude/skills/harny-*` symlinks, so running it on this repo
  would overwrite the dogfood `.agents/skills/*` with the shipped templates (breaking the declared
  divergences) and also rewrite the hand-maintained `.claude/agents/*`. Only `.sdd/**` was refreshed, from
  the built `update` run on a copy of `.sdd/`. A future decision is needed on whether `update` should skip
  symlinked paths (out of scope here, not implemented).
- Not added: direct `tests/writer.test.ts` cases for `planRemovals`/`applyRemovals` (the contract lists
  them under "new tests", but red tests are fixed; removals are covered through `tests/update.test.ts`).
- Completed: 2026-10-01.

## Test-writer evidence (repair round 1, audit F1, F2, F4)
- **Tests**: `tests/update.test.ts` (two new describes: dirty tracked file behind a symlinked
  `.claude/skills/harny-*` dir; git `status` failing inside a repo via a fake `git` on PATH);
  `tests/writer.test.ts` (new describe: `planRemovals`/`applyRemovals` direct cases, closes F4).
- **Red** (3 failing, each for the right reason; `npx vitest run tests/update.test.ts tests/writer.test.ts`: 3 failed | 54 passed):
  - F1 unstaged and staged edit (2): `expected +0 to be 3`; update exits 0 with `1 updated` and overwrites the edited file
    (git reports nothing for a path beyond a symlink).
  - F2 no `--force` (1): `expected +0 to be 3`; update exits 0 (`2 updated ... 2 removed`) because the check returns `[]` when git fails.
- **Green by design** (guards): F1 `--force` proceeds; F2 `--force` proceeds and `--dry-run` exits 0 changing nothing;
  the 4 writer cases (regular files removed and unrelated kept; symlink and directory skipped with reason; real parent outside
  root skipped; delete failure rejects with a plain Error disclosing written/removed) pass on current code, since they cover
  existing behavior (F4 was a coverage gap, not a bug).
- Test-helper change: `snapshot` in `tests/update.test.ts` now records symlinks as `-> target` instead of reading through them.

## Finding responses (round 1, repair round 1)
- **F1 (CRITICAL)**: fixed in `src/git-hooks.ts` `trackedPathsWithChanges`: each path is resolved through symlinks (realpath, or nearest existing ancestor) and the repo root is realpath'd before `git status`; results map back to the original paths; paths resolving outside the repo are skipped. Evidence: the two F1 tests in `tests/update.test.ts` were red, now green.
- **F2 (HIGH)**: fixed. `trackedPathsWithChanges` now throws on git failure; `src/init.ts` `runUpdateStep` catches it as `gitFailed`, which counts as a refusal (CONFLICT, exit 3, nothing written) unless `--force`; `--dry-run` only warns. Untracked-never-blocks and not-in-repo behavior unchanged. Evidence: F2 test red, now green; `--force` test still green.
- **F3 (LOW)**: deferred, not requested this round.
- **F4 (LOW)**: closed by the added writer tests.
- **F5 (LOW)**: deferred, not requested this round.
- **F6**: not actionable (change uncommitted).
- Validation: `npm run typecheck` clean; `npm run build` ok; `npm test` 1 failed | 1021 passed, sole failure `tests/permissions/run-guard.test.ts` (baseline).
