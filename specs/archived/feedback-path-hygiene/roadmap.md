# Roadmap: feedback-path-hygiene

Test-first, per `AGENTS.md` § Working conventions. The red-phase tests listed in each
phase are written by the test-writer role before the post-red-tests gate. The executor
then makes them green phase by phase. Every behavioral test drives the **real** runner
(or a **real** generated artifact) as a subprocess against a temp directory, following
the `high-value-tests` skill. No test greps source text.

## Implementation Phases

### Phase 1: Contract types and profile data (`src/feedback.ts`)
**Goal**: Add `CommandSpec.extensions`, narrow `ReadinessCommand`, and declare the
suffix lists on the three shipped `per-file` commands. Serves G2 and G4 (PH-9, PH-10,
PH-12).
**Dependencies**: None
**Estimated complexity**: Low

1. Add `readonly extensions?: readonly string[]` to `CommandSpec<K>`, between
   `pathMode` and `requires`, with the doc comment from `contract.md`. Update the
   interface's leading doc comment so it no longer claims "no field added" (see
   intent.md § Deliberate amendments).
2. Change `ReadinessCommand` to `CommandSpec<ReadinessKind> & { readonly extensions?: never }`.
3. Add the module-private `PYTHON_SOURCE_EXTENSIONS` and `JS_TS_SOURCE_EXTENSIONS`
   constants. Set `extensions` on `eslint`, `ruff`, and `mypy`, as the object key
   immediately after `pathMode`. Leave `tsc`, `npm-test`, and `pytest` untouched.
4. Stop-gate (manual, not persisted as a test, because `tsconfig.json` does not
   type-check `tests/`, the same reasoning as readiness-doctor Task 1.6): temporarily
   add `extensions: ['.x']` to a readiness entry, confirm `npm run typecheck` fails,
   then revert.
5. Red-phase tests (`tests/feedback.test.ts`): one structural invariant over
   `STACK_PROFILES` (PH-10: per-file entries declare a non-empty, dot-prefixed list;
   whole-project and readiness entries declare none). Update the existing full-shape
   `toEqual` assertions for `eslint`/`ruff`/`mypy`, which are pre-existing and will
   otherwise fail, to include the new field.

### Phase 2: Runner path filtering (`templates/hooks/run-feedback.mjs`)
**Goal**: Implement `matchesExtensions`, `existingPaths`, and `perFilePathsFor`, and the
empty-set skip in turn-based `run` mode, leaving `runWholeProject` and `runCommand`
untouched. Serves G1, G2, and G3 (PH-1 to PH-8, PH-11, PH-13).
**Dependencies**: None at the code level; runs after Phase 1 to keep the contract
order. The runner reads plain JSON and never imports `src/`.
**Estimated complexity**: Low

1. Add the three helpers exactly as `contract.md` specifies (extension gate first,
   existence second).
2. In `runRunMode`'s loop, after the probe check: for `per-file` commands, compute
   `perFilePathsFor`, and `continue` silently when it is empty. Pass the filtered list
   to `runCommand`.
3. Update the file's leading doc comment (the `run` and `run --whole-project` bullets).
4. Red-phase tests (`tests/hooks/run-feedback.test.ts`, new describe blocks, reusing
   `runRunner`, `writeCommandsFile`, and `tests/fixtures/hooks/record-invocation.mjs`):
   vanished path dropped; all-vanished turn skips per-file but still runs
   whole-project; extension gate versus a no-`extensions` command on the same turn;
   non-matching-only turn spawns nothing for the gated command and exits 0 with empty
   stdout, and the turn file is deleted; case-sensitivity boundary (`A.PY`); `[]` and
   non-array `extensions` mean no filter; a whole-project command with `extensions`
   still runs on a non-matching turn; `--whole-project` passes exactly `.` to a
   per-file command with `extensions: ['.py']`.
5. Four pre-existing runner tests accumulate paths that never exist on disk. After
   PH-1 their `per-file` commands would be filtered to empty: two would fail, one would
   pass vacuously, and one would be weakened (listed in `tasks.md` § Notes). Their
   *setup* is updated to create those files. No expected value changes (PH-11, and
   intent.md's FC-6/BG-1 amendment). Every other existing runner test, including all
   whole-project tests, must pass unmodified (PH-7).

### Phase 3: End-to-end through generated artifacts (tests only)
**Goal**: Prove that `extensions` actually reaches the runner through real generator
output, and that CI is unchanged, without any generator or engine code change. Serves
G2, G3, and G5 (PH-7, PH-12; SC6, SC7).
**Dependencies**: Phases 1 and 2
**Estimated complexity**: Medium (subprocess fixtures: a temp project with the real
runner and `probes.mjs` copied in, and stub `ruff`/`mypy` executables on a temp `PATH`
directory that log their argv)

1. `tests/generators/claude-code.test.ts`: render `claudeCodeGenerator.renderHook` for
   the **python** profile. Install `templates/hooks/run-feedback.mjs` at
   `.sdd/feedback/run-feedback.mjs` and `templates/shared/probes.mjs` at
   `.sdd/shared/probes.mjs` in a temp project. Put stub `ruff` and `mypy` executables
   (a `#!/usr/bin/env node` script that appends `process.argv.slice(2)` to a log) on a
   prepended `PATH` so the `binary` probes resolve. Drive the generated
   `PostToolUse` command via `sh -c` three times: `.claude/settings.json` (existing),
   `src/gone.py` (created, then deleted before Stop), and `src/app.py` (existing). Then
   drive the generated `Stop` command. Assert each stub was invoked exactly once with
   exactly `[... , <abs>/src/app.py]`.
2. `tests/engine.test.ts`: build the python-profile CI workflow via
   `buildFeedbackFiles`, find the runner-invocation step's `run:` scalar, and decode it
   with `JSON.parse`, since `yamlQuote` (`src/generators/markdown-yaml.ts:15`) escapes
   only `\`, `"`, and newline, a subset of JSON string syntax. Execute it via `sh -c`
   in the same kind of temp project. Assert the stub `ruff` received exactly `check .`
   and the run exited 0.
3. Put the stub-binary helper in `tests/fixtures/hooks/` (test-only, exempt from
   canonical-prose rules like the two existing fixtures), and skip these two tests on
   `win32` if needed, since the stubs rely on a shebang. Keep them offline (S6).

### Phase 4: Documentation, dogfood regeneration, and validation
**Goal**: Keep the canonical behavior doc true and keep FC-13 dogfood byte identity.
Serves G5 and G6 (PH-14, PH-15; SC9, SC10, SC11).
**Dependencies**: Phases 1–3
**Estimated complexity**: Low

1. `templates/hooks/README.md`: refine property 2 in place (six properties kept) and
   add the one-sentence `--whole-project` note. Name no tool.
2. **Decision: this repo's dogfood copies ARE regenerated in this feature.** FC-13
   requires byte identity, and shipping a runner or hook config change without
   regenerating them would ship a known FC-13 violation. Three files are affected:
   - `.sdd/feedback/run-feedback.mjs`: copy of `templates/hooks/run-feedback.mjs`.
   - `.claude/settings.json`: the typescript `eslint` inline JSON gains `extensions`.
   - `.github/workflows/harny-feedback.yml`: the same inline JSON change.

   Use the established DC-4 partial-extraction method (archived
   `agent-feedback-controls` `contract.md` § "Dogfood generation divergence"): call
   `buildPayload`, `claudeCodeGenerator.renderHook`, and `buildFeedbackFiles` against
   this repo's config and write **only** those three paths. Then verify with a real
   `harny init <scratch> --tools claude-code --stack typescript --yes` into a temp
   directory **outside** the repo and `diff` all three. `.sdd/doctor/checks.json`,
   `.sdd/shared/probes.mjs`, and `.sdd/harness.json` must come out unchanged.
   **`.claude/settings.json` is Claude Code configuration**, so the write goes through
   the human's permission prompt, and the human may prefer to apply it themselves.
   Record in `audit.md` who applied it.
3. Run `npm run build` (the e2e suite validates `dist/`, see AL-20), then
   `npm run typecheck` and `npm test`.
4. Manual acceptance note for the audit (not automatable here; carries the R2 class
   of limitation): in a python repo, an in-turn `git mv` of an edited `.py` file plus
   an edit to `.claude/settings.json` produces no ruff/mypy finding at `Stop`.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The filter accidentally reaches `runWholeProject`, changing CI argv | Low | High (CI could lint nothing, or break) | PH-7 is enforced by construction (`runWholeProject` is untouched), by the `--whole-project` `.` test with `extensions` set, and by the Phase 3 CI e2e test |
| An empty filtered set falls through to a zero-arg spawn, linting the whole repo every turn | Med (easy off-by-one in the loop) | High (slow turns, floods of findings) | The SC4 test asserts an invocation count of `0`, not "ran with no paths" |
| The extension list misses a legitimate suffix (`.ipynb`, `.vue`, `.svelte`) so the hook stops checking those files | Med | Low–Med | Open question 1 in `contract.md`. CI's whole-project run still covers them via tool discovery. Lists are data-only and cheap to extend later |
| Existing tests pin exact `STACK_PROFILES` shapes and break | High (certain) | Low | Phase 1 step 5 updates them explicitly, as a pre-existing shape assertion rather than a new tautology |
| Dogfood `.claude/settings.json` regeneration blocked by permissions | Med | Low | Human applies it at the gate; the audit records who did; FC-13 is verified by `diff` either way |
| Hook config bytes change for every downstream repo on re-init (conflict without `--force`) | Certain on re-init | Low | Existing CLI-5 conflict behavior, unchanged. CHANGELOG entry at documentation time calls it out |
| Case-sensitive matching surprises a user with `.PY` files | Low | Low | Documented rationale in PH-3; CI still covers them |
| Stub-binary e2e tests are flaky on Windows or odd shells | Low | Low | Shebang stubs with `win32` skip; `sh -c` is already used by the existing Stop-wrapper tests |

## File Change Map

- `src/feedback.ts` — MODIFY — `CommandSpec.extensions?`; `ReadinessCommand` gains
  `& { readonly extensions?: never }`; two private suffix constants; `extensions` on
  `eslint`, `ruff`, and `mypy`; doc comment refresh
- `templates/hooks/run-feedback.mjs` — MODIFY — `matchesExtensions`, `existingPaths`,
  `perFilePathsFor`; empty-set skip in `runRunMode`; doc comment refresh.
  `runCommand`/`runWholeProject` are untouched
- `templates/hooks/README.md` — MODIFY — property 2 refined in place; one
  `--whole-project` sentence
- `tests/hooks/run-feedback.test.ts` — MODIFY — new describe blocks for PH-1 to PH-8
  and PH-13, with a `Spec:`/`Covers:` header addendum
- `tests/feedback.test.ts` — MODIFY — PH-10 structural invariant; existing shape
  assertions updated to include `extensions`
- `tests/generators/claude-code.test.ts` — MODIFY — python-profile end-to-end hook
  test (SC6)
- `tests/engine.test.ts` — MODIFY — python-profile end-to-end CI step test (SC7)
- `tests/fixtures/hooks/stub-tool.mjs` — CREATE — test-only stub executable that logs
  its argv, used to stand in for `ruff`/`mypy` on `PATH`
- `.sdd/feedback/run-feedback.mjs` — MODIFY (regenerated) — byte copy of the template
- `.claude/settings.json` — MODIFY (regenerated; human-approved write) — inline JSON
  gains `extensions` on `eslint`
- `.github/workflows/harny-feedback.yml` — MODIFY (regenerated) — inline JSON gains
  `extensions` on `eslint`
- `specs/feedback-path-hygiene/{intent,contract,roadmap,tasks,audit}.md` — CREATE —
  this spec set

Explicitly **not** changed: `src/engine.ts`, `src/doctor.ts`, `src/generators/*.ts`,
`templates/ci/harny-feedback.yml`, `templates/doctor/**`, `templates/shared/probes.mjs`,
`templates/skills/**`, `.agents/skills/**`, and `.sdd/doctor/checks.json`. README,
CHANGELOG, AGENTS, and `specs/current/**` are updated by the documentation hand-off and
`harny-sync`, not by this roadmap.
