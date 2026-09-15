# Audit: readiness-doctor

> Seeded PENDING by `harny-propose`. Filled in by `harny-audit` after implementation.
> Every row traces to an `intent.md` requirement or a `contract.md` guarantee; nothing
> is listed that cannot be verified against a file, a test, or an observed command.

**Audit environment.** `npm run build` then `npm test`: **29 test files, 511 tests,
511 passing, 0 failing** (Node v24.16.0, offline). `node bin/harness.js doctor .`
against this repo after that build: **exit 0 — 21 ok, 0 skipped, 0 failed**. Both
figures re-confirmed after the F1/F2 remediation pass, against a fresh `npm run build`.

## Requirements Checklist

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | `harny-doctor` is the tenth skill and the eighth core skill; `CORE_SKILL_IDS`/`OPTIONAL_SKILL_IDS`/`SKILL_IDS` are 8/2/10 with `harny-doctor` last in core; `--skills none` still scaffolds it; naming it in `--skills` is a `USAGE` error | intent.md G1 / SC1 | PASS | `src/vocabulary.ts` appends `'harny-doctor'` after `'harny-feedback'`, every prior index preserved; doc-comment corrected in the same edit. Observed live: `init --skills none` into a scratch dir scaffolds `.claude/skills/harny-doctor/`; `--skills harny-doctor` exits 2 naming it as always-scaffolded (`tests/cli.test.ts`) |
| R2 | Both `SKILL.md` copies satisfy the shape contract (six frontmatter keys, `description` ≤ 1,536 chars, five body sections in order) and have a `DIVERGENCE_TABLE` entry | intent.md G1 / SC2 | PASS | Both copies `cmp`-identical. Frontmatter uses 5 of the 6 permitted `SL-3` keys (`name`, `description`, `license`, `compatibility`, `metadata`) — `allowed-tools` omitted, exactly as `harny-feedback` does; `SL-3` permits, it does not mandate, all six. `description` ~700 chars. Sections in order: title, When to use this, Inputs, Steps, Guardrails. `DIVERGENCE_TABLE` entry `'harny-doctor': { kind: 'byte-identical' }` |
| R3 | `.claude/skills/harny-doctor` is a tracked relative symlink, not a copy, with no `.gitignore` change | intent.md G1 / SC3 | PASS | `ls -l` shows `.claude/skills/harny-doctor -> ../../.agents/skills/harny-doctor`; `git check-ignore -v` reports it matched by the pre-existing `!.claude/skills/harny-*` re-inclusion (line 6), i.e. trackable with no `.gitignore` edit. `git diff -- .gitignore` is empty |
| R4 | One canonical `.mjs` readiness script, written byte-identically and exactly once per run, ending in exactly one `\n` | intent.md G2 / SC4 | PASS | `cmp` of `.sdd/doctor/run-doctor.mjs` vs `templates/doctor/run-doctor.mjs` and `.sdd/shared/probes.mjs` vs `templates/shared/probes.mjs` both clean. Trailing bytes of all three generated artifacts in a scratch scaffold are `3b0a`/`7d0a`/`7d0a` — exactly one `\n`. Write-once asserted for 1/3/5 tool selections (`tests/engine.test.ts:418`, `tests/e2e-init.test.ts:547–549`) |
| R5 | Zero dependencies added; only Node builtins already demonstrated in `run-feedback.mjs`; runs on Node ≥ 20.19.0 | intent.md G2 / SC5 | PASS | `package.json`/`package-lock.json` unmodified in the whole diff. `run-doctor.mjs` imports only `node:fs`, `node:path`, `node:child_process` plus the relative `../shared/probes.mjs`; `probes.mjs` only `node:fs`, `node:path`. `src/doctor.ts` adds `node:process` (`process.execPath`), already a builtin |
| R6 | All four check families run, one line per check; a correctly scaffolded repo exits 0; a deleted harness file exits non-zero with a code distinct from an internal error | intent.md G3 / SC6 | PASS | Observed live on this repo (21 ok / exit 0) and on a scratch scaffold. Deleting `.claude/skills/harny-sync/` from a scratch scaffold produced `FAIL core-skills:.claude/skills/harny-sync - run npx harny init and commit .claude/skills/harny-sync/SKILL.md`, runner exit 2 / verb exit 6 — both distinct from the runner-internal code 1 (`tests/doctor-runner.test.ts` "bad --checks" block) |
| R7 | A feature dir missing a schema file, and a shipped-but-unarchived feature, are each reported by name | intent.md G3 / SC7 | PASS | `run-doctor.mjs:180–215`; both conditions required for the shipped rule (`shipped && approved`), each covered plus both one-sided negatives in `tests/doctor-runner.test.ts:216–266` |
| R8 | An absent tool is skipped with a notice, never failed; skips are reported as coverage, not as passes | intent.md G3 / SC8 | PASS | One shared evaluator (`probeSatisfied`) gates both `require` entries and `commands`; `skip` increments its own counter and the summary line reports `N ok, M skipped, K failed` separately. Verified live: the pre-dogfood run printed `SKIP` lines for the `.sdd/harness.json`-gated entries while still exiting on the fail count only |
| R9 | No complete test-suite command string outside `src/feedback.ts` and generated data | intent.md G4 / SC9 | PASS | `tests/feedback.test.ts:235–295` scans every file under `src/`, `templates/`, `.agents/skills/` for each profile's `argv.join(' ')`, now including `readiness` — green |
| R10 | An existing file at either generated path without `--force` writes **nothing at all** and exits 3; `--force` overwrites; no merge/managed-block behavior exists anywhere | intent.md G5 / SC10 | PASS | Verified live: a pre-existing `/tmp/sc10/.sdd/doctor/run-doctor.mjs` made `init` print `Refusing to overwrite 1 existing file(s)` and exit 3; the tree afterwards contained *only* that file and its contents were untouched. Inherited from `planWrites`/`applyWrites` with no special case. **Coverage gap:** no test targets the three new paths specifically — see F6 |
| R11 | `harny-feedback`'s two triggers are unchanged (diffable), and `harny-doctor` references it by name rather than describing it | intent.md G6 / SC11 | PASS | `git status` shows neither `harny-feedback/SKILL.md` copy modified (zero-byte diff). `harny-doctor`'s `## When to use this` names the two `harny-feedback` triggers only to disclaim them; no lint/type-check command, no severity definition, no per-turn trigger anywhere in its body |
| R12 | `AGENTS.md`'s feedforward-computational cell is filled **and** the contradicting prose beneath it is rewritten | intent.md G7 / SC12 | PASS | The cell now names `templates/doctor/run-doctor.mjs` and the `harny-doctor` skill; the bullet list beneath was split into "Feedforward, computational" / "Feedforward, inferential" and the "there is no feedforward-computational quadrant in this repo today" sentence is gone (grep returns nothing) |
| R13 | Every skill-count statement in the repo agrees, including the two already stale before this feature | intent.md G7 / SC13 | PARTIAL | The four enumerated lines were corrected (`README.md:49,62,135,183` → ten/eight; `AGENTS.md` nine→ten, seven→eight; `templates/skills/README.md:4` eight→ten). **`README.md:152–155` were not**: they still read "7 core skills", "9 skills per root (7 core + 1 default + 1 non-default)", "9 skills per root instead of 8", "45 skill artifacts (9 per root)", so README now contradicts itself between line 69 and line 152. See F4. `templates/skills/README.md` / `.agents/skills/README.md` "Adding a ninth skill" also unchanged (F9) |
| R14 | `EXPECTED_TEMPLATE_FILES` updated; manifest still closed; `src/`, `tests/`, `specs/` still excluded | intent.md G7 / SC14 | PASS | `tests/packaging.test.ts` asserts length 30 and every path; `find templates -type f \| wc -l` = 30, so the manifest is exactly closed; the `src/`/`tests/`/`specs/` exclusion assertions are untouched |
| R15 | This repo's scaffolded readiness script is byte-identical to generated output | intent.md G7 / SC15 | PASS | `cmp` clean for `.sdd/doctor/run-doctor.mjs`, `.sdd/shared/probes.mjs`, `.sdd/feedback/run-feedback.mjs`, and all five `.sdd/spec-schema/*.md`. `.sdd/doctor/checks.json` regenerated in-process via `buildDoctorChecks(validateConfig(.sdd/harness.json), [claudeCode])` is string-equal to the committed file; `serializeConfig(validateConfig(...))` round-trips `.sdd/harness.json` byte-identically. No automated test asserts this (F2's sibling — recorded under Test Coverage) |
| R16 | `--help` lists exactly two commands and still reads `Usage: harny [options] [command]` | intent.md G8 / SC16 | PASS | Observed: `Commands: init [options] [target]`, `doctor [options] [target]`, plus commander's built-in `help`; asserted as `['init','doctor']` over `program.commands` in `tests/cli.test.ts:126`, with the `Usage:` header asserted alongside |
| R17 | A red readiness run exits with a code distinct from 1 and from every existing `HarnessErrorCode` mapping | intent.md G8 / SC17 | PASS | `EXIT.NOT_READY = 6`, `EXIT_BY_CODE.NOT_READY = EXIT.NOT_READY`; observed exit 6 live on a scratch scaffold with a deleted core skill; `tests/cli.test.ts:207–208` asserts 6 and `not.toContain` over `[0,1,2,3,4,5,130]` |
| R18 | Running the verb with no scaffolded script is a `USAGE` error naming the path and remediation — never a stack trace | intent.md G8 / SC18 | PASS | Observed against an empty dir: two lines naming both missing paths and `npx harny init`, exit 2, no stack trace. Pre-flight checks **both** `DOCTOR_RUNNER_PATH` and `SHARED_PROBES_PATH` before any spawn (`src/doctor.ts:267–283`) |
| R19 | The verb writes nothing under any flag combination, including on a red run | intent.md G8 / SC19 | PASS | `src/doctor.ts` has no write call of any kind; `spawnSync` uses `stdio: 'inherit'` and never creates a directory. Proven at the unit level over a red run (`tests/doctor.test.ts:314`) and at the CLI level over a red run plus a `--stack` override (`tests/cli.test.ts:211–254`). **Caveat on test scope:** neither CLI run actually spawns a readiness command — see F7 |
| R20 | The verb and a direct `node` invocation agree on checks and exit code for the same repo state | intent.md G8 / SC20 | PASS | Verified live, twice: on this repo (`diff` of the two outputs empty, 0 vs 0) and on a scratch scaffold green (identical, 0 vs 0) and red (identical modulo the verb's one extra `NOT_READY` message line, verb 6 / runner 2 — the contracted mapping). Structurally guaranteed: the verb passes `buildDoctorChecks`' output to the same script. **No automated test asserts it** — see F2 |
| R21 | Amendments SL-1, FC-9, CLI-10, CLI-2 and `feedback-controls.md` I5/FC-13 are all applied in `specs/current/` — none silently skipped, none applied beyond what was declared | intent.md § Constraints; contract.md § "Modified: `run-feedback.mjs`" | N/A at audit time — DEFERRED BY DESIGN, tracked as a ship gate | **Re-audited after F1's resolution.** All five amendments are now **uniformly deferred** to `harny-sync`/`harny-document` at the archive stage, which is the correct owner: `specs/current/_index.md:3` states *"Current truth for this repo. Maintained by `harny-sync`; do not hand-edit."*, and commit `4ef809b` shows the prior feature's amendments landing in its ship commit. `git status --porcelain specs/` now reports only the untracked `specs/readiness-doctor/` — `specs/current/` is byte-untouched by this feature. Each amendment remains declared in `intent.md` § Constraints and `contract.md` (SL-1→ten, FC-9→8/2/10, CLI-10→30, CLI-2→`NOT_READY` row, I5/FC-13→two-file runtime + the dogfood set), so none is silently skipped. **Ship gate:** `harny-sync` must apply all five, including the FC-13/I5 pair, before or in the ship commit — five current-truth statements are false against the committed code until it does |

## Contract Compliance

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | `CommandSpec<K>` extraction is a pure no-op: `FeedbackCommand` unchanged in shape, no consumer edited | PASS | `git diff -- src/feedback.ts` shows the five fields moved verbatim into `CommandSpec<K>` with `kind: K` the only change; `FeedbackCommand` is re-expressed as `CommandSpec<FeedbackKind>`. `git diff --stat` over `src/engine.ts`'s command-consuming code and all five `src/generators/*.ts` shows only comment-only edits (the "byte-frozen" wording), no call-site change. `npm run typecheck` clean |
| C2 | `StackProfile.readiness` populated for both profiles with the pinned argv/probe | PASS | `src/feedback.ts`: typescript → `{ id:'npm-test', kind:'test', argv:['npm','test'], pathMode:'whole-project', requires:{script:'test'} }`; python → `{ id:'pytest', …, argv:['pytest','-q'], requires:{binary:'pytest'} }`. Full-shape equality asserted in `tests/feedback.test.ts:350–378` |
| C3 | BG-1 — four families in fixed order, one `ok`/`skip`/`fail` line per check | PASS | `run-doctor.mjs` numbered blocks 1–4 (`:138`, `:149`, `:162`, `:217`); a single `emit()` is the only line producer. Observed live on this repo: environment → manifest → spec-state → tests, then the summary line. `tests/doctor-runner.test.ts:169` asserts the family order |
| C4 | BG-2 — a failing check never aborts the run; every check is evaluated | PASS | No `return`/`process.exit` inside any family loop; all output is buffered into `lines` and printed once, with `process.exit` reached only after the loops (`:238`). `tests/doctor-runner.test.ts:419` asserts a failing `require` entry does not prevent later entries or the tests family |
| C5 | BG-3 — `run-doctor.mjs` holds no command/stack/spec/verdict literal; one import only | PARTIAL | No command string, stack name, spec-directory name, `Shipped:` or verdict literal appears — all arrive via `--checks`; exactly one import (`../shared/probes.mjs`); bytes identical across a `--stack typescript` and a `--stack python` repo (the file is a verbatim copy in both). **But two schema-file names are hard-coded**: `'intent.md'` (`:200`) and `'audit.md'` (`:201`), which BG-3's "no schema file name" forbids and `templates/doctor/README.md` behavior 6 repeats as a claim. The contract's own `DoctorChecksFile` carries no field able to convey them, so the deviation was not avoidable as specified. See F3 |
| C6 | BG-4 — no `ReadinessCommand` reaches any hook config or the CI workflow; `kind: 'test'` in `commands` is a compile error | PASS | Both mechanisms verified independently. (1) Type-level: a scratch `src/__bg4probe.ts` assigning `kind:'test'` into `StackProfile.commands` produced `TS2322: Type '"test"' is not assignable to type 'FeedbackKind'`; scratch file removed. (2) Grep: `tests/feedback.test.ts:409–444` scans real generator `renderHook` **output** and the **generated** CI workflow (not source) for every readiness id — and the committed `.github/workflows/harny-feedback.yml` inline JSON contains only `eslint`/`tsc` |
| C7 | BG-5 — the `FC-1` grep gate extended to the `test` kind | PASS | `tests/feedback.test.ts:271–292`: `readinessCommandStrings` folded into the same offending-file scan over `src/`, `templates/`, `.agents/skills/` |
| C8 | BG-6 — exit codes total and disjoint: runner 0/2/1 → `EXIT.OK`/`EXIT.NOT_READY`/`EXIT.UNEXPECTED` | PASS | `src/doctor.ts:301–313` — `0` ⇒ `{ready:true}`; `2` ⇒ `HarnessError('NOT_READY')`; anything else ⇒ plain `Error` naming the observed code and the runner path (→ `EXIT.UNEXPECTED` via `main`). Runner side: `fail()` ⇒ 1, `failCount>0 ? 2 : 0`. All three translations tested (`tests/doctor.test.ts:259–299`) |
| C9 | BG-7 — verb and direct invocation share one implementation via `buildDoctorChecks` | PASS | `runDoctor` spawns the same `.sdd/doctor/run-doctor.mjs` with `buildDoctorChecks`' output as inline `--checks`; no check logic exists in `src/doctor.ts`. Verified live on three repo states (see R20). No automated test (F2). Note: `DoctorResult.skipped`/`.failed` are structurally always `[]` — see F5 |
| C10 | BG-8 — unresolved stack is non-fatal; exit 0 still reachable | PASS | `buildDoctorChecks` ends `commands: profile?.readiness ?? []`; the runner emits one `skip` notice for an empty `commands` and continues. `tests/doctor.test.ts:139` (no throw, empty array) and `tests/doctor-runner.test.ts:293` (every other family runs, exit 0). Observed live via `--stack some-unrecognized-stack-xyz` |
| C11 | BG-9 — false probe ⇒ skip with notice, never failure, at both entry and command level | PASS | One evaluator, two call sites (`run-doctor.mjs:151` for `require` entries, `:219` for commands), both `continue`-after-`emit('skip')`. `tests/doctor-runner.test.ts:197` (entry-level) and `:269` (command-level, still exit 0) |
| C12 | BG-10 — missing-schema-file and shipped-but-unarchived both reported by feature name; `current`/`archived` never treated as features | PASS | `run-doctor.mjs:170–215`; `reservedDirs` filtered out of the `readdirSync` result. `tests/doctor-runner.test.ts:217/231/243/255/309`. Marker check is line-anchored (`line.trim().startsWith(shippedMarker)`) per roadmap R7; the verdict check is a whole-file substring match, which R7 explicitly accepts as a tolerable false-positive source |
| C13 | BG-11 — `.sdd/doctor/run-doctor.mjs` and `.sdd/shared/probes.mjs` byte-identical to their templates; all three artifacts obey `CLI-5` | PASS | `cmp` clean for both; `CLI-5` confirmed empirically (exit 3, nothing written, existing file untouched — see R10). No dedicated conflict test for these paths (F6) |
| C14 | BG-12 — core-tier membership and ordering | PASS | `tests/vocabulary.test.ts` (8/2/10, last in core) plus the live `--skills none` scaffold |
| C15 | BG-13 — both skill roots at parity with an explicit divergence entry | PASS | `tests/skills-fidelity.test.ts:247` (`DIVERGENCE_TABLE`) and the targeted byte-identity block at `:392`; the generic bijection also passes, so no tenth-skill omission could slip through |
| C16 | BG-14 — no lint/type-check command, severity definition, or per-turn trigger in `harny-doctor` | PASS | Full read of both `SKILL.md` copies: no command string anywhere; severity mapping delegated by name to `harny-audit`; the per-turn and before-marking-a-task-done triggers appear only as an explicit disclaimer pointing at `harny-feedback` |
| C17 | BG-15 — every count statement agrees | PARTIAL | See R13 / F4 — `README.md:152–155` still carry "7 core skills" and "9 skills per root (7 core + …)" |
| C18 | BG-16 — quadrant table and its prose agree | PASS | See R12; the contradicting sentence is gone and the replacement bullet explicitly records that it was corrected rather than left standing |
| C19 | BG-17 — `buildDoctorChecks` pure and deterministic; no timestamp, no absolute path | PASS | Pure function of `(config, generators)`; the only ordering source is `dedupePreserveOrder` over a deterministic input. `tests/doctor.test.ts:71` (two calls byte-identical), `:82` (no timestamp, no absolute path). Independently confirmed: regenerating `.sdd/doctor/checks.json` in-process reproduces the committed bytes exactly |
| C20 | BG-18 — no dependency added; the shared import is relative, never a package specifier | PASS | `package.json`/lockfile untouched; both runners import `'../shared/probes.mjs'` — a relative file specifier, so resolution never leaves the target repo |
| C21 | BG-19 — exactly one probe implementation; the four identifiers appear in `templates/shared/probes.mjs` and on import lines only | PASS | Repo-wide grep over `templates/` and `.sdd/`: the four identifiers occur only in `probes.mjs` (definitions), on the two import lines, and as prose in `templates/doctor/README.md`. Both runners alias the import (`probeSatisfied as requirementMet`) so no call site re-states the name — recorded in Task 2.5, and it is the mechanism the gate at `tests/doctor-runner.test.ts:368–417` actually asserts |
| C22 | BG-20 — the identical `../shared/probes.mjs` specifier is correct in both the `templates/` and `.sdd/` trees | PASS | Byte-identical specifier in all four files (`templates/{hooks,doctor}/…`, `.sdd/{feedback,doctor}/…`). Proven at runtime by `tests/hooks/run-feedback.test.ts` spawning the runner **in place** under `templates/` with `cwd` set to a tmpdir, and by `.sdd/doctor/run-doctor.mjs` running from the repo root |
| C23 | BG-21 — `run-feedback.mjs`'s observable behavior unchanged across all three modes | PASS | Oracle: `tests/hooks/run-feedback.test.ts` unmodified — `git diff` over that path is **zero lines** and `git status --porcelain -- tests/hooks/` is empty. 13/13 green in the full run. The source diff is a pure extraction: four function bodies deleted verbatim, one import added, two call sites renamed to the alias, doc-comment extended. `accumulate`/`run`/`run --whole-project` logic untouched |
| C24 | § Data Models — the eight `require` entries in the pinned order, every path constant imported from its owning module (`S5`), none re-typed | PASS | `buildDoctorChecks` emits the eight row *kinds* in the contract's table order, with `spec-schema`/`conductor`/`core-skills` expanded per member (Task 3.2's recorded refinement — required so a single deleted file is caught rather than only an all-alternatives-gone case). Constants imported: `HARNESS_CONFIG_PATH`/`SPEC_SCHEMA_DIR`/`skillRootsFor` from `src/engine.ts`, `FEEDBACK_RUNNER_PATH`/`CI_WORKFLOW_PATH` from `src/feedback.ts`, `SPEC_SCHEMA_NAMES` from `src/templates.ts`, `CORE_SKILL_IDS` from `src/vocabulary.ts`, `conductorPath` from each `Generator`. Asserted by `tests/doctor.test.ts:96` |
| C25 | § "Public API — `src/errors.ts`" — `NOT_READY` reachable **only** from `runDoctor`; `EXIT_BY_CODE` remains the only mapping | PASS | Repo-wide, the only `'NOT_READY'` construction site in `src/` is `src/doctor.ts:305`; `EXIT_BY_CODE` gained one row and is still the sole mapping consulted by `main`. `tests/errors.test.ts` pins 6 |
| C26 | § "Public API — `src/cli.ts`" — `init`'s action, flags and behavior untouched; the verb carries `[target]` and `--stack` only | PASS | The `init` registration block is byte-unchanged in the diff; the new command declares exactly `[target]` (default `'.'`) and `--stack <name>`, reuses `assertWritableDirectory` (which only `stat`s — it writes nothing), and never calls `process.exit` |
| C27 | § State Changes — `.sdd/shared/probes.mjs` emitted from exactly one call site; never duplicated in the write plan | PASS | `buildRuntimeSharedFiles` is the only producer of `SHARED_PROBES_PATH`, called once in `runInit`; `buildFeedbackFiles`/`buildDoctorFiles` do not emit it. `tests/engine.test.ts:418` asserts exactly one entry for 1/3/5 tool selections; `tests/e2e-init.test.ts:549` asserts it on a real spawned run |
| C28 | § "Modified: `run-feedback.mjs`" — CI `test -f` guard covers both files; this repo's tracked runner and workflow regenerated, not hand-edited | PASS | Guard is now `test -f .sdd/feedback/run-feedback.mjs -a -f .sdd/shared/probes.mjs`, with the notice naming both and `commit both`. `tests/engine.test.ts:752` asserts both paths. The committed workflow's only diff is that one line (the inline commands JSON is byte-identical), which is exactly what a regeneration produces; the three generator comments were corrected without weakening their substantive claim |
| C29 | § Integration Points — `buildDoctorFiles` joins the existing step 11; `CLI-1`'s 13-step wording still describes the code verbatim | PASS | `src/init.ts`: the two `files.push(...)` calls sit between the feedback block and the unmoved `// 12. Plan writes.`; `// 10.`→`// 11.`→`// 12.`→`// 13.` numbering intact. `CLI-1`'s twelve-arrow sequence in `specs/current/cli-init.md:18–24` still matches the code. `runInit` remains unreachable from the `doctor` path |
| C30 | Error Handling Contract — all rows behave as specified, including the three module-resolution rows | PARTIAL | Fourteen data rows (the row itself says "fifteen"; the table has fourteen — F15). Thirteen verified by test and/or live observation, including both missing-artifact pre-flight rows, the `--checks` rows, the CONFLICT row, the lean-fixture row, and the unreadable-feature-dir row. **Row 2** ("`.sdd/shared/probes.mjs` missing when a per-turn hook fires ⇒ `ERR_MODULE_NOT_FOUND`, exit 1, wrapper still exits 0") has **no test** — `tests/generators/cursor.test.ts` was updated to always provide the sibling module, so the failure mode it describes is never exercised (F14) |

## Test Coverage

> All 29 test files / 511 tests pass on a post-`npm run build` offline run. Statuses
> below reflect verification of each row against the named file, not merely a green
> suite.

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | `buildDoctorChecks` determinism, entry order, no timestamp/absolute path | PASS | `tests/doctor.test.ts:71,82,96,125,139` |
| T2 | `buildDoctorFiles`/`buildRuntimeSharedFiles` tolerate a lean fixture templates root | PASS | `tests/doctor.test.ts:150,157` |
| T3 | `runDoctor`'s three exit translations against a stub runner | PASS | `tests/doctor.test.ts:259,268,284` |
| T4 | `runDoctor` pre-flights both required paths; missing either ⇒ `USAGE` naming it | PASS | `tests/doctor.test.ts:222,240` — covers both-missing and runner-present/module-missing |
| T5 | No-write proof: target tree byte-identical before and after a **red** run | PASS | `tests/doctor.test.ts:314`; CLI-level twin at `tests/cli.test.ts:211` (scope caveat F7) |
| T6 | Runner over a ready fixture repo ⇒ exit 0, one line per family | PASS | `tests/doctor-runner.test.ts:169` |
| T7 | Runner over a repo with a deleted harness file ⇒ exit 2, path + remediation named | PASS | `tests/doctor-runner.test.ts:197` |
| T8 | Runner over a feature dir missing a schema file ⇒ feature named | PASS | `tests/doctor-runner.test.ts:217` |
| T9 | Runner over a shipped-but-unarchived feature ⇒ feature named; requires both marker and verdict | PASS | `tests/doctor-runner.test.ts:231,243,255` — the positive case plus both one-sided negatives |
| T10 | Runner with an absent test runner ⇒ skip notice, exit 0 | PASS | `tests/doctor-runner.test.ts:269` |
| T11 | Runner with an unrecognized stack ⇒ escape-hatch notice, other families still run | PASS | `tests/doctor-runner.test.ts:293` |
| T12 | `current`/`archived` are never treated as feature directories | PASS | `tests/doctor-runner.test.ts:309` — fixture gives them ship/approve-looking text and no schema files |
| T13 | Single-implementation gate: the four probe identifiers appear in both runners only on the import line | PASS | `tests/doctor-runner.test.ts:379,392,405` |
| T14 | Leak gate: no readiness command id in any generated hook config or the CI workflow | PASS | `tests/feedback.test.ts:410` — greps generated output, not source; independently confirmed against the committed workflow |
| T15 | Literal gate: test-command strings only in `src/feedback.ts` and generated data | PASS | `tests/feedback.test.ts:236` |
| T16 | `readiness` entries present and correctly probed for both profiles | PASS | `tests/feedback.test.ts:350,365,380,394` |
| T17 | Skill counts 8/2/10, `harny-doctor` last in core | PASS | `tests/vocabulary.test.ts` (also amended: `tests/config.test.ts`, `tests/engine.test.ts`) |
| T18 | `EXPECTED_TEMPLATE_FILES` = 30 including `templates/shared/probes.mjs`; manifest closed; `src/`/`tests/`/`specs/` excluded | PASS | `tests/packaging.test.ts:71–96`; `find templates -type f` = 30 confirms exact closure |
| T19 | Two commands registered; `--skills harny-doctor` ⇒ `USAGE`; help header unchanged | PASS | `tests/cli.test.ts:110,126,129,140` |
| T20 | `NOT_READY` maps to 6 | PASS | `tests/errors.test.ts` |
| T21 | Write plans and output trees include all three new paths; shared module written exactly once | PASS | `tests/init.test.ts:608,718+`, `tests/e2e-init.test.ts:165–167,547–549`, `tests/engine.test.ts:418` |
| T22 | Generated runner/shared module byte-identical to templates; CI workflow carries the two-file guard | PASS | `tests/engine.test.ts:~496,752` |
| T23 | Optional-resource loading for `templates/doctor/` and `templates/shared/` | PASS | `tests/templates.test.ts` |
| T24 | Tenth skill present in every skill root with an explicit divergence entry | PASS | `tests/skills-fidelity.test.ts:247,392`; `tests/skills-placement.test.ts`, `tests/skills-templates.test.ts` pass discovery-driven with no edit |
| T25 | **Regression oracle, unmodified**: all existing `run-feedback.mjs` behavior across `accumulate`, `run`, `run --whole-project` | PASS — CONFIRMED UNMODIFIED AND GREEN | `tests/hooks/run-feedback.test.ts` — `git diff` over the path is zero lines; `git status --porcelain -- tests/hooks/` empty; 13/13 green |
| T26 | **(Added by audit — MISSING, now disclosed.)** `npx harny doctor` and `node .sdd/doctor/run-doctor.mjs` agree on checks and on ready/not-ready for the same repo state (SC20 / BG-7 / C9) | MISSING (disclosed) | none — verified manually by this audit only. `tests/doctor.test.ts`'s header now lists SC20 under "Does NOT cover" with the reason, so no file falsely claims it. See F2 |
| T27 | **(Added by audit — MISSING.)** A pre-existing file at `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json` or `.sdd/shared/probes.mjs` makes `init` write nothing and exit 3; `--force` overwrites (SC10 / BG-11) | MISSING | none — verified manually by this audit only. See F6 |
| T28 | **(Added by audit — MISSING, now disclosed.)** This repo's own `.sdd/doctor/*`, `.sdd/shared/*`, `.sdd/harness.json` and `.sdd/spec-schema/*` match what the real code path generates (SC15) | MISSING (disclosed) | none — verified manually by this audit (`cmp` + in-process regeneration). `tests/doctor.test.ts`'s header now lists SC15 under "Does NOT cover". See F2 |
| T29 | **(Added by audit — MISSING.)** A per-turn hook firing with `.sdd/shared/probes.mjs` absent fails loudly (`ERR_MODULE_NOT_FOUND`, exit 1) while the tool wrapper still exits 0 (Error Handling Contract row 2 / roadmap R2) | MISSING | none — `tests/generators/cursor.test.ts` now always provisions the sibling module. See F14 |

## `harny-standards` compliance (S1–S7)

Checked against `AGENTS.md` § "Coding standards" read live (the single source; nothing
restated here).

| Std | Status | Evidence |
|---|---|---|
| S1 | PASS | `src/doctor.ts` is TypeScript/ESM with `node:`-prefixed builtins and `.js`-suffixed relative imports throughout; both `.mjs` artifacts are ESM with an explicit-extension relative specifier |
| S2 | PASS with one recorded deviation | `HarnessError` is used for both deliberate error conditions (`USAGE`, `NOT_READY`); `EXIT_BY_CODE` gained one row and remains the only mapping; `process.exit` is never called from `src/`. The plain `Error` for an unexpected runner exit code is contract-pinned — see F12 |
| S3 | PASS | `buildDoctorChecks` is pure and byte-deterministic (tested, and independently reproduced against the committed `checks.json`); every generated path is relative and inside `targetDir`; all three artifacts end in exactly one `\n` (verified byte-wise) |
| S4 | PASS | `package.json` and `package-lock.json` are untouched in the entire diff; `contract.md` § Dependencies declares "none added" and that holds |
| S5 | PASS | Every path constant in `buildDoctorChecks` is imported from its owning module; `SHARED_PROBES_PATH` is owned by `src/engine.ts` (the cross-subsystem path owner), not duplicated in `src/doctor.ts` or `src/feedback.ts`. Asserted by `tests/doctor.test.ts:96` |
| S6 | PASS with one recorded deviation | `tests/doctor.test.ts` mirrors `src/doctor.ts`; every touched test file carries a `Spec:`/`Covers:` header naming this feature; the default run is fully offline. Deviations: the runner test's path, and contract ids inside `describe`/`it` strings — both repo-wide conventions rather than this feature's invention. See F13 |
| S7 | PASS | `templates/doctor/README.md` states each of the four families as behavior first and names no tool as the only possibility; the runner and the shared module are tool-neutral by construction. The three generator comments that implied a "byte-frozen" single file were corrected without weakening their substantive claim |

## `harny-feedback` verification (audit Step 6a)

- **Per-turn hook**: registered and live in `.claude/settings.json` (`PostToolUse`
  accumulate + `Stop` run). Turn files are consumed and removed per turn, so the
  accumulator directory is empty at audit time and the hook's firing cannot be proven
  from residue; the indirect evidence that its findings were heeded is that
  `npm run typecheck` is clean and the mapped `tsc` command passes.
- **CI workflow**: present and regenerated for the two-file guard. Latest run
  `34853159815` — conclusion `success`, and the runner's trailing summary reads
  `harny-feedback: 1 of 2 command(s) ran, 1 skipped.` — `N = 1 > 0`, so this is **not**
  a green-having-run-nothing gap (`eslint` skips legitimately; this repo ships no ESLint
  config). **Gap**: that run predates every change in this feature — see F8.

## Audit Log

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-14 | `harny-audit` (sdd-auditor) | **F1 — The five declared current-truth amendments were inconsistently handled.** As first observed: `FC-13` had been hand-edited in `specs/current/feedback-controls.md` while `SL-1`, `FC-9`, `CLI-10`, `CLI-2`/`NOT_READY` and `I5` were not, leaving the set half-applied and `specs/current/` holding four statements the committed code falsifies | HIGH | **RESOLVED 2026-09-14 (human decision, re-verified by this audit).** Resolved in the opposite direction from the audit's first recommendation, and correctly so: `specs/current/_index.md:3` states *"Maintained by `harny-sync`; do not hand-edit"*, which makes the FC-13 hand-edit — not the four deferrals — the actual deviation. The hand-edit was reverted (`git diff --stat specs/current/feedback-controls.md` empty; `git status --porcelain specs/` reports only the untracked `specs/readiness-doctor/`, so `specs/current/` is byte-untouched by this feature), and `tasks.md:230–243` records the correction and its reasoning. All five amendments stay declared in `intent.md` § Constraints and `contract.md`, uniformly deferred to `harny-sync` at the archive stage — none silently skipped. **Residual ship gate**, carried into the verdict: `harny-sync` must apply all five before or in the ship commit |
| 2026-09-14 | `harny-audit` | **F2 — `SC20`/`BG-7`/`C9` (and `SC15`) have no automated test, while `tests/doctor.test.ts`'s header claimed both.** No test drives both invocation paths against one fixture and compares them. Manually verified green by this audit on three repo states: this repo (identical output, 0/0), a scratch scaffold green (identical, 0/0), and the same scaffold red (identical modulo the verb's extra `NOT_READY` line; verb 6, runner 2) | HIGH | **RESOLVED 2026-09-14 as a disclosure fix (human decision, re-verified).** `tests/doctor.test.ts`'s header no longer claims `SC15`/`SC20`; it now lists both under an explicit "Does NOT cover" paragraph naming the reason for each and stating they hold at runtime but are untested by that file. No test logic changed, so the false-coverage claim — the part that could mislead a future reader into thinking the guarantee was protected — is gone. **Residual, accepted as an open reservation:** T26 and T28 remain MISSING; `SC20`/`BG-7` is protected by structure (`runDoctor` passes `buildDoctorChecks`' output to the same script and holds no check logic) and by this audit's manual verification, not by a test |
| 2026-09-14 | `harny-audit` | **F3 — `BG-3` is violated by two hard-coded schema-file names.** `templates/doctor/run-doctor.mjs:200–201` reads `'intent.md'` and `'audit.md'` as literals; `BG-3` forbids "no schema file name" in the runner and `templates/doctor/README.md` behavior 6 repeats that claim to every downstream repo. The contract's own `DoctorChecksFile` provides no field able to carry which file holds the marker and which holds the verdict, so full compliance was unreachable as specified. Functional impact is nil (the runner's bytes still never vary by stack or tool) | MEDIUM | Either extend `DoctorChecksFile.specs` with the two role-bearing file names (a contract amendment) or narrow `BG-3`'s wording and `README.md` behavior 6 to match what shipped. Do not leave the guarantee and the artifact disagreeing |
| 2026-09-14 | `harny-audit` | **F4 — `BG-15`/`SC13` incomplete: `README.md:152–155` still carry pre-feature skill counts.** "7 core skills", "9 skills per root (7 core + 1 default `harny-standards` + 1 non-default `harny-adr`)", "9 skills per root instead of 8", "45 skill artifacts (9 per root)", and the 22/63/81 file totals. README now contradicts itself between line 69 ("Eight skills are always scaffolded") and line 152. This is the same class of staleness `SC13` was chartered to eliminate, in the same file it names | MEDIUM | Update lines 152–155 to eight core / ten total and recompute the three file totals against the current generated set (which also gained `.sdd/doctor/run-doctor.mjs`, `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`) |
| 2026-09-14 | `harny-audit` | **F5 — `DoctorResult.skipped` and `.failed` are structurally dead.** `runDoctor` returns `{ ready: true, ran: <every id>, skipped: [], failed: [] }` on success and throws on red, so neither field is ever non-empty and `ran` never distinguishes ran-from-skipped. `stdio: 'inherit'` gives the parent no channel to observe per-check outcomes. Roadmap R8's mitigation — "`DoctorResult` still carries the failed ids for programmatic callers" — is therefore not delivered | MEDIUM | Either have the runner emit a machine-readable tail (e.g. a final JSON line on fd 1 or a `--report` path) so the three fields can be populated, or narrow the `DoctorResult` interface to what is actually knowable and strike R8's claim |
| 2026-09-14 | `harny-audit` | **F6 — No test covers `CLI-5` on the three new generated paths**, although `SC10` and `BG-11` both name it explicitly ("all three generated artifacts are subject to `CLI-5` with no special case"). Verified manually instead: a pre-existing `.sdd/doctor/run-doctor.mjs` caused `init` to print `Refusing to overwrite 1 existing file(s)`, exit 3, write nothing, and leave the file byte-unchanged | MEDIUM | Add T27, mirroring the existing skill-path conflict test at `tests/init.test.ts:192` |
| 2026-09-14 | `harny-audit` | **F7 — The `SC19` CLI test no longer exercises the path its own rationale names.** Both runs in `tests/cli.test.ts:211–254` are guaranteed never to spawn a readiness command: the second passes an unrecognized `--stack` (zero commands, `BG-8`), and the first's `npm-test` probe (`{script:'test'}`) is false in a bare temp dir with no `package.json`. The determinism fix is correct — a host `pytest` really did leave `.pytest_cache/` — but it removed coverage of "the one command that executes project tooling can never mutate the repo it is inspecting". The red-run half of `SC19` **is** still covered (the first run exits 6) | MEDIUM | Keep the unrecognized-stack run, and add a third run over a fixture carrying a `package.json` with a deterministic no-op `test` script, so a command actually spawns while staying host-independent |
| 2026-09-14 | `harny-audit` | **F8 — CI has not run against this feature.** The generated workflow is present and its latest run (`34853159815`) is green with `harny-feedback: 1 of 2 command(s) ran, 1 skipped` — a real run, not an everything-probe-skipped one (`eslint` skips legitimately; this repo ships no ESLint config). But that run is against commit `4ef809b`; every one of this feature's 45 changed/new paths is uncommitted, so neither the code nor the regenerated two-file `test -f` guard has been exercised by CI. The work also sits on branch `ship/agent-feedback-controls`, the previous feature's ship branch | MEDIUM | Commit on a `readiness-doctor` branch and confirm the `harny feedback` workflow is green with `N > 0` before merge |
| 2026-09-14 | `harny-audit` | **F9 — "Adding a ninth skill" is now off by two.** `templates/skills/README.md:10,84` and `.agents/skills/README.md:10,86` still say a user adds "a ninth `harny-*` skill"; line 4's count was corrected to ten in the same file. Already off by one before this feature | LOW | Reword to a count-free "Adding a skill", so no future feature has to touch it again |
| 2026-09-14 | `harny-audit` | **F10 — `templates/doctor/README.md` overstates the environment family.** Behavior 1 says it checks "is the running Node new enough"; `run-doctor.mjs:139` only reports `process.version` and never compares it to a floor (which matches `contract.md`/`roadmap.md`, both of which say "Node version reported"). This document is the canonical behavior doc shipped to every downstream repo | LOW | Reword to "which Node version is running", or add the floor check as a follow-on |
| 2026-09-14 | `harny-audit` | **F11 — `templates/hooks/README.md` was modified but is absent from `roadmap.md`'s File Change Map.** The edit is correct and necessary (it points at `../shared/probes.mjs` and defers the layout convention to `templates/doctor/README.md` rather than duplicating it), but the map is meant to be complete | LOW | Note only; no code change |
| 2026-09-14 | `harny-audit` | **F12 — `S2` literal deviation.** `src/doctor.ts:311` deliberately throws a plain `Error` for an unexpected runner exit code — the only deliberate non-`HarnessError` throw in `src/`. `contract.md`'s Error Handling Contract pins exactly this, and `CLI-2`'s "anything else reaching `main` is a bug" makes it semantically right, but `S2`'s wording ("the only error thrown deliberately") does not admit the case | LOW | Contract-sanctioned; recorded so the deviation is deliberate and visible. Consider one clarifying clause in `AGENTS.md` `S2` |
| 2026-09-14 | `harny-audit` | **F13 — `S6` mirror-path deviation.** `tests/doctor-runner.test.ts` drives `templates/doctor/run-doctor.mjs`, but the established precedent for a `templates/<dir>/` runner is `tests/hooks/run-feedback.test.ts` (i.e. `tests/doctor/run-doctor.test.ts`). `contract.md` § Integration Points pins the flat name, so implementation followed the spec | LOW | Recorded, not faulted. Separately: `describe`/`it` strings across this feature (and the pre-existing suite) embed contract ids, which `S6` says never to do — the repo-wide convention contradicts `S6`'s wording; worth settling once rather than churning tests |
| 2026-09-14 | `harny-audit` | **F14 — Error Handling Contract row 2 is untested.** The "`.sdd/shared/probes.mjs` missing when a per-turn hook fires" row (roadmap R2's central risk) has no test; `tests/generators/cursor.test.ts`'s fixture now always provisions the sibling module. The CI-checkout twin (row 3) *is* tested (`tests/engine.test.ts:752`), and `runDoctor`'s pre-flight twin (row 1) is tested twice | LOW | Add T29 — copy a runner without its sibling, assert `ERR_MODULE_NOT_FOUND`/exit 1 and that the wrapper still exits 0 (`I4`) |
| 2026-09-14 | `harny-audit` | **F15 — Minor spec-internal inaccuracies.** This audit's own C30 row said "fifteen rows"; `contract.md`'s Error Handling Contract has fourteen data rows (corrected in C30 above). `CanonicalTemplates.doctorReadme` is loaded by `loadCanonicalTemplates` and consumed by nothing — contract-pinned, but dead as shipped | LOW | Note only |

## Final Verdict

**Status**: APPROVED WITH RESERVATIONS *(finalized 2026-09-14 after both HIGH findings
were addressed and independently re-verified)*

**Summary**: The feature is functionally complete and, where it matters most, genuinely
correct — the `CommandSpec<K>` narrowing makes a leaked test command a compile error,
the probe extraction is a verbatim move that leaves `tests/hooks/run-feedback.test.ts`
byte-unmodified and green, and this repo's own dogfood set regenerates byte-identically
from the real code path with `npx harny doctor .` exiting 0 (21 ok, 0 skipped, 0 failed)
on a full suite of 511/511. Both HIGH findings are resolved; ten MEDIUM/LOW findings are
carried as accepted, documented reservations, matching how every prior feature in this
repo shipped.

**Critical Issues** (must fix before merge): none. No contract interface is missing, no
behavior guarantee is functionally broken, and no `CLI-1`/`CLI-5`/`CLI-11` invariant was
weakened.

**Resolved during the audit** (both re-verified independently by the auditor, not
accepted on report):

- **F1 (was HIGH) — RESOLVED.** The half-applied amendment set was made uniform by
  reverting the one hand-edit rather than adding four more: `specs/current/_index.md:3`
  reserves that directory to `harny-sync` ("do not hand-edit"), which makes the FC-13
  hand-edit the deviation and the four deferrals correct. Verified:
  `git diff --stat specs/current/feedback-controls.md` is empty and
  `git status --porcelain specs/` lists only the untracked `specs/readiness-doctor/`,
  so `specs/current/` is byte-untouched by this feature. All five amendments remain
  declared in `intent.md` § Constraints and `contract.md`; `tasks.md:230–243` records
  the correction. **Carried forward as a ship gate, not a code defect** — see below.
- **F2 (was HIGH) — RESOLVED as a disclosure fix.** `tests/doctor.test.ts`'s header no
  longer claims `SC15`/`SC20`; it now lists both under an explicit "Does NOT cover"
  paragraph with the reason for each. No test logic changed. The residual coverage gap
  (T26, T28) is carried below as an accepted reservation.

**Ship gate** (not an implementation defect; owned by the documentation/archive stage):

- `harny-sync` must apply all five declared current-truth amendments — `SL-1`→ten,
  `FC-9`→8 core/2 optional/10 total with `harny-doctor` last, `CLI-10`→thirty
  `templates/**` files, `CLI-2`→the `NOT_READY`→6 row, and `feedback-controls.md`
  `I5`/`FC-13`→the two-file generated feedback runtime plus the extended dogfood set —
  before or in the ship commit. Until it does, `specs/current/` asserts five statements
  the committed code falsifies.

**Warnings** (should fix, not blocking — accepted as open reservations by human
decision):

- **F3 (MEDIUM)** — `run-doctor.mjs` hard-codes `'intent.md'` and `'audit.md'`,
  contradicting `BG-3` and `templates/doctor/README.md` behavior 6. Not avoidable under
  the contract as written (`DoctorChecksFile` has no field for them), so fix the spec or
  the data model, not just the script.
- **F4 (MEDIUM)** — `README.md:152–155` still say "7 core skills" / "9 skills per root",
  contradicting line 69 which this feature corrected to eight.
- **F5 (MEDIUM)** — `DoctorResult.skipped`/`.failed` can never be non-empty; roadmap
  R8's "still carries the failed ids for programmatic callers" is not true as shipped.
- **F6 (MEDIUM)** — no test covers `CLI-5` on the three new generated paths
  (`SC10`/`BG-11` name it); verified manually instead.
- **F7 (MEDIUM)** — the `SC19` CLI test is now guaranteed never to spawn a readiness
  command, so it no longer exercises the tooling-execution path `SC19`'s own rationale
  names. The determinism fix itself was the right call; the lost coverage should be
  restored deterministically.
- **F8 (MEDIUM)** — no CI run has covered this feature: all work is uncommitted, on the
  previous feature's ship branch. The latest green run (`1 of 2 command(s) ran, 1
  skipped`) predates it.
- **Residual of F2 (MEDIUM)** — T26 and T28 remain MISSING. `SC20`/`BG-7` and `SC15`
  hold at runtime (manually verified by this audit on three repo states) but are
  protected by structure and disclosure, not by a test.

**Recommendations** (nice to have):

- F9 — reword "Adding a ninth skill" to a count-free heading in both skill-root READMEs
  so no future feature has to renumber it.
- F10 — `templates/doctor/README.md` behavior 1 promises a Node-version *check*; the
  runner only *reports* the version.
- F11 — add `templates/hooks/README.md` to the File Change Map (it was modified).
- F12/F13 — two deliberate, contract-sanctioned deviations from `S2` and `S6` are
  recorded above rather than silently absorbed; both are worth one clarifying clause in
  `AGENTS.md` § Coding standards, which is cheaper than re-litigating them per feature.
- F14 — add the missing roadmap-R2 test (a runner copied without its sibling module).
- F15 — `CanonicalTemplates.doctorReadme` is loaded and consumed by nothing.

**On the four items specifically called out for verification in this audit's brief:**

1. **BG-21 (regression oracle)** — confirmed. `git diff` and `git status --porcelain`
   over `tests/hooks/run-feedback.test.ts` are both empty; 13/13 green; the source diff
   is a verbatim extraction with two aliased call sites.
2. **Task 5.7 (dogfood completion)** — confirmed against live config, not taken on
   faith. `.sdd/harness.json` round-trips byte-identically through
   `serializeConfig(validateConfig(...))`; `tools: ['claude-code']` matches the only
   tool root present; every role tier matches its `.claude/agents/*.md` `model:` field
   (`opus`→`most-capable` for architect/auditor, `sonnet`→`mid` for
   test-writer/executor, `haiku`→`cheapest` for documentation); all ten listed skills
   exist under `.claude/skills/`; three gates; `stack: 'typescript'`. All five
   `.sdd/spec-schema/*.md` `cmp`-identical to `templates/spec-schema/*.md`, and
   `.sdd/doctor/checks.json` reproduces exactly from `buildDoctorChecks`.
   `node bin/harness.js doctor .` after `npm run build`: **exit 0, 21 ok, 0 skipped,
   0 failed** — zero fails, not merely fewer.
3. **The two post-implementation `tests/cli.test.ts` fixes** — SC17 is **not** hollowed
   out: it still scaffolds a real repo through `init` and asserts exit 0 across all four
   families; writing an `AGENTS.md` mirrors what a human onboarding a fresh scaffold
   does, and `conventions-doc` is deliberately universal and ungated, so the test now
   asserts "a genuinely-ready repo reads ready" rather than passing on a fixture that
   was never finished. SC19 is **partially** hollowed out: it still proves the verb
   writes nothing across a red run and a flag override, and it guards against passing
   trivially (it asserts the exit is 0 or 6), but neither run can now spawn a readiness
   command — see F7.
4. **`contract.md` / `FC-13`** — **re-audited after F1's resolution.** `contract.md`
   § State Changes carries the "Post-implementation dogfood extension" paragraph naming
   `.sdd/harness.json` and `.sdd/spec-schema/*.md` with the mechanism used, and
   `contract.md` § "Modified: `templates/hooks/run-feedback.mjs`" declares the
   `I5`/`FC-13` amendment as the fifth current-truth amendment. `feedback-controls.md`
   FC-13 itself is **deliberately unedited**: it had been hand-edited, that edit was
   reverted, and the amendment is now deferred to `harny-sync` with the other four, per
   `specs/current/_index.md:3`'s "do not hand-edit" rule. So the dogfood additions are
   documented — in this feature's own spec, which is where an in-flight feature is
   supposed to document them — not left silently inconsistent; but `specs/current/` will
   not reflect them until the archive stage, which is the ship gate recorded above.

---

## Auditor's brief — what this feature is most likely to have gotten wrong

> Seeded by `harny-propose` from the risk analysis in `roadmap.md`. Not a substitute
> for `harny-audit`'s own seven steps; a list of places to look first.

1. **A readiness command leaking into a per-turn hook** (C6, T14). The single worst
   outcome: it would reintroduce exactly the per-turn slowness `src/feedback.ts:29–31`
   warns about. Verify **both** guards independently — that `commands`' element type
   still rejects `kind: 'test'`, and that the grep gate actually greps generated
   output rather than source.
2. **The probe extraction changing behavior** (C23, T25). `tests/hooks/run-feedback.test.ts`
   must be unmodified. Check `git diff` on that file first; any change there is a
   finding regardless of whether the suite is green.
3. **A silently widened amendment** (R21). Five current-truth amendments were declared:
   `SL-1`, `FC-9`, `CLI-10`, `CLI-2`, and `feedback-controls.md` `I5`/`FC-13`. Confirm
   each was applied **and** that nothing else in `specs/current/` was edited beyond
   them.
4. **`CLI-1` quietly becoming false** (C29). The 13-step sequence must still describe
   `runInit` verbatim. A fourteenth step, or a `doctor` code path reachable from
   `runInit`, is a contract violation and not a style question.
5. **A permanently-red doctor** (roadmap R4). Run `npx harny doctor` against this repo
   and against a freshly scaffolded scratch repo. If either is red for a reason that is
   not a genuine defect in that repo, the `requires` gating is wrong and the feature
   will train people to ignore it.
6. **Exit-code collision** (C8, C25, R17). Confirm `EXIT.NOT_READY` is unreachable from
   any path other than `runDoctor`, and that a red run is never reported as 1.
7. **Stale counts left behind** (C17, R13). Two "eight skills" statements were already
   stale *before* this feature; if they are still stale after it, the documentation pass
   did not happen as specified.
8. **AL-20 recurrence** (Task 6.18). Confirm `npm run build` ran before any e2e result
   was accepted; `tests/e2e-init.test.ts` validates `dist/`, not `src/`.
