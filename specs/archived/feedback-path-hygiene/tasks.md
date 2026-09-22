# Tasks: feedback-path-hygiene

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Real paths only. Red-phase test tasks (marked **red**) are owned by the test-writer
role and land before the post-red-tests gate. All other tasks are owned by the
executor. Every task cites its roadmap phase and the contract items it serves.

## Phase 1: Contract types and profile data (`src/feedback.ts`)
- [x] Task 1.1 (**red**, Phase 1; PH-10): add one structural test over `STACK_PROFILES`.
      Every `per-file` command declares a non-empty `extensions` whose entries all start
      with `.` and have length > 1. No `whole-project` command and no `readiness` entry
      declares `extensions`. Include a `Spec: specs/feedback-path-hygiene` /
      `Covers:` header addendum and keep contract ids out of the test name —
      `tests/feedback.test.ts`
- [x] Task 1.2 (**red**, Phase 1; PH-12): update the existing full-shape `toEqual`
      assertions for `eslint`, `ruff`, and `mypy` to include `extensions` (typescript:
      `['.ts','.tsx','.js','.jsx','.mjs','.cjs','.mts','.cts']`; python:
      `['.py','.pyi']`). Leave the `tsc` assertion unchanged — `tests/feedback.test.ts`
- [x] Task 1.3 (Phase 1; PH-2, PH-6): add `readonly extensions?: readonly string[]` to
      `CommandSpec<K>` between `pathMode` and `requires`, with the contract's doc
      comment. Refresh the interface's leading doc comment — `src/feedback.ts`
- [x] Task 1.4 (Phase 1; PH-9): change `ReadinessCommand` to
      `CommandSpec<ReadinessKind> & { readonly extensions?: never }` with the contract's
      doc comment — `src/feedback.ts`
- [x] Task 1.5 (Phase 1; PH-10, PH-12): add the module-private
      `PYTHON_SOURCE_EXTENSIONS` and `JS_TS_SOURCE_EXTENSIONS` constants. Set
      `extensions` on `eslint` (`JS_TS_SOURCE_EXTENSIONS`) and on `ruff` and `mypy`
      (`PYTHON_SOURCE_EXTENSIONS`), as the key right after `pathMode` — `src/feedback.ts`
- [x] Task 1.6 (Phase 1; PH-9, stop-gate, not persisted): temporarily add
      `extensions: ['.x']` to the `pytest` readiness entry, confirm `npm run typecheck`
      fails with a type error on that line, revert, and record the observed error text
      in `audit.md` — `src/feedback.ts`. Observed:
      `src/feedback.ts(214,9): error TS2322: Type '[string]' is not assignable to type 'undefined'.`
      Reverted; `npm run typecheck` clean afterward.
- [x] Task 1.7 (Phase 1): `npm run typecheck` passes, and Tasks 1.1–1.2 are green —
      `tests/feedback.test.ts`

## Phase 2: Runner path filtering (`templates/hooks/run-feedback.mjs`)
- [x] Task 2.1 (**red**, Phase 2; PH-1): accumulate `src/a.py` and `src/b.py` (both
      created on disk), delete `b.py`, then `run` with one `per-file` command
      (`record-invocation.mjs`, `extensions: ['.py']`). Assert exactly one invocation,
      whose path args are exactly `[<abs a.py>]` — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.2 (**red**, Phase 2; PH-1, PH-5, PH-8, PH-13; SC2): accumulate
      `src/old.py`, rename it to `src/new.py` (only the old path was accumulated), then
      `run` with one `per-file` and one `whole-project` command. Assert zero PER_FILE
      invocations, one WHOLE_PROJECT invocation with no path args, exit 0, empty stdout,
      and the turn file deleted — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.3 (**red**, Phase 2; PH-2, PH-6; SC3): accumulate
      `.claude/settings.json`, `.github/workflows/ci.yml`, and `src/app.py` (all
      existing). Run with command A (`extensions: ['.py','.pyi']`) and command B (no
      `extensions`). Assert A received exactly `[<abs app.py>]` and B received all three
      paths as a set — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.4 (**red**, Phase 2; PH-5; SC4): accumulate only
      `.claude/settings.json` and `README.md`, then run one `per-file` command with
      `extensions: ['.py']` and `FAKE_EXIT_CODE=1`. Assert its invocation count is 0,
      exit code 0, and stdout empty. The failing exit code proves a spawn would have
      surfaced — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.5 (**red**, Phase 2; PH-3): accumulate `src/A.PY` and `src/b.py`, then run
      with `extensions: ['.py']`. Assert only `b.py` is passed —
      `tests/hooks/run-feedback.test.ts`
- [x] Task 2.6 (**red**, Phase 2; PH-6): with `extensions: []` and, separately,
      `extensions: "py"` (a non-array), a `.json` touched path is still passed. The
      existence check still applies — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.7 (**red**, Phase 2; PH-8): a `whole-project` command declaring
      `extensions: ['.py']` still runs once, with no path args, on a turn that touched
      only `README.md` — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.8 (**red**, Phase 2; PH-7; SC5): `run --whole-project` (no turn file, empty
      STDIN) with a `per-file` command declaring `extensions: ['.py']`. Assert its single
      invocation's trailing args are exactly `['.']` — `tests/hooks/run-feedback.test.ts`
- [x] Task 2.9 (Phase 2; PH-1, PH-2, PH-4): add `matchesExtensions`, `existingPaths`, and
      `perFilePathsFor` exactly as `contract.md` specifies (extension gate, then
      existence) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.10 (Phase 2; PH-5, PH-11): in `runRunMode`'s loop, after the probe check,
      compute filtered paths for `per-file` commands, `continue` silently on an empty
      set, and pass the filtered list to `runCommand`. Do not modify `runCommand` or
      `runWholeProject` — `templates/hooks/run-feedback.mjs`
- [x] Task 2.11 (Phase 2; PH-7, PH-15 support): update the file's leading doc comment
      (`run` bullet: the two filters and the empty-set skip; `run --whole-project` bullet:
      neither filter applies) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.12 (**red**, Phase 2; PH-1, PH-11): update the setup of the four
      pre-existing runner tests listed in § Notes so their accumulated files exist on
      disk before `run`. Leave the expected values unchanged —
      `tests/hooks/run-feedback.test.ts`
- [x] Task 2.13 (Phase 2; PH-11, PH-7): the full existing `run-feedback.test.ts` suite
      (batching, cleanup, accumulate, empty turn, probe skip, re-entry, whole-project)
      passes with no change beyond Task 2.12's setup edits, and Tasks 2.1–2.8 and 2.12 are green — `tests/hooks/run-feedback.test.ts`

## Phase 3: End-to-end through generated artifacts (tests only)
- [x] Task 3.1 (**red**, Phase 3; support): create a test-only stub executable
      (`#!/usr/bin/env node`) that appends `{ "tool": <basename of argv[1]>, "argv": process.argv.slice(2) }`
      to `STUB_TOOL_LOG` and exits `STUB_EXIT_CODE` (default 0). Tests copy it into a
      temp `bin/` as `ruff` and `mypy` with mode `0o755` —
      `tests/fixtures/hooks/stub-tool.mjs`
- [x] Task 3.2 (**red**, Phase 3; PH-1, PH-2, PH-12; SC6): render the Claude Code hook
      for the python profile. Install the real runner and `probes.mjs` into a temp
      project's `.sdd/`, and prepend the temp `bin/` to `PATH`. Drive the generated
      `PostToolUse` command via `sh -c` for `.claude/settings.json` (existing),
      `src/gone.py` (then deleted), and `src/app.py` (existing), then the generated
      `Stop` command. Assert `ruff` logged exactly `['check', <abs app.py>]` and `mypy`
      logged exactly `[<abs app.py>]`, each once — `tests/generators/claude-code.test.ts`
- [x] Task 3.3 (**red**, Phase 3; PH-7, PH-12; SC7): build the python-profile CI
      workflow via `buildFeedbackFiles`. Extract the runner-invocation step's `run:`
      scalar, decode it with `JSON.parse`, and execute it via `sh -c` in a temp project
      with the real runner, probes, and stub `bin/`. Assert `ruff` logged exactly
      `['check', '.']`, `mypy` exactly `['.']`, and exit 0 — `tests/engine.test.ts`
- [x] Task 3.4 (Phase 3): Tasks 3.2–3.3 are green with no change to `src/generators/**`
      or `src/engine.ts` (PH-12 "automatic") — `tests/generators/claude-code.test.ts`,
      `tests/engine.test.ts`

## Phase 4: Documentation, dogfood regeneration, and validation
- [x] Task 4.1 (Phase 4; PH-15; SC10): refine property 2 in § "The behavior" in place
      (per-command file-type match, vanished-path drop, silent skip, never zero path
      args). Keep exactly six properties and name no tool. Add one sentence to
      § "`--whole-project`" stating that neither filter applies — `templates/hooks/README.md`
- [x] Task 4.2 (Phase 4; PH-14): copy the template runner byte-for-byte —
      `.sdd/feedback/run-feedback.mjs`. Done via `buildFeedbackFiles` (same bytes as
      `templates/hooks/run-feedback.mjs`; `diff` confirmed empty).
- [x] Task 4.3 (Phase 4; PH-14): regenerate the Claude Code hook config via DC-4
      partial extraction (`buildPayload` + `claudeCodeGenerator.renderHook` on this
      repo's config). **Claude Code configuration: needs human-approved write.** Record
      in `audit.md` who applied it — `.claude/settings.json`. Applied by the executor
      under the human's Phase-4 pre-authorization recorded in the conductor's handoff
      (see `audit.md`).
- [x] Task 4.4 (Phase 4; PH-14): regenerate the CI workflow via `buildFeedbackFiles` —
      `.github/workflows/harny-feedback.yml`
- [x] Task 4.5 (Phase 4; PH-14; SC9): run a real
      `harny init <tmp> --tools claude-code --stack typescript --yes` into a temp
      directory outside the repo. `diff` it against the three regenerated files (all
      empty), and confirm `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`, and
      `.sdd/harness.json` are unchanged in `git status`. Record the result in
      `audit.md` — `.sdd/feedback/run-feedback.mjs`, `.claude/settings.json`,
      `.github/workflows/harny-feedback.yml`. All three `diff`s empty;
      `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`, `.sdd/harness.json`
      unchanged (not in `git status`).
- [x] Task 4.6 (Phase 4; SC11): `npm run build`, then `npm run typecheck` and
      `npm test`, all green; confirm no `package.json` dependency change (S4) —
      `package.json`. `build` and `typecheck` clean. `npm test`: 622/623 passing;
      the sole failure is the pre-existing, unrelated `tests/packaging.test.ts`
      vitest-pin mismatch (`4.1.10` vs `^4.1.11`), left untouched per scope.
      `package.json`/`package-lock.json` unchanged.
- [x] Task 4.7 (Phase 4; manual, human-gated): in a python repo, an in-turn `git mv` of
      an edited `.py` file plus an edit to `.claude/settings.json` produces no ruff/mypy
      finding at `Stop`. Record it as manual evidence or as a carried reservation —
      `specs/feedback-path-hygiene/audit.md`. Exercised against the real runner in a
      scratch project (not an interactive Claude Code session — recorded as a
      limitation in `audit.md`); exit 0, zero stub invocations, turn file deleted.

## Post-audit amendment A1 (2026-09-22; `contract.md` § "Post-audit amendment A1", audit finding AL-3)
- [x] Task A1.1 (**red**, A1; PH-6, Error Handling rows (A1)): in a turn that
      accumulated an existing `README.md` and a `src/gone.py` that is then deleted,
      run a `per-file` command with `extensions: [null, ""]`. Assert its single
      invocation receives exactly `[<abs README.md>]`: the non-matching existing path
      is still passed (no filter), and the vanished path is still dropped (PH-1) —
      `tests/hooks/run-feedback.test.ts`
- [x] Task A1.2 (**red**, A1; PH-2, PH-6): accumulate existing `src/app.py`,
      `README.md`, and `config.json`, then run a `per-file` command with
      `extensions: [null, "", 5, ".py"]`. Assert it receives exactly
      `[<abs app.py>]` — `tests/hooks/run-feedback.test.ts`
- [x] Task A1.3 (A1; PH-6, PH-14): change `matchesExtensions` to the A1 reference body
      (compute the valid non-empty-string entries first, return `true` when there are
      none, otherwise suffix-match against the valid entries only). Do not touch
      `runCommand`, `runWholeProject`, or any other function. Then copy the template
      byte-for-byte to the dogfood runner and confirm `diff` is empty. Confirm
      `npm run build`, `npm run typecheck`, and `npm test` pass, with A1.1–A1.2 green —
      `templates/hooks/run-feedback.mjs`, `.sdd/feedback/run-feedback.mjs`.
      `matchesExtensions` changed exactly as specified (doc comment + body);
      `runCommand`/`runWholeProject` byte-unchanged (verified by inspection).
      `diff templates/hooks/run-feedback.mjs .sdd/feedback/run-feedback.mjs` empty.
      `.claude/settings.json`/`.github/workflows/harny-feedback.yml` untouched by
      this task (mtimes predate it; their existing `extensions`-on-`eslint` diff is
      unrelated, from the earlier Phase 4 regeneration). `npm run build`,
      `npm run typecheck` clean; `npm test`: 624/625, only the pre-existing
      `tests/packaging.test.ts` vitest-pin failure remains; A1.1–A1.2 green.

## Blocked Items
[None yet]

## Notes
- The runner is plain ESM `.mjs` copied verbatim (I5). It must not import from
  `src/`, and it must not hard-code any suffix (FC-1): suffixes arrive only via
  `--commands`.
- Do not touch `runCommand` or `runWholeProject`. PH-7 is guaranteed by construction,
  and a diff that touches either function is an audit finding.
- PH-4 (filter order) is not observable in argv. The auditor verifies it by reading
  `perFilePathsFor`.
- **Pre-existing runner tests that accumulate paths never created on disk.** Once
  PH-1 lands, their `per-file` commands would be filtered to empty and never spawned.
  Task 2.12 fixes them. Checked against `tests/hooks/run-feedback.test.ts` as of
  commit `c8a3bd4`:
  - "N edits across M distinct files …" (batching): **would fail**, since PER_FILE is
    never invoked.
  - "a failing mapped command normally causes the runner to signal a blocking
    finding": **would fail**, exiting 0 instead of 2.
  - "the identical failing turn, re-entered (stop_hook_active), never signals a
    blocking response": **would pass vacuously**, because nothing runs, so the
    re-entry guard is never exercised.
  - "deletes the turn file after running it …": **would still pass**, but its NOOP
    command stops running, which weakens the test.

  The fix in each case is to create the accumulated files on disk before `run`. This
  is the concrete form of the FC-6/BG-1 amendment in `intent.md`, and it is the only
  intended change to pre-existing assertions' *setup*. No expected value changes. The
  real-runner re-entry tests in `tests/generators/codex.test.ts` and
  `tests/generators/github-copilot.test.ts` use `whole-project` commands, so PH-8
  leaves them unaffected.
- Open questions awaiting the human gate (`contract.md` § Open questions): `.ipynb` for
  ruff; silent versus notice on an empty filtered set; `extensions?: never` on
  readiness. If the gate changes any of these, update PH-5, PH-9, or Task 1.5 before
  the red phase starts.

## Completion

All Phase 1–4 tasks are `[x]`. `npm run build`, `npm run typecheck`, and `npm test`
all pass; the only remaining test failure is the pre-existing, unrelated
`tests/packaging.test.ts` vitest-pin mismatch. `harny-standards` (S1–S6) and
`harny-feedback` (tsc clean; eslint correctly skipped — no `eslint.config.*`/
`.eslintrc*` at this repo's own root) were checked before completion.

**Completed**: 2026-09-22
