# Roadmap: monorepo-mode

> Ordering principle: every phase is built so that **the single-repo path is
> finished and provably byte-identical before the multi-component path is
> reachable**. Phase 1 lands the types and pure functions whose one-component
> results are today's values by construction (MC-5); phases 2 and 3 then widen
> consumers one layer at a time, each layer's byte-identity re-proven before the
> next is started. Per `AGENTS.md` § Working conventions the default is test-first:
> the red phase for each phase's guarantees lands before its green phase.

## Implementation Phases

### Phase 1: Foundation — the component model and its pure functions
**Goal**: `ComponentSelection` exists, is validated/normalized/ordered, round-trips
through `.sdd/harness.json`, and the three pure rendering-input functions
(`resolveComponents`, `buildCommandsPayload`, `stepWorkingDirectory`) return exactly
today's values for the one-component-at-`.` case.
**Dependencies**: None
**Estimated complexity**: Medium — the merge/precedence rules in `src/config.ts` are
subtle (`mergeConfig`'s fixed three-step order, `loadConfigFile`'s
full-config→partial translation) and the exclusivity rule (MC-1) has to be evaluated
after the merge, not inside it.

1. Add `ComponentSelection` and `HarnessConfig.components` / `PartialHarnessConfig.components`
   to `src/config.ts`, with the doc comments the contract specifies (MC-1's
   exclusivity stated on the field itself).
2. Implement `normalizeComponentPath` as the single home of the five-step rule plus
   the two rejections (absolute, escaping) — pure, total, synchronous (MC-7, MC-8).
3. Implement `validateComponentList` on top of it: normalize each entry, reject an
   empty list, reject duplicates by normalized path, sort ascending by path.
4. Implement `parseComponentAssignment` reusing `parseModelAssignment`'s
   first-`=`-wins idiom (MC-24).
5. Wire `components` through `loadConfigFile`, `validateConfig`, `mergeConfig`
   (wholesale replace beside `stack`, with the drop-the-superseded-field rule) and
   `serializeConfig` (appended last, omitted when absent) — MC-4's round-trip.
6. Add the post-merge exclusivity check (MC-1) at its single evaluation site, and
   confirm by reading the call graph that no other site can construct a config
   carrying both.
7. Add `ResolvedComponent`, `resolveComponents`, `ComponentCommands`,
   `CommandsPayload`, `buildCommandsPayload` and `stepWorkingDirectory` to
   `src/engine.ts`. Nothing consumes them yet — this phase ends with the functions
   green and unused.

**Exit condition**: `serializeConfig(loadConfigFile(…))` is byte-identical for every
`components`-free config in the fixtures, and `buildCommandsPayload` on a single `.`
component returns the identical array object shape today's generators pass.

### Phase 2: Core logic — per-component dispatch in the two generated runners
**Goal**: `templates/hooks/run-feedback.mjs` resolves each touched path to one
component and runs that component's commands from that component's directory;
`templates/doctor/run-doctor.mjs` runs each readiness command from its `dir`. Both
are byte-identical in behavior for every payload shape that exists today.
**Dependencies**: Phase 1 (only for the wire-format shape; the runners import nothing
from `src/`)
**Estimated complexity**: High — this is the phase with a real behavioral surface,
and the runner is copied verbatim into every scaffolded repo, so a defect here ships
to every install. `tests/hooks/run-feedback.test.ts` is the existing harness to
extend.

1. Add `normalizeCommandsPayload` to `run-feedback.mjs`: array → one `.` component;
   `{components: […]}` → itself with per-entry defaults; anything else → `[]`.
   Everything downstream reads the normalized list only.
2. Add `componentDirFor(absolutePath, cwd, dirs)` implementing MC-9's
   longest-segment-prefix rule, returning `undefined` for a path outside `cwd` or
   matching nothing.
3. Rewrite `runRunMode`'s loop to partition the deduped touched paths across
   components first, then iterate components in payload order: skip a component with
   no assigned paths entirely (MC-17), otherwise evaluate each command's probe and run
   it with `cwd` = the component's directory (MC-12), per-file commands receiving
   their assigned, extension-filtered, still-existing absolute paths and
   `whole-project` commands receiving none (MC-18).
4. Emit MC-11's single unassigned-paths notice; suppress the component label on
   finding and skip lines when the normalized payload has exactly one component, so
   today's output text is unchanged (MC-5).
5. Rewrite `runWholeProject` to iterate components, running every command of every
   component from its own directory with the `.` sentinel, and summing the
   `ran`/`total`/`skipped` counters across components so the existing summary line's
   text is unchanged (MC-19).
6. Keep the turn-file deletion, the `stop_hook_active` suppression, and both exit-code
   rules exactly where they are.
7. In `templates/doctor/run-doctor.mjs`, resolve family 5's per-command working
   directory as `path.resolve(cwd, command.dir ?? '.')` and evaluate that command's
   probe against the same directory (MC-21). No other family changes.
8. Update `templates/hooks/README.md` § "The behavior" with the seventh property,
   stated tool-neutrally, and `templates/doctor/README.md` with the `dir` field.

**Exit condition**: every pre-existing test in `tests/hooks/run-feedback.test.ts` and
`tests/doctor-runner.test.ts` passes unmodified, and the new multi-component tests
pass.

### Phase 3: Integration — payload, CI rendering, generators, doctor, CLI, prompts
**Goal**: the component list reaches every consumer, and a two-component install
produces a correct, complete artifact set.
**Dependencies**: Phases 1 and 2
**Estimated complexity**: Medium — broad but shallow; each site is a small, localized
change, and the five generator edits are one expression each.

1. `src/engine.ts`: add `components` to `ProjectConfigSummary` (populated in
   `buildPayload` from `resolveComponents`), and `commands` to `HookPayload`.
2. `src/engine.ts`: widen `renderCiWorkflow` to emit one install step per component
   declaring `ciInstall` (each with `stepWorkingDirectory`) followed by exactly one
   runner step scoped to `placement.prefix`, with MC-14's naming rule; keep the
   no-profile escape-hatch notice step unchanged.
3. `src/generators/markdown-yaml.ts`: add MC-16's component lines to
   `renderProjectConfigBlock`, leaving every existing line in place and in order.
4. `src/init.ts`: build the commands payload once in step 11 and pass it on
   `HookPayload`; widen step 9b's escape-hatch warning to per component; add the
   missing-component-directory warning. Step count stays thirteen (MC-27).
5. All five `src/generators/*.ts`: replace `const commands = profile ? profile.commands : []`
   with `const commands = payload.commands`. No other line changes; the `Generator`
   interface is not touched (MC-15).
6. `src/doctor.ts`: add `ScopedReadinessCommand`, widen `DoctorChecksFile.commands`'
   element type, and build family 5's entries per resolved component with MC-20's
   `dir`/`id` rules. `runDoctor` needs no new parameter — it already parses the
   config that carries the components (MC-23).
7. `src/cli.ts`: register the repeatable `--component <path>=<stack>` flag and route
   it into `overrides.components`.
8. `src/prompts.ts`: insert the repo-shape question before the stack question, with
   the monorepo loop and the `validate` callback delegating to
   `normalizeComponentPath` (MC-25, MC-26).
9. `templates/ci/harny-feedback.yml`: add MC-14's header paragraph describing the
   multi-component shape — the one canonical-region change.

**Exit condition**: `npx harny init --dry-run --component .=python --component apps/web=typescript`
plans the same path set a single-repo install plans, and the generated workflow, hook
config and `checks.json` are correct by inspection before any test asserts it.

### Phase 4: Testing, validation, dogfood, and decisions
**Goal**: every contract guarantee has a test; byte-identity is proven mechanically,
not by eye; this repo's own artifacts are regenerated and verified; the five ADRs are
written.
**Dependencies**: Phase 3
**Estimated complexity**: Medium — the golden-byte work is the substance here, and
`cli-init.md` AL-20 (the e2e suite validates built `dist/`, not `src/`) means the
build must be run before the e2e assertions are trusted.

1. Golden-byte regression: capture the full generated tree for a
   `--stack typescript` root install and a `--stack python` subdirectory install
   **before** any change, and assert byte-equality after (SC2). This is the single
   most load-bearing test in the feature.
2. Per-component runner tests in `tests/hooks/run-feedback.test.ts`: SC5's
   two-component dispatch, SC6's `apps/web` vs. `apps/web-admin` segment boundary,
   SC7's unassigned-path notice, SC8's whole-project-per-affected-component rule,
   and MC-19's CI mode.
3. Config tests in `tests/config.test.ts`: MC-1 exclusivity from each of the three
   sources, MC-7 normalization/dedup/ordering table, MC-8 containment rejections,
   MC-4 round-trip.
4. Engine tests in `tests/engine.test.ts`: `buildCommandsPayload`'s two forms,
   `stepWorkingDirectory`'s table, the generated block for one and for three
   components, and the escape-hatch case.
5. Doctor tests in `tests/doctor.test.ts` and `tests/doctor-runner.test.ts`:
   `checks.json`'s per-component `commands`, the omitted-`dir` single-component case,
   a pre-feature `checks.json` running unchanged (MC-21), and SC10's verb/direct
   agreement.
6. Generator tests: all five hook configs byte-identical for a single-repo install;
   a grep gate asserting no component vocabulary appears in `src/generators/**`
   (SC14) and none in `src/feedback.ts` (SC16), in the style of
   `agent-feedback-controls` BG-7's command-literal gate.
7. Prompt tests in `tests/prompts.test.ts`: the shape question's preset/skip
   behavior and the single-repo transcript's unchanged remainder (SC15).
8. Regenerate this repo's own `.sdd/**`, `.claude/settings.json` and
   `.github/workflows/harny-feedback.yml` and verify byte-identity except the
   workflow header comment (SC3, FC-13).
9. Write ADRs 0038–0042 under `specs/monorepo-mode/decisions/` via `harny-adr`, each
   with its `Capability:` field set from the capability it actually belongs to
   (`feedback-controls` for 0039/0041, `cli-init` for 0038/0040,
   `readiness-checks` for 0042) — never copied from the feature's own capability.

**Exit condition**: full suite green except the one pre-existing known failure
(the vitest version pin), and no previously-passing test made to fail.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A single-repo install's bytes drift, breaking `feedback-controls.md` FC-13 and every existing install's re-init | Medium | **High** — the feature's one non-negotiable constraint | MC-5 makes byte-identity structural, not conditional: each new rule's one-component value *is* today's value. Phase 4.1 captures goldens **before** any edit, so drift is caught by diff rather than by review |
| Segment-blind prefix matching assigns `apps/web-admin/x.ts` to `apps/web` | Medium | High — wrong toolchain produces confident, wrong findings | MC-9 specifies the segment rule explicitly; SC6 is a named success criterion with its own test; the rule has exactly one implementation (`componentDirFor`) |
| Per-component `whole-project` commands multiply into a type-check storm on a large monorepo | Medium | Medium — slow turns train people to disable the hook | MC-17/MC-18: a component with no assigned touched path runs nothing at all. ADR 0041 records the bound and its accepted cost |
| `--commands`' widened shape silently degrades to `[]` on an older scaffolded runner | Low | High — a linter that silently stops running | The object form is only ever generated by a run that also rewrites `.sdd/feedback/run-feedback.mjs` in the same write plan, so the two always ship together. The degradation path is still the tolerant `[]` (no crash), and `MC-6`'s notice makes an all-empty payload visible in CI's summary line |
| The exclusivity rule (MC-1) fires on a legitimate combination, e.g. a `--config` file's `stack` plus a `--component` flag | Medium | Medium — a hostile error on a reasonable invocation | The merge's drop-the-superseded-field rule handles exactly this: an override replacing the shape question's answer discards the other field rather than erroring. MC-1 fires only when **one** source supplies both |
| Readiness command `id` collision across two components of the same stack | Medium | Medium — two `npm-test` lines, indistinguishable | MC-20 suffixes `:<path>` whenever more than one component exists; the single-component id is unchanged |
| Adding `dir` to `CommandSpec` by convenience, weakening `readiness-checks.md` RD-2 and `feedback-controls.md` FC-1 | Medium | High — a second home for component data, and a `FeedbackCommand` that can contradict the payload | ADR 0042 records the decision; `ScopedReadinessCommand` is declared in `src/doctor.ts`; SC16's grep gate fails the build if the vocabulary appears in `src/feedback.ts` |
| Departing from `ci-workflow-root` XC-6's anticipated `CiPlacement` mechanism looks like an accidental contradiction at audit | Medium | Low — churn, a contested finding | Stated explicitly in `contract.md` § `CiPlacement` with the reason, recorded as ADR 0040, and XC-6's actual guarantee (no signature change, nothing deleted) is shown to still hold |
| `templates/ci/harny-feedback.yml`'s canonical region changes, contradicting its own "canonical, copied verbatim" claim | High (it will change) | Low | Contracted in advance as MC-14, scoped to the header comment only, and regenerated into this repo's committed workflow in the same feature — the exact pattern `ci-workflow-root` used under its C4 |
| `cli-init.md` AL-20: `npm test` validates a stale `dist/`, so a `src/`-only regression false-greens | Medium | Medium | Phase 4 runs `npm run build` before trusting any e2e assertion; the reservation stays open and is not this feature's to close |
| The interactive monorepo loop has no flag-preset equivalent, leaving the two paths untestable against one fixture (the `RD-R5` gap class) | Medium | Medium | `--component` is repeatable and fully drives the non-interactive path, and MC-25 requires the flag to preset the shape question, so one fixture drives both |
| Scope creep into `component-level-docs` (per-component `AGENTS.md`, heuristic discovery) | Medium | Medium — two detectors, two owners | MC-31 is an explicit fence; `intent.md` § Non-Goals names the successor spec |

## File Change Map

### Source (`src/`)
- `src/config.ts` — MODIFY — `ComponentSelection`; `components` on `HarnessConfig` and
  `PartialHarnessConfig`; `normalizeComponentPath`, `validateComponentList`,
  `parseComponentAssignment`; `components` handling in `loadConfigFile`,
  `validateConfig`, `mergeConfig`, `serializeConfig`; the MC-1 exclusivity check
- `src/engine.ts` — MODIFY — `ResolvedComponent`, `resolveComponents`,
  `ComponentCommands`, `CommandsPayload`, `buildCommandsPayload`,
  `stepWorkingDirectory`; `components` on `ProjectConfigSummary`; `commands` on
  `HookPayload`; per-component step emission in `renderCiWorkflow`.
  `CiPlacement` is **not** changed (ADR 0040)
- `src/doctor.ts` — MODIFY — `ScopedReadinessCommand`; `DoctorChecksFile.commands`
  element type; per-component family-5 entries in `buildDoctorChecks`
- `src/init.ts` — MODIFY — build the commands payload in step 11; per-component
  escape-hatch warning; missing-component-directory warning. Still thirteen steps
- `src/prompts.ts` — MODIFY — repo-shape question, monorepo component loop,
  `validate` callback delegating to `normalizeComponentPath`
- `src/cli.ts` — MODIFY — repeatable `--component <path>=<stack>` flag
- `src/generators/markdown-yaml.ts` — MODIFY — component lines in
  `renderProjectConfigBlock`
- `src/generators/claude-code.ts` — MODIFY — one expression in `renderHook`
- `src/generators/cursor.ts` — MODIFY — one expression in `renderHook`
- `src/generators/kiro.ts` — MODIFY — one expression in `renderHook`
- `src/generators/github-copilot.ts` — MODIFY — one expression in `renderHook`
- `src/generators/codex.ts` — MODIFY — one expression in `renderHook`
- `src/feedback.ts` — **NOT MODIFIED** (MC-2, SC16)
- `src/repo.ts` — **NOT MODIFIED** (MC-30)
- `src/writer.ts`, `src/errors.ts`, `src/vocabulary.ts`, `src/templates.ts`,
  `src/mcp.ts`, `src/generators/types.ts`, `src/generators/index.ts`,
  `src/generators/json.ts`, `src/generators/toml.ts` — **NOT MODIFIED**

### Templates (`templates/`) — count stays at thirty-one; no file created or removed
- `templates/hooks/run-feedback.mjs` — MODIFY — `normalizeCommandsPayload`,
  `componentDirFor`, per-component dispatch in `runRunMode` and `runWholeProject`,
  the unassigned-paths notice, the component label on finding/skip lines
- `templates/doctor/run-doctor.mjs` — MODIFY — family 5 resolves each command's
  working directory and probe cwd from `command.dir ?? '.'`
- `templates/hooks/README.md` — MODIFY — seventh behavior property, tool-neutral
- `templates/doctor/README.md` — MODIFY — document the `dir` field
- `templates/ci/harny-feedback.yml` — MODIFY — header comment paragraph on the
  multi-component shape (the one canonical-region change, MC-14)
- `templates/shared/probes.mjs` — **NOT MODIFIED** (probes are cwd-parameterized
  already; only the cwd passed to them changes)

### Tests (`tests/`)
- `tests/config.test.ts` — MODIFY — normalization/dedup/ordering table, exclusivity
  from three sources, containment rejections, round-trip
- `tests/engine.test.ts` — MODIFY — `buildCommandsPayload`, `stepWorkingDirectory`,
  per-component generated block, escape hatch
- `tests/hooks/run-feedback.test.ts` — MODIFY — SC5, SC6, SC7, SC8, MC-19, plus the
  unchanged single-component cases
- `tests/doctor.test.ts` — MODIFY — per-component `checks.json` `commands`
- `tests/doctor-runner.test.ts` — MODIFY — `dir` resolution; a pre-feature
  `checks.json` unchanged (MC-21)
- `tests/generators/*.test.ts` — MODIFY — hook-config byte-identity for a single-repo
  install; component payload for a monorepo install
- `tests/prompts.test.ts` — MODIFY — shape question, preset/skip, single-repo
  transcript
- `tests/init.test.ts` — MODIFY — warnings, thirteen-step order, write-plan path set
- `tests/cli.test.ts` — MODIFY — `--component` parsing and the `--stack` conflict
- `tests/e2e-init.test.ts` — MODIFY — end-to-end two-component install
- `tests/feedback.test.ts` — MODIFY — the SC16 grep gate over `src/feedback.ts`
- `tests/packaging.test.ts` — **NOT MODIFIED** (template count unchanged)

### Dogfood artifacts (regenerated, verified byte-identical except where contracted)
- `.sdd/harness.json`, `.sdd/doctor/checks.json`, `.sdd/feedback/run-feedback.mjs`,
  `.sdd/doctor/run-doctor.mjs`, `.sdd/shared/probes.mjs`, `.sdd/spec-schema/*.md`,
  `.claude/settings.json` — REGENERATE — expected byte-identical except
  `run-feedback.mjs` and `run-doctor.mjs`, which carry this feature's runner changes
- `.github/workflows/harny-feedback.yml` — REGENERATE — header comment only (MC-14)

### Specs and documentation
- `specs/monorepo-mode/decisions/0038-…md` … `0042-…md` — CREATE — via `harny-adr`
- `AGENTS.md` — MODIFY — one sentence in § "Feedforward vs. feedback" noting the
  feedback-computational cell is now per component; no quadrant moves
- `README.md`, `plan.md` — MODIFY — `plan.md`'s spec-queue item 3 marked shipped;
  `README.md` gains one line on monorepo mode
