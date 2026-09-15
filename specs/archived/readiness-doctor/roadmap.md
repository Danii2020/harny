# Roadmap: readiness-doctor

> Every phase cites the `contract.md` items it delivers and, through them, the
> `intent.md` goals those serve. Phase order is chosen so each phase's red tests can
> be written against an interface the previous phase already fixed.

## Implementation Phases

### Phase 1: Vocabulary, taxonomy, and the command model

**Goal**: Fix every closed set this feature widens, before anything reads them — the
skill id, the exit code, and the `FeedbackCommand`/`ReadinessCommand` split. Nothing in
this phase writes a file or runs a check; it exists so Phases 2–5 compile against
settled types instead of re-negotiating them.
**Dependencies**: None
**Estimated complexity**: Low
**Delivers**: `contract.md` § "Public API — `src/feedback.ts`", § "Public API —
`src/errors.ts`", BG-4, BG-12 (the vocabulary half), BG-18

1. Extract `CommandSpec<K extends string>` from today's `FeedbackCommand`
   (`src/feedback.ts:26–42`) with **no field added, removed, or renamed**; re-express
   `FeedbackCommand` as `CommandSpec<FeedbackKind>` and add `ReadinessCommand =
   CommandSpec<ReadinessKind>`. Verify `npm run typecheck` is clean *before* adding
   anything else — if this refactor is not a pure no-op for existing consumers
   (`src/engine.ts`, all five generators), stop and reconsider rather than adjusting
   call sites.
2. Add `readiness?: readonly ReadinessCommand[]` to `StackProfile`, and populate it for
   both profiles exactly as `contract.md` pins (`npm test` gated on `{ script: 'test' }`;
   `pytest -q` gated on `{ binary: 'pytest' }`). Confirm by inspection that
   `profile.commands` still type-rejects a `kind: 'test'` member — that compile error
   *is* BG-4's enforcement mechanism.
3. Add `NOT_READY: 6` to `EXIT` and `'NOT_READY'` to `HarnessErrorCode`/`EXIT_BY_CODE`
   (`src/errors.ts:6–26`). Three code points, one row each; no other change to that
   module.
4. Append `'harny-doctor'` to `CORE_SKILL_IDS` (`src/vocabulary.ts:41–49`) — **last**,
   after `harny-feedback`, preserving every existing index. Update that constant's
   doc-comment, which currently names `harny-feedback` as the appended-last member, so
   the comment does not become a lie.

### Phase 2: The shared probe module, the canonical runner, and its behavior document

**Goal**: The readiness check itself — the one artifact that does the actual work —
written and provable as a standalone subprocess, before any generator or CLI verb
depends on it; and the probe evaluator extracted to a single shared module both
generated runners import.
**Dependencies**: Phase 1 (for the `ReadinessCommand` shape the runner consumes)
**Estimated complexity**: High — this is the feature's substance
**Delivers**: BG-1, BG-2, BG-3, BG-8, BG-9, BG-10, BG-19, BG-20, BG-21, and the
runner's half of BG-6

1. **Extract, don't copy.** Create `templates/shared/probes.mjs` by **moving**
   `probeSatisfied`/`scriptExists`/`binaryExists`/`anyFileExists`
   (`run-feedback.mjs:156–202`) verbatim and exporting them — no signature change, no
   behavior change, no reordering.
2. **Modify the shipped runner.** In `templates/hooks/run-feedback.mjs`, delete those
   four functions, add `import { probeSatisfied } from '../shared/probes.mjs';`, and
   rewrite the module doc-comment so it no longer implies a single self-contained
   file. This is a change to an **already-shipped artifact of the archived
   `agent-feedback-controls` feature**, so treat the existing
   `tests/hooks/run-feedback.test.ts` as a regression oracle: it must pass with **zero
   assertions modified** (BG-21). It spawns the runner in place at line 84 with `cwd`
   set to a tmpdir at line 121, so the relative import resolves to
   `templates/shared/probes.mjs` and the test is unaffected — verify that empirically
   at this step rather than assuming it.
3. Write `templates/doctor/run-doctor.mjs`: the same single import, then
   `--checks <path-or-inline-json>` parsing (dual-form detection copied in spirit from
   `readCommands`, `run-feedback.mjs:123–136`), defaulting to `.sdd/doctor/checks.json`.
   It contains **no probe logic of its own** (BG-19).
4. Implement the four families in fixed order (BG-1), each check emitting exactly one
   `ok` / `skip` / `fail` line, and **no family aborting the run** (BG-2):
   - *environment* — Node version reported; resolved-stack notice when `commands` is
     empty (BG-8).
   - *harness manifest* — each `require` entry: gate first (skip with notice when
     false, BG-9), then `anyOf` existence.
   - *spec state* — enumerate `specs/*/` excluding `reservedDirs`; per feature, the
     five `schemaFiles`; then the shipped-but-unarchived rule (`shippedMarker` in
     `intent.md` **and** an `approvedVerdicts` match in `audit.md`) (BG-10).
   - *tests* — each `ReadinessCommand`: probe, then `spawnSync` with `stdio: 'pipe'`,
     surfacing output on failure.
5. Exit `0` / `2` / `1` per `contract.md`'s table, and print a trailing summary line
   (`N ok, M skipped, K failed`) — the same "tell a green run apart from an
   everything-skipped run" reasoning that made `runWholeProject` print its own summary
   (`run-feedback.mjs:241–245`).
6. Write `templates/doctor/README.md` to `S7`: the four families stated as behavior
   first, tools named only afterward as attributed examples, modelled on
   `templates/hooks/README.md` § "The behavior". Document the `shared/` convention
   there once — `feedback/` and `doctor/` hold entry points, `shared/` holds code both
   import — so a future generated script joins it instead of copying code a third time.
7. Correct the source comments that describe the runner as frozen or standalone:
   `src/generators/cursor.ts:148`, `src/generators/claude-code.ts:113`,
   `src/generators/kiro.ts:167`. Their substantive claim (*a generator never modifies
   the runner*) stays; only the "single immutable file" implication changes.

### Phase 3: Generation — `src/doctor.ts` and the `init` wiring

**Goal**: `npx harny init` scaffolds the runner and a correct, deterministic
`checks.json` into a target repo, under every rule `init` already obeys.
**Dependencies**: Phase 2 (the runner's `--checks` schema is the output format this
phase must produce)
**Estimated complexity**: Medium
**Delivers**: `contract.md` § "Public API — `src/doctor.ts`" (build half), § Data
Models, BG-11, BG-17, and the `CLI-8`/`CLI-5` inheritance

1. Create `src/doctor.ts` with the path/spec constants (`DOCTOR_RUNNER_PATH`,
   `DOCTOR_CHECKS_PATH`, `SPECS_DIR`, `RESERVED_SPEC_DIRS`, `SHIPPED_MARKER`,
   `APPROVED_VERDICTS`) and the `DoctorCheck`/`DoctorChecksFile` types.
2. Implement `buildDoctorChecks(config, generators)` producing the eight `require`
   entries in `contract.md` § Data Models' table order, importing **every** path
   constant from its owning module (`S5`) — `SPEC_SCHEMA_DIR`/`HARNESS_CONFIG_PATH`
   from `src/engine.ts`, `FEEDBACK_RUNNER_PATH`/`CI_WORKFLOW_PATH` from
   `src/feedback.ts`, `conductorPath`/`skillsDir` from each `Generator`,
   `SPEC_SCHEMA_NAMES` from `src/templates.ts`, `CORE_SKILL_IDS` from
   `src/vocabulary.ts`. Serialize with `JSON.stringify(x, null, 2)` + `\n`, matching
   `serializeConfig` (`src/config.ts:402–419`).
3. Implement `buildDoctorFiles(payload, generators)`, returning `[]` when
   `payload.doctorRunner` is absent (the `buildFeedbackFiles` tolerated-absence
   posture, `src/engine.ts:266–268`).
4. Add `SHARED_PROBES_PATH` and `buildRuntimeSharedFiles(payload)` to `src/engine.ts`,
   emitting `.sdd/shared/probes.mjs` **exactly once per run from one call site** —
   deliberately not from `buildFeedbackFiles` and `buildDoctorFiles` separately, which
   would put a duplicate entry in the write plan.
5. Extend the CI runner guard (`renderRunnerInvocation`, `src/engine.ts:216–223`) so
   its `test -f` precondition covers the shared module as well as the runner: a
   checkout missing either cannot run. Then regenerate this repo's committed
   `.github/workflows/harny-feedback.yml` (`FC-13`) and update the CI-workflow
   assertions in `tests/engine.test.ts`.
6. Extend `CanonicalTemplates` with `doctorRunner?` / `doctorReadme?` /
   `sharedProbes?`, loaded through the existing `loadOptionalResource`
   (`src/templates.ts:436–445`); thread `doctorRunner` and `sharedProbes` onto
   `HarnessPayload` in `buildPayload`.
7. Push `buildDoctorFiles(...)` and `buildRuntimeSharedFiles(...)` into `runInit`'s
   **existing** step 11 alongside `buildFeedbackFiles` (`src/init.ts:207–238`). Add no
   step. Re-read `CLI-1`'s 13-step wording afterward and confirm it still describes the
   code verbatim.
8. Regenerate this repo's own `.sdd/feedback/run-feedback.mjs` (tracked, and changed by
   Phase 2) and add `.sdd/shared/probes.mjs`, so the dogfood tree matches what
   generation now produces (`FC-13`).

### Phase 4: The `doctor` verb

**Goal**: `npx harny doctor` locates, runs, and translates — with an exit code that
cannot be confused with a CLI failure.
**Dependencies**: Phase 3 (`buildDoctorChecks` is what the verb passes to the runner)
**Estimated complexity**: Medium
**Delivers**: `contract.md` § "Public API — `src/cli.ts`", `runDoctor`, BG-6, BG-7,
and the Error Handling Contract's first five rows

1. Implement `runDoctor(options)` in `src/doctor.ts`: resolve config from
   `.sdd/harness.json` when present (tolerating its absence), apply the `--stack`
   override, assert `DOCTOR_RUNNER_PATH` exists (`USAGE` naming the path and
   `npx harny init` if not), compute checks, and `spawnSync(process.execPath, [runner,
   '--checks', json], { cwd: targetDir, stdio: 'inherit' })`.
2. Translate exit codes exactly (BG-6): `0` → `{ ready: true }`; `2` →
   `HarnessError('NOT_READY', …)`; anything else → a plain `Error` disclosing the
   observed code and the runner path. Never call `process.exit` (`cli-init.md`
   invariant 2).
3. Add the `doctor` command to `buildProgram` (`src/cli.ts:152–178`) with
   `[target]` and `--stack` only, reusing `assertWritableDirectory`. Leave `init`'s
   registration untouched.
4. Confirm `--help` renders `Usage: harny [options] [command]` with exactly two
   commands (the `.name('harny')` requirement at `src/cli.ts:144–151`).

### Phase 5: The skill, both roots, and the dogfood copy

**Goal**: `harny-doctor` exists as a real skill everywhere the shape contract requires,
and this repo runs what it ships.
**Dependencies**: Phase 4 (the skill body names the verb, so the verb's final name and
flags must be settled)
**Estimated complexity**: Medium
**Delivers**: BG-12, BG-13, BG-14, and `SC2`/`SC3`/`SC15`

1. Author `.agents/skills/harny-doctor/SKILL.md` to the shape contract: six
   frontmatter keys only, `description` ≤ 1,536 chars, five body sections in order,
   `harny-role: shared`, `harny-writes: none`. The `## When to use this` section states
   the boundary with `harny-feedback` in the same breath as its own triggers (BG-14).
2. Create the relative symlink `.claude/skills/harny-doctor` → the `.agents/` copy
   (`SL-2`) and confirm `git status` shows it as a tracked symlink, not a directory,
   with no `.gitignore` edit (`SC3`).
3. Copy to `templates/skills/harny-doctor/SKILL.md` and add its `DIVERGENCE_TABLE`
   entry in `tests/skills-fidelity.test.ts` — **required**: that test fails by
   construction for a tenth skill with no entry, which is the intended behavior, not
   an obstacle to route around.
4. Generate this repo's own `.sdd/doctor/run-doctor.mjs` + `.sdd/doctor/checks.json`
   through the real code path (a scratch `init` run, artifacts copied in), never by
   hand (`SC15`).
5. Run `npx harny doctor` against this repo and confirm it exits `0` — the first live
   proof that the `.sdd/harness.json` gate (`contract.md` § Data Models) does what it
   was designed to do here.

### Phase 6: Testing, counts, and documentation coherence

**Goal**: Every guarantee has a test; every number in the repo agrees; the quadrant
table and its prose stop contradicting each other.
**Dependencies**: Phase 5
**Estimated complexity**: Medium
**Delivers**: BG-5, BG-15, BG-16, `SC9`, `SC13`, `SC14`, `SC19`, `SC20`

1. `tests/doctor.test.ts` (mirrors `src/doctor.ts`, `S6`): `buildDoctorChecks`
   determinism and entry order; `buildDoctorFiles` absence tolerance; `runDoctor`'s
   three exit translations against a stub runner.
2. `tests/doctor-runner.test.ts`: drive `templates/doctor/run-doctor.mjs` as a
   subprocess over fixture repos (ready / missing harness file / malformed feature dir
   / shipped-but-unarchived / absent test runner / unrecognized stack), asserting both
   the exit code and the presence of each family's line.
3. The BG-4/BG-5 gates: grep every generated hook config and the generated CI workflow
   for the readiness command ids, and grep `src/`, `templates/`, `.agents/skills/` for
   the test-command strings — allowing them only in `src/feedback.ts` and generated
   data. Add the **BG-19 single-implementation gate**: grep both runners for the four
   probe identifiers and assert they appear only on the import line, so a future
   re-inlined copy fails the suite instead of silently reopening R2's original drift.
4. The `SC19` no-write test: snapshot the target tree before and after a **red**
   `runDoctor` run and assert byte-for-byte equality.
5. Extend `tests/vocabulary.test.ts` (8/2/10), `tests/packaging.test.ts`
   (`EXPECTED_TEMPLATE_FILES` → 30, manifest still closed), `tests/cli.test.ts` (two
   commands, `--skills harny-doctor` is a `USAGE` error), `tests/skills-templates.test.ts`
   and `tests/skills-placement.test.ts` (discovery-driven, so mostly confirmation).
6. Documentation coherence in one pass (BG-15, BG-16): `AGENTS.md` (templates tree —
   which gains `doctor/` and `shared/`,
   the nine→ten skill statements, the quadrant table **and** the prose beneath it),
   `README.md:49,62,135,183` (including the two "eight skills" statements already stale
   before this feature), `templates/skills/README.md:4`.
7. Full-suite green, then `npm run build` before any e2e claim — `tests/e2e-init.test.ts`
   spawns `bin/harness.js`, which imports `dist/`, so an unbuilt `src/` change
   false-greens (`cli-init.md` reservation AL-20). This feature must not become AL-20's
   next victim.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1 — The `CommandSpec<K>` extraction is not a pure no-op** and ripples into `src/engine.ts` and all five generators, turning a Phase 1 refactor into a cross-cutting change | Low | High | Phase 1 step 1 gates on a clean `npm run typecheck` **before** anything else is added; no field is added, removed, or renamed. If call sites need edits, the extraction is wrong — revert and reconsider rather than adapting consumers |
| **R2 — A missing `.sdd/shared/probes.mjs` breaks both runners at import time.** Extracting the probe evaluator to one shared module (the approved design) removes drift risk entirely, but replaces it with a runtime coupling: a static ESM import of an absent file is `ERR_MODULE_NOT_FOUND` before any of the script's own code runs | Low | Medium | Three independent guards, each on the surface that can actually reach the state: `runDoctor` pre-flights **both** paths and raises `USAGE` with remediation (never a child stack trace); the CI step's `test -f` guard covers both files; and `init`'s all-or-nothing write (`CLI-5`) means a normal scaffold cannot produce a half-installed pair. The failure is deliberately loud rather than degraded — a harness that silently stops probing is the worse outcome. Both trees keep `shared/` as a sibling of each runner's directory, so the one specifier `../shared/probes.mjs` is correct in `templates/` and in `.sdd/` alike (BG-20) |
| **R2a — Modifying an archived feature's shipped artifact.** `templates/hooks/run-feedback.mjs` belongs to `agent-feedback-controls`; this feature edits it | Certain (by design) | Medium | `tests/hooks/run-feedback.test.ts` is treated as a regression oracle and must pass with **zero assertions modified** (BG-21); the fifth current-truth amendment (`feedback-controls.md` `I5`, `FC-13`) is declared in `contract.md` rather than discovered at audit; this repo's tracked `.sdd/feedback/run-feedback.mjs` and `.github/workflows/harny-feedback.yml` are regenerated in Phase 3, not left stale |
| **R3 — A readiness command leaks into a per-turn hook**, reintroducing exactly the slowness `src/feedback.ts:29–31` warns about | Low | High | Prevented at compile time by the `CommandSpec<K>` narrowing (BG-4), then re-asserted by the Phase 6 grep gate. Two independent mechanisms, because this is the feature's single worst failure mode |
| **R4 — `checks.json` turns permanently red** in repos with a legitimately pruned harness, training people to ignore the doctor (the same "trains people to delete it" failure `templates/hooks/README.md` names for hooks) | Medium | High | The `requires` gate on scaffolded-artifact entries; `checks.json` documented as user-editable generated data; skips reported as coverage, never as passes (BG-9). Phase 5 step 5 is a live proof on the hardest case — this repo |
| **R5 — `EXIT.NOT_READY = 6` collides** with a meaning some consumer already assigns to 6 | Low | Medium | `EXIT` is a closed set in `src/errors.ts` with no 6 today; the value is asserted in `tests/errors.test.ts` and reachable only from `runDoctor` (BG-6) |
| **R6 — The test-suite run makes `harny doctor` slow enough to be skipped** in practice | Medium | Medium | Scoped by design: the doctor runs at session start and before new spec work, never per turn — the boundary `harny-feedback` keeps (`G6`). The trailing summary line makes a long run legible rather than opaque |
| **R7 — The spec-state family misreads a feature directory** (e.g. a `Shipped:` string quoted inside prose) and reports a false positive | Medium | Low | The marker check is anchored to a header line, not a substring anywhere in the file; the shipped-but-unarchived rule requires **both** the header and an approved verdict; false positives are reported as `fail` lines naming the feature, which a human can dismiss without editing the runner |
| **R8 — `stdio: 'inherit'` leaves `runDoctor` unable to quote the failure** in its `NOT_READY` message | Low | Low | Deliberate: the runner has already printed the full report to the user's terminal; duplicating it in the error message would double every line. `DoctorResult` still carries the failed ids for programmatic callers |
| **R9 — AL-20 recurrence**: e2e passes against a stale `dist/` | Medium | Medium | Phase 6 step 7 makes `npm run build` explicit before any e2e claim; called out as a step, not left to habit |

## File Change Map

**Create**

- `templates/shared/probes.mjs` — CREATE — the single probe implementation
  (`probeSatisfied`/`scriptExists`/`binaryExists`/`anyFileExists`), **moved** out of
  `run-feedback.mjs`, imported by both generated runners (Phase 2)
- `templates/doctor/run-doctor.mjs` — CREATE — the canonical readiness runner; the one
  artifact that performs the four check families (Phase 2)
- `templates/doctor/README.md` — CREATE — tool-neutral canonical behavior document
  (`S7`), modelled on `templates/hooks/README.md` (Phase 2)
- `templates/skills/harny-doctor/SKILL.md` — CREATE — the shipped skill copy (Phase 5)
- `.agents/skills/harny-doctor/SKILL.md` — CREATE — the canonical dogfood copy (Phase 5)
- `.claude/skills/harny-doctor` — CREATE — relative symlink to the `.agents/` copy
  (`SL-2`), tracked by the existing `!.claude/skills/harny-*` rule (Phase 5)
- `src/doctor.ts` — CREATE — checks model, `buildDoctorChecks`, `buildDoctorFiles`,
  `runDoctor` (Phases 3–4)
- `.sdd/doctor/run-doctor.mjs` — CREATE — this repo's dogfood copy, byte-identical to
  the template (Phase 5)
- `.sdd/doctor/checks.json` — CREATE — this repo's generated checks data (Phase 5)
- `.sdd/shared/probes.mjs` — CREATE — this repo's dogfood copy of the shared module
  (Phase 3)
- `tests/doctor.test.ts` — CREATE — mirrors `src/doctor.ts` (Phase 6)
- `tests/doctor-runner.test.ts` — CREATE — subprocess-drives the canonical runner over
  fixture repos (Phase 6)

**Modify**

- `templates/hooks/run-feedback.mjs` — MODIFY — **an archived feature's shipped
  artifact**: the four probe functions removed (moved to `templates/shared/probes.mjs`),
  one import line added, module doc-comment corrected. No behavior change (Phase 2)
- `.sdd/feedback/run-feedback.mjs` — MODIFY — this repo's tracked dogfood copy,
  regenerated to match (Phase 3)
- `.github/workflows/harny-feedback.yml` — MODIFY — this repo's tracked workflow,
  regenerated for the two-file `test -f` guard (Phase 3)
- `src/feedback.ts` — MODIFY — `CommandSpec<K>` extraction; `FeedbackKind`/
  `ReadinessKind`/`ReadinessCommand`; `StackProfile.readiness`; both profiles' entries
  (Phase 1)
- `src/errors.ts` — MODIFY — `EXIT.NOT_READY = 6`, `HarnessErrorCode`, `EXIT_BY_CODE`
  (Phase 1)
- `src/vocabulary.ts` — MODIFY — `harny-doctor` appended last in `CORE_SKILL_IDS`;
  doc-comment corrected (Phase 1)
- `src/templates.ts` — MODIFY — `doctorRunner?`/`doctorReadme?` on `CanonicalTemplates`,
  loaded via `loadOptionalResource` (Phase 3)
- `src/engine.ts` — MODIFY — `SHARED_PROBES_PATH` + `buildRuntimeSharedFiles`; the CI
  runner guard extended to both files; `doctorRunner`/`sharedProbes` threaded onto
  `HarnessPayload` in `buildPayload` (Phase 3)
- `src/generators/cursor.ts`, `src/generators/claude-code.ts`, `src/generators/kiro.ts`
  — MODIFY — comment-only: the "byte-frozen / never modified" wording about the runner
  (Phase 2)
- `src/init.ts` — MODIFY — `buildDoctorFiles(...)` added to the **existing** step 11
  (Phase 3)
- `src/cli.ts` — MODIFY — the `doctor` command registration and `runDoctorCommand`
  (Phase 4)
- `tests/skills-fidelity.test.ts` — MODIFY — `DIVERGENCE_TABLE` entry for the tenth
  skill (Phase 5)
- `tests/vocabulary.test.ts` — MODIFY — 8 core / 2 optional / 10 total (Phase 6)
- `tests/packaging.test.ts` — MODIFY — `EXPECTED_TEMPLATE_FILES` → 30, including
  `templates/shared/probes.mjs` (Phase 6)
- `tests/hooks/run-feedback.test.ts` — **NOT MODIFIED, deliberately** — the regression
  oracle for BG-21; if this file needs an edit to pass, the extraction changed behavior
  and is wrong
- `tests/cli.test.ts` — MODIFY — two commands; `--skills harny-doctor` is a `USAGE`
  error (Phase 6)
- `tests/errors.test.ts` — MODIFY — `NOT_READY` → 6 (Phase 6)
- `tests/feedback.test.ts` — MODIFY — `readiness` entries; BG-4 leak assertions (Phase 6)
- `tests/engine.test.ts`, `tests/init.test.ts`, `tests/e2e-init.test.ts` — MODIFY — the
  three new generated paths (`.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`,
  `.sdd/shared/probes.mjs`) in write plans and expected trees
  (`tests/init.test.ts:584`, `tests/e2e-init.test.ts:136,504`); the written-exactly-once
  assertion extended to the shared module; `tests/engine.test.ts`'s byte-identity
  (`:496–510`) and CI-workflow assertions updated for the two-file guard (Phases 3, 6)
- `tests/templates.test.ts` — MODIFY — optional-resource loading for `templates/doctor/`
  (Phase 3)
- `AGENTS.md` — MODIFY — templates tree; nine→ten skills; seven→eight core; the
  feedforward-computational cell **and** the prose beneath it (Phase 6)
- `README.md` — MODIFY — lines 49, 62, 135, 183 (including the pre-existing "eight
  skills" staleness); the new `doctor` verb (Phase 6)
- `templates/skills/README.md` — MODIFY — line 4's "eight-skill" → ten (Phase 6)
