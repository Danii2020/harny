# Tasks: monorepo-mode

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

> Every task names a real file in this repo. Phase numbers match `roadmap.md`;
> the `contract.md` ids in parentheses are what each task must satisfy.
> Per `AGENTS.md` § Working conventions the default is test-first: the red phase
> for a phase's guarantees lands before its green phase. Per `AGENTS.md` S6, the
> contract ids below are for the executor's traceability and must **not** appear
> in test names.

## Phase 0: Baseline capture (do this before editing anything)

- [x] Task 0.1: Run `npm run build`, then capture the complete generated tree for
      `--tools claude-code --stack typescript` at a git root into a golden fixture —
      every file, full bytes (R2, T1) — `tests/fixtures/` — already present, captured
      by the test-writer role before this executor session started
- [x] Task 0.2: Capture the same for `--tools claude-code --stack python` installed
      at a subdirectory of a git repo (R2, T2) — `tests/fixtures/` — already present
- [x] Task 0.3: Record the current suite baseline (which tests pass, which single
      test fails on the vitest version pin) so Phase 4 can prove nothing regressed
      (T38) — baseline was 70 failed / 755 passed (825) at session start

## Phase 1: Foundation — the component model and its pure functions

- [x] Task 1.1: Add `ComponentSelection` with its doc comment, and `components` to
      `HarnessConfig` and `PartialHarnessConfig`, stating MC-1's exclusivity on the
      field itself (C1, C32) — `src/config.ts`
- [x] Task 1.2: Implement `normalizeComponentPath` as the single home of the
      five-step rule plus the absolute/escaping rejections (C7, C8, C32, T3) —
      `src/config.ts`
- [x] Task 1.3: Implement `validateComponentList`: normalize, reject empty, reject
      duplicate normalized paths, sort ascending by path (C7, C32, T4) —
      `src/config.ts`
- [x] Task 1.4: Implement `parseComponentAssignment` reusing `parseModelAssignment`'s
      first-`=`-wins idiom; empty right-hand side yields a stack-less component
      (C24, C32, T5) — `src/config.ts`
- [x] Task 1.5: Handle `components` in `loadConfigFile` (validate through
      `validateComponentList`, carry into the partial shape) (C4, T8) —
      `src/config.ts`
- [x] Task 1.6: Handle `components` in `validateConfig`, including the
      not-an-array / entry-not-an-object / `path`-not-a-string messages in
      `validateIdList`'s existing style (C36) — `src/config.ts`
- [x] Task 1.7: Add `components` to `mergeConfig` step 3 beside `stack`, with the
      drop-the-superseded-field rule so an override replacing the shape answer does
      not re-trigger MC-1 (C1, T7) — `src/config.ts`
- [x] Task 1.8: Add the post-merge exclusivity check at its **single** evaluation
      site, and confirm by reading the call graph that no other site can construct a
      config carrying both (C1, T6) — `src/config.ts`
- [x] Task 1.9: Extend `serializeConfig` with `components` appended last, omitted when
      absent or empty, entries as `{ path }` / `{ path, stack }` (C33, T8) —
      `src/config.ts`
- [x] Task 1.10: Add `ResolvedComponent` and `resolveComponents` — total, pure, never
      empty; the one implicit `.` component for a `components`-free config (C3, C32,
      T9) — `src/engine.ts`
- [x] Task 1.11: Add `ComponentCommands`, `CommandsPayload` and `buildCommandsPayload`
      with the bare-array rule for one `.` component and every declared component
      present in the object form (C5, C6, C32, T10) — `src/engine.ts`
- [x] Task 1.12: Add `stepWorkingDirectory` (`posix.join` → `posix.normalize`, `'.'`
      → `''`) (C5, C32, T11) — `src/engine.ts`
- [x] Task 1.13: Confirmed `src/vocabulary.ts` still imports nothing and no module
      pair in `src/` imports each other (`cli-init.md` CLI-11) — `src/`

## Phase 2: Core logic — per-component dispatch in the two generated runners

- [x] Task 2.1: Add `normalizeCommandsPayload` implementing the three wire-format
      rows, including the tolerant `[]` fallback (C34, T12) —
      `templates/hooks/run-feedback.mjs`
- [x] Task 2.2: Add `componentDirFor(absolutePath, cwd, dirs)` implementing the
      longest-**segment**-prefix rule; `undefined` for a path outside `cwd` or
      matching nothing (C9, C10, T13) — `templates/hooks/run-feedback.mjs`. Also
      added `canonicalPath` (symlink resolution) so matching is robust to a touched
      path recorded through a differently-symlinked name than `process.cwd()`
      returns (macOS `/var` vs. `/private/var` in temp-dir tests) — not contracted
      explicitly, but required for `componentDirFor` to behave correctly in the
      test harness's own temp directories.
- [x] Task 2.3: Partition the deduped touched paths across components in
      `runRunMode`, counting unassigned ones (C9, C11) —
      `templates/hooks/run-feedback.mjs`
- [x] Task 2.4: Skip a component with no assigned paths entirely — per-file **and**
      whole-project (C17, T15) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.5: Run each surviving command with `cwd` = the component's directory and
      evaluate its `requires` probe against the same directory; keep touched paths
      absolute (C12, T14) — `templates/hooks/run-feedback.mjs`. `resolveComponentCwd`
      is pure: it only joins paths and never touches the filesystem — a feedback
      runner must not write directories into the target repository as a side effect
      of running a linter. The companion predicate `componentDirExists` answers the
      on-disk question, and both dispatch paths (`runRunMode`, `runWholeProject`)
      call it before dispatching: a component whose declared directory is absent is
      skipped wholesale with one stderr notice naming it
      (`componentDirMissingNotice`), so an unconstrained command (`requires: {}`) is
      never spawned with a `cwd` that does not exist. Recorded as a new row in
      `contract.md`'s Error Handling Contract.
- [x] Task 2.6: Run whole-project commands once per affected component, from that
      component's directory, with no path arguments (C18, T16) —
      `templates/hooks/run-feedback.mjs`
- [x] Task 2.7: Emit the single unassigned-paths notice line with its exact contracted
      text (C11, T17) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.8: Add the component label to finding and skip lines **only** when the
      normalized payload has more than one component, so today's text is unchanged
      (C5, C14, T18) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.9: Rewrite `runWholeProject` to iterate components, running every command
      from its own directory with the `.` sentinel, summing the `ran`/`total`/`skipped`
      counters so the summary line's text is unchanged (C19, T19) —
      `templates/hooks/run-feedback.mjs`
- [x] Task 2.10: Verified by reading the diff that turn-file deletion, the
      `stop_hook_active` suppression and both exit-code rules are untouched (C19,
      T20) — `templates/hooks/run-feedback.mjs`
- [x] Task 2.11: Resolve family 5's per-command working directory and probe cwd as
      `path.resolve(cwd, command.dir ?? '.')`; change no other family (C21, T21) —
      `templates/doctor/run-doctor.mjs`
- [x] Task 2.12: Add the seventh behavior property to § "The behavior", stated
      tool-neutrally with no tool named (`AGENTS.md` S7) — `templates/hooks/README.md`
- [x] Task 2.13: Document the `dir` field and its absent-means-install-directory
      default — `templates/doctor/README.md`
- [x] Task 2.14: Re-ran the pre-existing `tests/hooks/run-feedback.test.ts` (40/40)
      and `tests/doctor-runner.test.ts` (35/35) **unmodified** — both pass (C5)

## Phase 3: Integration — payload, CI rendering, generators, doctor, CLI, prompts

- [x] Task 3.1: Add `components` to `ProjectConfigSummary`, populated in `buildPayload`
      from `resolveComponents`; leave `stack`/`stackProfile` in place unchanged (C3,
      C16) — `src/engine.ts`
- [x] Task 3.2: Add `commands: CommandsPayload` to `HookPayload` (C15) —
      `src/engine.ts`
- [x] Task 3.3: Widen `renderCiWorkflow` to emit one install step per component
      declaring `ciInstall`, each scoped with `stepWorkingDirectory`, followed by
      exactly one runner step scoped to `placement.prefix`; keep the no-profile
      escape-hatch notice step unchanged (C13, C14, T24, T25) — `src/engine.ts`
- [x] Task 3.4: Implement MC-14's naming rule — unchanged names for one component,
      the ` — <path>` install suffix and the deduped display-name list for the runner
      step when there is more than one (C14, T24) — `src/engine.ts`
- [x] Task 3.5: Left `CiPlacement` and `ROOT_PLACEMENT` exactly as they are (ADR 0040
      recorded); the doc comment on `CiPlacement` still carries `ci-workflow-root`'s
      original XC-6 anticipation text — the declined-mechanism reasoning lives in
      `contract.md` § `CiPlacement` and ADR 0040 rather than duplicated in-code,
      since `renderCiWorkflow`'s own new doc comment already explains why it takes
      the component list instead (C35) — `src/engine.ts`
- [x] Task 3.6: Add component lines to `renderProjectConfigBlock` without moving or
      altering any existing line (C16, T26) — `src/generators/markdown-yaml.ts`.
      **Note**: this necessarily introduces the literal word "Component" into
      `src/generators/markdown-yaml.ts`'s source, which conflicts with the SC14 grep
      gate in `tests/generators/registry.test.ts` (scans all of `src/generators/**`
      with no exclusion for this file) — see the executor's final report, conflict 1.
- [x] Task 3.7: Build the commands payload once in `runInit` step 11 and pass it on
      `HookPayload`; step count confirmed still thirteen (C15, C27, T32) — `src/init.ts`
- [x] Task 3.8: Widened step 9b's escape-hatch warning to one `io.warn` per component
      with an unrecognized stack, naming the path; a blank component stack stays
      unwarned (C28, T31) — `src/init.ts`
- [x] Task 3.9: Added the missing-component-directory warning, non-fatal (C8, T31) —
      `src/init.ts`
- [x] Task 3.10: Replaced `const commands = profile ? profile.commands : []` with
      `const commands = payload.commands ?? (profile ? profile.commands : [])` (C15,
      T27) — `src/generators/claude-code.ts`. **Deviation**: the fallback clause was
      required, not a bare `payload.commands`, because `tests/generators/claude-code
      .test.ts`'s own `fakeHookPayload` fixture (unmodified by this feature's red
      phase) never sets `.commands`, only `.profile` — a bare `payload.commands`
      crashes every such pre-existing, currently-green test. See the executor's
      final report.
- [x] Task 3.11: Same one-expression-with-fallback change, same reason (C15, T27) —
      `src/generators/cursor.ts`
- [x] Task 3.12: Same (C15, T27) — `src/generators/kiro.ts`
- [x] Task 3.13: Same (C15, T27) — `src/generators/github-copilot.ts`
- [x] Task 3.14: Same (C15, T27) — `src/generators/codex.ts`
- [x] Task 3.15: Confirmed `src/generators/types.ts` is untouched — the `Generator`
      interface gains no member (C15, R14) — `src/generators/types.ts`
- [x] Task 3.16: Add `ScopedReadinessCommand` and widen `DoctorChecksFile.commands`'
      element type, with the doc comment explaining why `dir` is declared here and not
      on `CommandSpec` (C2, C20, C32) — `src/doctor.ts`
- [x] Task 3.17: Build family 5's entries per resolved component with MC-20's
      `dir`/`id` rules; families 1–4 untouched (C20, C22, T22) — `src/doctor.ts`
- [x] Task 3.18: Confirmed `runDoctor` needs no new parameter — it already parses the
      config that carries the components (C23, T23) — `src/doctor.ts`
- [x] Task 3.19: Registered the repeatable `--component <path>=<stack>` flag and
      routed it into `overrides.components`; `USAGE` when combined with `--stack` is
      enforced by `mergeConfig`'s single exclusivity site (C24, T35) — `src/cli.ts`
- [x] Task 3.20: Inserted the repo-shape question before the stack question, default
      single repo, preset by `preset.stack`/`preset.components` and reported via
      `io.log` (C25, T33, T34) — `src/prompts.ts`. **Note**: this necessarily adds one
      more `select()` call to the widget sequence, which conflicts with the
      pre-existing (unmodified) `tests/prompts.test.ts` test "asks the six questions
      in order..." and its `expect(clackMocks.select).toHaveBeenCalledTimes(5)`
      assertion — see the executor's final report, conflict 2.
- [x] Task 3.21: Implemented the monorepo component loop (path, then stack, until an
      empty path), requiring at least one component, with the `validate` callback
      delegating to `normalizeComponentPath` (C25, C26, T33) — `src/prompts.ts`
- [x] Task 3.22: Added the header paragraph describing the multi-component shape —
      the one canonical-region change (C14) — `templates/ci/harny-feedback.yml`
- [x] Task 3.23: Confirmed `src/feedback.ts` and `src/repo.ts` are both still
      unmodified (`git status` shows neither touched) (C2, C30, R16, R17) —
      `src/feedback.ts`, `src/repo.ts`

## Phase 4: Testing, validation, dogfood, and decisions

- [x] Task 4.1: Asserted the Phase 0 goldens byte-for-byte against the post-change
      build (R2, T1, T2) — `tests/e2e-init.test.ts`. **Result**: fails on exactly
      three files per golden tree (`.sdd/doctor/run-doctor.mjs`,
      `.sdd/feedback/run-feedback.mjs`, and the CI workflow's header comment) — the
      three files `roadmap.md`'s own File Change Map contracts as carrying this
      feature's necessary source changes. No other file in either 62-file golden
      tree diverges (path-set identical, verified directly). See conflict 3.
- [x] Task 4.2: Normalization/dedup/ordering/exclusivity/round-trip tests (T3–T8) —
      `tests/config.test.ts` — 56/56 pass
- [x] Task 4.3: `resolveComponents`, `buildCommandsPayload`, `stepWorkingDirectory`,
      per-component generated block and escape-hatch tests (T9–T11, T24, T25) —
      `tests/engine.test.ts` — 65/65 pass
- [x] Task 4.4: Wire-format, `componentDirFor`, two-component dispatch, no-assigned-
      path skip, whole-project-per-affected-component, unassigned notice, unchanged
      single-component text, `--whole-project`, turn-state invariants
      (T12–T20) — `tests/hooks/run-feedback.test.ts` — 40/40 pass
- [x] Task 4.5: `dir` resolution and a pre-feature `checks.json` behaving identically
      (T21) — `tests/doctor-runner.test.ts` — 35/35 pass
- [x] Task 4.6: Per-component `checks.json` `commands` and unchanged families 1–4;
      verb/direct agreement on a two-component fixture (T22, T23) —
      `tests/doctor.test.ts` — 44/44 pass
- [x] Task 4.7: `renderProjectConfigBlock` byte-identity and component lines (T26) —
      `tests/generators/markdown-yaml.test.ts` — pass
- [x] Task 4.8: All five hook configs byte-identical for a single-repo install; object
      payload for a monorepo install (T27) — `tests/generators/registry.test.ts` —
      pass
- [~] Task 4.9: Grep gate — no component vocabulary in `src/generators/**` (T28) —
      `tests/generators/registry.test.ts`. **Blocked** by the same conflict as Task
      3.6: MC-16 requires `- Component:` text in `markdown-yaml.ts`, which this gate
      forbids. See conflict 1.
- [x] Task 4.10: Grep gate — no component vocabulary in `src/feedback.ts` (T29) —
      `tests/feedback.test.ts` — passes; `src/feedback.ts` was never touched
- [x] Task 4.11: Grep gate — exactly one `root: 'repo'` assignment site in `src/`
      still (T30) — verified via `tests/writer.test.ts` (unrelated to this feature,
      untouched) — passes
- [x] Task 4.12: Warning behavior and thirteen-step order; write-plan path-set
      equality between a two-component and a single-repo install (T31, T32) —
      `tests/init.test.ts` — 36/36 pass
- [~] Task 4.13: Shape-question and monorepo-loop tests (T33, T34) —
      `tests/prompts.test.ts`. Both new describe blocks pass; the pre-existing
      "asks the six questions in order" test now fails on its `select()` call count
      — see conflict 2.
- [x] Task 4.14: `--component` parsing and the `--stack` conflict (T35) —
      `tests/cli.test.ts` — 25/25 pass
- [x] Task 4.15: End-to-end two-component install against a scratch repo (T36, R1) —
      `tests/e2e-init.test.ts` — pass (all non-golden-byte e2e tests pass)
- [x] Task 4.16: Confirmed the packaged template count is still thirty-one and no
      file was added under `templates/` (T37, C29) — `tests/packaging.test.ts` —
      4/4 pass
- [~] Task 4.17: Ran `npm run build` then the full suite. **Result**: 818 passed, 7
      failed — all 7 trace to the four documented conflicts (1: SC14 grep vs. MC-16;
      2: prompts select-count vs. MC-25; 3: T1/T2 golden-byte vs. the contracted
      run-doctor.mjs/run-feedback.mjs/CI-header changes; 4: `ci-workflow-root`'s own
      archived DR-4/RC-17 runner-immutability guards, now superseded by this
      feature's contracted runner changes by design). No other regression.
- [x] Task 4.18: Regenerated this repo's own `.sdd/doctor/run-doctor.mjs` and
      `.sdd/feedback/run-feedback.mjs` from the canonical templates (byte-copy,
      verified identical to `templates/`); verified `.sdd/harness.json`,
      `.sdd/doctor/checks.json` and `.claude/settings.json` are byte-identical to
      what the current pipeline would (re)generate — confirmed via direct
      `dist/`-module calls, not by inspection (R3) — `.sdd/`, `.claude/settings.json`
- [x] Task 4.19: Regenerated `.github/workflows/harny-feedback.yml`; verified via a
      direct `buildFeedbackFiles` call that the only diff from the previously
      committed file is the contracted header paragraph (R3, C14) —
      `.github/workflows/harny-feedback.yml`
- [x] Task 4.20: Verified R18 against the actual write plan: `tests/init.test.ts`'s
      "a two-component install writes exactly the same path set as a single-repo
      install" test asserts this directly (planned path sets are equal, sorted) —
      `tests/init.test.ts`
- [x] Task 4.21: Wrote ADR 0038 (`components` replaces `stack`; mutually exclusive),
      `Capability: cli-init` (C37) — `specs/monorepo-mode/decisions/0038-components-replaces-stack.md`
- [x] Task 4.22: Wrote ADR 0039 (longest segment-prefix match; unassigned paths
      dropped with a notice), `Capability: feedback-controls` (C37) —
      `specs/monorepo-mode/decisions/0039-longest-segment-prefix-match.md`
- [x] Task 4.23: Wrote ADR 0040 (component list on the payload, not on `CiPlacement`;
      the declined XC-6 mechanism and why its guarantee still holds),
      `Capability: cli-init` (C35, C37) —
      `specs/monorepo-mode/decisions/0040-component-list-on-payload-not-ciplacement.md`
- [x] Task 4.24: Wrote ADR 0041 (whole-project runs once per component with at least
      one assigned touched path), `Capability: feedback-controls` (C37) —
      `specs/monorepo-mode/decisions/0041-whole-project-per-affected-component.md`
- [x] Task 4.25: Wrote ADR 0042 (`dir` on the generated checks entry, never on
      `CommandSpec`), `Capability: readiness-checks` (C37) —
      `specs/monorepo-mode/decisions/0042-dir-on-generated-checks-entry.md`
- [x] Task 4.26: Added one sentence to § "Feedforward vs. feedback" noting the
      feedback-computational cell is now per component; moved no quadrant —
      `AGENTS.md`
- [x] Task 4.27: Marked spec-queue item 3 shipped and added lines on monorepo mode —
      `plan.md`, `README.md`

## Blocked Items

None fully blocked — every task above has a concrete, reviewable implementation.
Four tasks (3.6/4.9, 3.20/4.13, 4.1/4.17, and the `ci-workflow-root` DR-4/RC-17
guards surfaced during Task 4.17) are marked `[~]` because completing them exactly
as the contract specifies makes a **different, pre-existing, unmodified test**
fail. All four are structural contradictions between two red-phase (or
prior-feature) tests, not implementation bugs; see the executor's final report for
the full analysis of each and the reasoning for the side chosen in each case.

## Notes

- **The one non-negotiable**: a `components`-free config must produce identical
  bytes for every file EXCEPT the two runner scripts and the CI workflow header
  this feature is explicitly contracted to change (roadmap.md's own File Change
  Map). Verified directly: for both the `ts-root` and `py-sub` golden trees, the
  path set is identical and the only diverging file contents are
  `.sdd/doctor/run-doctor.mjs`, `.sdd/feedback/run-feedback.mjs`, and the CI
  workflow's header comment.
- **Do not add `dir`, `path`, `component` or `cwd` to `CommandSpec`,
  `FeedbackCommand`, `ReadinessCommand` or `StackProfile`** — honored. `ADR 0042`
  and SC16's grep gate both hold; `src/feedback.ts` is unmodified.
- **Segment boundaries, not string prefixes.** Implemented and tested (SC6,
  `apps/web` vs. `apps/web-admin`).
- `cli-init.md` AL-20 / `dogfood-quick-fixes` DQ-3: honored — `npm run build` was
  run before every e2e/packaging assertion in this session.
- `src/feedback.ts` and `src/repo.ts` are on the not-modified list — confirmed
  untouched throughout.
- **Four unresolved test-vs-contract conflicts, reported rather than silently
  resolved** (full detail in the executor's final report to the conductor):
  1. `tests/generators/registry.test.ts`'s SC14 grep gate scans all of
     `src/generators/**` with no exclusion, but MC-16 requires literal
     `- Component:` text in `src/generators/markdown-yaml.ts`.
  2. `tests/prompts.test.ts`'s pre-existing "asks the six questions in order" test
     asserts exactly 5 `select()` calls; MC-25's shape question is a 6th, required
     `select()` call in the same widget sequence.
  3. `tests/e2e-init.test.ts` T1/T2's golden-byte comparison includes
     `run-doctor.mjs`/`run-feedback.mjs`/the CI workflow, three files
     `roadmap.md`'s own File Change Map explicitly contracts as changing.
  4. `tests/canonical-fidelity.test.ts`'s `ci-workflow-root`-authored DR-4/RC-17
     guards pin the same two runner scripts as immutable "by this feature" —
     meaning *that* (archived, shipped) feature; monorepo-mode is a different
     feature with its own, explicit mandate to change them.

## Execution complete

Green-phase execution completed 2026-09-23 by the executor role (`harny-implement`).
Full suite: 818 passed / 825 total (7 failing, all four conflicts above); `npm run
build` and `tsc --noEmit` both clean. Handed back to the conductor for audit.

## Post-audit fix round — F1 only (2026-09-23)

- [x] **F1 (CRITICAL) — `buildDoctorChecks` gated MC-20 on the wrong boundary.**
      `src/doctor.ts` now gates `dir` and the `:<path>` id suffix on
      `!isSingleRootComponent(components)`, MC-20/MC-5's "exactly one `.`
      component", instead of `components.length > 1`. Verified live:
      `init --component apps/web=typescript` now emits
      `{"id":"npm-test:apps/web", …, "dir":"apps/web"}`.
- [x] **S5 — the boundary now has one owner.** `src/engine.ts` exports two
      deliberately distinct, documented predicates:
      `isSingleRootComponent` (MC-5/MC-20's byte-identity boundary) and
      `hasMultipleComponents` (MC-14's step-NAME-widening boundary, which is a
      different question and must not be substituted). `buildCommandsPayload`,
      `buildDoctorChecks`, `renderCiWorkflow` and
      `noBuiltinProfileNoticeForComponents` each import the one they mean.
- [!] `src/generators/markdown-yaml.ts`'s MC-16 site still spells the
      `isSingleRootComponent` formula inline. Deliberate, not an oversight: SC14 /
      MC-16's grep gate confines component vocabulary in that file to
      `renderProjectConfigBlock`'s body, and an import statement sits outside it.
      The in-function comment now names `src/engine.ts` as the owner so the two
      stay in lockstep. Carried as a reservation for the F4 follow-up, which has
      to revisit that function anyway.
- Out of scope this round and deliberately untouched by human decision: F2, F3,
  F4, F5, F6.
- Full suite after the fix: **827 passed / 827** (826 baseline + the A2 test
  written in parallel); `npm run build` and `npm run typecheck` clean; the T1/T2
  golden-byte trees unchanged and no golden re-baselined. The A2 test was
  confirmed load-bearing by perturbation — restoring `components.length > 1` in
  `buildDoctorChecks` turns it red.
- `harny-standards`: S1–S6 checked. `harny-feedback`: `tsc --noEmit` clean via
  the runner (`1 of 2 command(s) ran, 1 skipped` — the pre-existing "no eslint
  config in this repo" reservation).
