# Audit: feedback-path-hygiene

## Requirements Checklist
| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | Vanished touched paths never reach a per-file command in turn-based mode | intent.md G1, SC1, SC2 | PASS | `existingPaths` applied via `perFilePathsFor` in `runRunMode`; SC1/SC2 tests red on pre-feature code, green now |
| R2 | Per-file commands receive only touched paths matching their declared suffixes; suffixes declared once in `STACK_PROFILES` and carried via `--commands` | intent.md G2, SC3, SC6 | PASS | No suffix literal in the runner; SC6 e2e drives real `renderHook` output through the real runner |
| R3 | CI `--whole-project` behavior unchanged (`.` passed unconditionally) | intent.md G3, SC5, SC7 | PASS | `runWholeProject` has no diff hunk; SC5/SC7 green (both are regression guards that also passed before the feature, as declared) |
| R4 | Empty filtered set skips the command; never a zero-path-arg run | intent.md G3, SC4 | PASS | `continue` before `runCommand`; SC4 asserts invocation count 0 with a would-fail command. Stderr silence is not asserted, see AL-2 |
| R5 | Absent `extensions` is backward compatible; whole-project commands ignore it | intent.md G3, SC3 | PASS | `matchesExtensions` returns true for absent, `[]`, or non-array values; the whole-project branch never calls `perFilePathsFor` |
| R6 | `extensions` meaning on readiness commands is explicit and enforced (compile error) | intent.md G4, SC8 | PASS | `ReadinessCommand = CommandSpec<ReadinessKind> & { readonly extensions?: never }`; stop-gate TS2322 recorded by the executor (Task 1.6) |
| R7 | Dogfood `.sdd/feedback/run-feedback.mjs`, `.claude/settings.json`, `.github/workflows/harny-feedback.yml` regenerated; FC-13 byte identity holds; `checks.json` unchanged | intent.md G5, SC9 | PASS | Auditor re-ran `node bin/harness.js init <scratch> --tools claude-code --stack typescript --yes`: `cmp` identical for all three, plus `checks.json` and `probes.mjs` |
| R8 | `templates/hooks/README.md` still six properties, tool-neutral, describes the filters and the whole-project bypass | intent.md G6, SC10 | PASS | Six numbered properties; no tool or stack name in § The behavior; `--whole-project` section states neither filter applies |
| R9 | `npm run typecheck` and `npm test` green; no dependency added | intent.md SC11, Constraints (S4) | PASS | 622/623; the sole failure is the pre-existing, out-of-scope `tests/packaging.test.ts` vitest pin (`4.1.10` vs `^4.1.11`). `package.json`/`package-lock.json` have no diff |
| R10 | Every intentional amendment to current truth (FC-6/BG-1, FC-4 wording, `CommandSpec` doc comment) is stated, not silent | intent.md § Deliberate amendments | PASS | `CommandSpec` doc comment refreshed verbatim from the contract; FC-6/FC-4 amendments listed in contract.md for `harny-sync` |
| R11 | Out-of-scope items untouched: multi-stack, addons, Context7 URL, doc roles, `harny-feedback` SKILL.md, R1–R8 | intent.md § Non-Goals | PASS | `git diff` touches only the File Change Map paths; no `.ipynb`, no accumulate-time filtering, no whole-project gating |

## Contract Compliance
| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | `CommandSpec.extensions?: readonly string[]` declared between `pathMode` and `requires`, doc comment per contract | PASS | Read `src/feedback.ts` diff: field position and both doc comments match contract.md verbatim |
| C2 | `ReadinessCommand = CommandSpec<ReadinessKind> & { readonly extensions?: never }` (PH-9); stop-gate typecheck failure observed (Task 1.6) | PASS | Code read; executor's recorded `TS2322` stop-gate output (below); `npm run typecheck` clean per conductor |
| C3 | Private `PYTHON_SOURCE_EXTENSIONS` / `JS_TS_SOURCE_EXTENSIONS`; set on `eslint`, `ruff`, `mypy` only (PH-10) | PASS | Both constants are non-exported and match the contract lists; set as the key right after `pathMode` on exactly those three entries; `tsc`/`npm-test`/`pytest` untouched |
| C4 | PH-1 vanished paths dropped | PASS | `existingPaths` uses `fs.existsSync`; SC1/SC2/SC6 tests |
| C5 | PH-2 extension gate on non-empty `extensions` | PASS | `matchesExtensions` code read; SC3 test |
| C6 | PH-3 case-sensitive `endsWith` suffix match | PASS | `filePath.endsWith(ext)`, no case folding; `A.PY` test |
| C7 | PH-4 filter order: extension gate before existence check (verified by reading `perFilePathsFor`) | PASS | Code review: `existingPaths(touchedPaths.filter((p) => matchesExtensions(p, command.extensions)))`, so the extension gate runs first and `existsSync` only sees survivors. Matches contract byte-for-byte |
| C8 | PH-5 empty filtered set: not spawned, silent, no effect on exit code | PASS | `continue` with no `console.*` call and no change to `anyBlockingFinding`; SC4 test (stdout, count, exit). Auditor manually confirmed stderr is empty too (not asserted by a test, AL-2) |
| C9 | PH-6 absent / `[]` / non-array `extensions` means no filter | PASS | `!Array.isArray(extensions) \|\| extensions.length === 0` returns true; `it.each` test covers `[]` and `"py"`; the SC3 command B covers the absent case |
| C10 | PH-7 `.` sentinel bypasses both filters; `runWholeProject` and `runCommand` byte-unchanged in the diff | PASS | `git diff templates/hooks/run-feedback.mjs` has no hunk inside either function (hunks: header doc comment, three new helpers inserted between them, and the `runRunMode` loop). SC5/SC7 tests |
| C11 | PH-8 whole-project commands ignore `extensions` in turn mode | PASS | Loop only filters when `pathMode === 'per-file'`; PH-8 test; SC2 test |
| C12 | PH-11 at most one spawn per command per turn | PASS | Single `runCommand` per loop iteration; batching test (setup-only change) and `toHaveLength(1)` assertions in the SC1/SC6 tests |
| C13 | PH-12 serialization automatic via existing `JSON.stringify`; no change to `src/generators/**`, `src/engine.ts`, `src/doctor.ts`; determinism holds | PASS | `git diff --stat` empty for those paths; the regenerated inline JSON has `extensions` between `pathMode` and `requires`; two scratch inits are `diff -r` identical |
| C14 | PH-13 turn file deleted unconditionally | PASS | `fs.rmSync(file, { force: true })` stays after the loop; `continue` cannot bypass it. SC2 test asserts deletion; auditor confirmed deletion manually for the all-filtered case |
| C15 | PH-14 dogfood byte identity (DC-4 extraction + scratch `harny init` diff); who applied `.claude/settings.json` recorded | PASS | Auditor's own `cmp` against a scratch init (R7); `diff` template vs `.sdd/feedback/run-feedback.mjs` empty; applier recorded below (executor, under explicit human approval) |
| C16 | PH-15 README six properties, no tool named in § "The behavior" (S7) | PASS | Counted six properties; grep for tool/stack names in § The behavior returns nothing |
| C17 | Error Handling Contract rows (old runner + new config; malformed `extensions` entries; unstat-able path) behave as stated | PARTIAL | Behavior matches every row. Auditor verified by hand: `[null,"",5,".py"]` degrades to `.py`; a `chmod 000` parent drops the path. However, the malformed-entry and unstat-able rows have no automated test (AL-1), and a list with no valid entry at all silently disables the command (AL-3, spec gap). The old-runner row is N/A (it is a property of old code) |
| C18 | FC-1 / BG-7: no suffix literal in `templates/hooks/run-feedback.mjs`; the runner learns suffixes only from `--commands` | PASS | grep for suffix literals in the runner returns nothing |
| C19 | S1–S7 compliance (`harny-standards`) | PASS | S1–S5, S7 clean. S6 is clean apart from a LOW note: contract ids appear in new `describe` titles (AL-4), following the file's existing `(BG-n)` practice; no `it` title carries one |

## Test Coverage
| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | Profile invariant: per-file entries declare non-empty dot-prefixed `extensions`; whole-project and readiness entries none (PH-10) | PASS (red on pre-feature code, green now) | `tests/feedback.test.ts` |
| T2 | Existing full-shape profile assertions updated for `extensions` (PH-12) | PASS (red on pre-feature code, green now) | `tests/feedback.test.ts` |
| T3 | One of two accumulated `.py` files deleted, so the per-file command receives only the survivor (PH-1, SC1) | PASS (red on pre-feature code, green now) | `tests/hooks/run-feedback.test.ts` |
| T4 | Renamed-away-only turn: zero per-file spawns, whole-project still runs, exit 0, silent, turn file deleted (PH-1, PH-5, PH-8, PH-13, SC2) | PASS (red on pre-feature code, green now) | `tests/hooks/run-feedback.test.ts` |
| T5 | Mixed JSON/YAML/`.py` turn: gated command gets only `.py`; ungated command gets all (PH-2, PH-6, SC3) | PASS (red on pre-feature code, green now) | `tests/hooks/run-feedback.test.ts` |
| T6 | Non-matching-only turn with a would-fail command: invocation count 0, exit 0, empty stdout (PH-5, SC4) | PASS (red on pre-feature code, green now). Stderr silence is not asserted (AL-2) | `tests/hooks/run-feedback.test.ts` |
| T7 | `A.PY` not passed to a `['.py']` command (PH-3) | PASS (red on pre-feature code, green now) | `tests/hooks/run-feedback.test.ts` |
| T8 | `extensions: []` and non-array `extensions`: no filter, existence check still applies (PH-6) | PASS (both variants red on pre-feature code, green now) | `tests/hooks/run-feedback.test.ts` |
| T9 | Whole-project command with `extensions` still runs on a non-matching turn (PH-8) | PASS (declared regression guard: passes by construction on pre-feature code too) | `tests/hooks/run-feedback.test.ts` |
| T10 | `--whole-project` passes exactly `.` to a per-file command with `extensions: ['.py']` (PH-7, SC5) | PASS (declared regression guard) | `tests/hooks/run-feedback.test.ts` |
| T11 | Four pre-existing runner tests' setup creates accumulated files; expected values unchanged; not vacuous (PH-11) | PASS (the diff shows setup-only changes via the `writeFile` helper; no assertion changed) | `tests/hooks/run-feedback.test.ts` |
| T12 | Generated Claude Code python hook, real runner + stub `ruff`/`mypy` on PATH: each stub gets only the existing `.py` (PH-1, PH-2, PH-12, SC6) | PASS (red on pre-feature code, green now) | `tests/generators/claude-code.test.ts` |
| T13 | Generated python CI step decoded and executed: stub `ruff` gets `check .`, `mypy` gets `.`, exit 0 (PH-7, PH-12, SC7) | PASS (declared regression guard) | `tests/engine.test.ts` |
| T14 | Readiness `extensions` compile error (manual stop-gate, Task 1.6; not persisted, since `tests/` is not type-checked) | PASS (manual; executor-recorded TS2322) | `src/feedback.ts` (manual) |
| T15 | Live-repo acceptance: in-turn `git mv` of a `.py` plus a settings edit yields no ruff/mypy finding at `Stop` (manual, human-gated, R2 class) | PARTIAL (exercised against the real runner in a scratch project, not in a live Claude Code session; carried as an R2-class limitation) | manual (Task 4.7) |
| T16 | Error row: non-string / `''` `extensions` entries never match; other entries still apply | MISSING (auditor verified by hand only, AL-1) | none |

Red-phase vacuity check (auditor): the four modified test files were run against a `git archive HEAD` checkout, meaning the pre-feature `src/` and `templates/`. All 10 feature tests intended to be red failed there: T1, T2, T3, T4, T5, T6, T7, both T8 variants, and T12. T9, T10, and T13 passed, as their docblocks declare. One extra failure there (the claude-code live-oracle test) was a scratch artifact: `.claude/agents/` is gitignored, so `git archive` omits it. No test meant to be red is vacuous.

## Audit Log
| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-1: Two Error Handling Contract rows have no automated test: (a) "`extensions` contains a non-string or `''` entry: that entry never matches; other entries still apply" and (b) "`fs.existsSync` cannot stat the path: dropped". Both behave as specified (auditor exercised `[null,"",5,".py"]` and a `chmod 000` parent against the real runner). | HIGH (test coverage for a contract row; not blocking) | `harny-test`: add an `it` in `tests/hooks/run-feedback.test.ts` with mixed invalid/valid entries asserting only the `.py` path is passed. (b) is optional; a permission-based test may be flaky under root in CI. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-2: PH-5 says an empty-filtered-set skip leaves "stdout and stderr silent", but the SC4 test asserts `stdout` only. The roadmap Phase 2 step 4 also said this test would assert turn-file deletion, and it does not (PH-13 is covered by the SC2 test). The implementation is silent on both streams (verified by hand). | MEDIUM | `harny-test`: add `expect(result.stderr.trim()).toBe('')` and a turn-file-absent assertion to the SC4 test. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-3: Spec gap, not an implementation deviation. A non-empty `extensions` whose entries are all invalid (e.g. `[null, ""]`) matches nothing, so the command is silently skipped every turn. That contradicts PH-6's own rationale, "a misconfigured list can never silently disable a linter". The contract's code block produces exactly this, and the runner matches the contract. Shipped profiles cannot hit it (the PH-10 invariant). | LOW | Human/architect decision at archive time: either word FC-23 to state this edge explicitly, or in a follow-up treat "no valid string entry" as no filter. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-4: S6 says "contract ids never appear in test names". New `describe` titles carry `PH-n`/`SC-n` ids (e.g. `'vanished path dropped … (PH-1, SC1)'`). No `it` title does. This follows the files' pre-existing practice (`(BG-1, SC6a)`, `(BG-5)` in `describe` titles at HEAD). | LOW | No action for this feature. Consider clarifying S6 in `AGENTS.md` (`it` titles vs `describe` titles) repo-wide. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-5: harny-feedback CI evidence for this change does not exist yet. The feature is uncommitted, and the latest `harny-feedback` run (34853159815, 2026-09-14) predates it. That run was green with `harny-feedback: 1 of 2 command(s) ran, 1 skipped.` (N=1, tsc ran; eslint is probe-skipped because this repo has no eslint config). Per-turn hook: `.sdd/feedback/.turns/` holds no stale turn file (directory mtime 10:15 today), consistent with Stop runs consuming turn files. The executor reports tsc clean and eslint skipped. Direct per-turn evidence is not persisted, since the hook is silent on a clean pass by design. | MEDIUM | Before merge, confirm the PR's `harny-feedback` run is green and its log shows `N of 2 command(s) ran` with N ≥ 1. Note: because eslint is probe-skipped here, this repo's dogfood never exercises the new eslint `extensions` gate; the python e2e test (T12) is the only end-to-end proof. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-6: The stub-project scaffolding (`makeE2eProjectDir` / `makeCiE2eProjectDir`, spawn-and-collect) is duplicated between `tests/generators/claude-code.test.ts` and `tests/engine.test.ts`. | LOW | Optional: move it to `tests/helpers/`. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-7 (informational, out of scope): `tests/packaging.test.ts` "adds no TOML parsing…" fails on the vitest pin (`4.1.10` expected vs `^4.1.11` in `package.json`). It is pre-existing on a clean checkout, and this feature does not touch `package.json`. | N/A | Track separately; not counted against this feature. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-8: Task 4.7 live-session acceptance was run against the real runner in a scratch project, not in an interactive agent session (R2-class limitation). | LOW | Carried reservation; the human may exercise it once in a real python repo. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-9 (A1 audit): Post-audit amendment A1 resolves AL-3. `matchesExtensions` now matches the amended contract body (identical logic; the contract's multi-line ternary is written on one line). `runCommand`/`runWholeProject` are still byte-unchanged vs HEAD. The template and dogfood runner are byte-identical. `.claude/settings.json` and the CI workflow have no A1 change (still byte-identical to a fresh scratch `harny init`; mtimes 10:11 predate the A1 edit at 10:45). A1.1 is red against the reconstructed pre-A1 body; A1.2 passes there, as its header declares (regression guard). Suite 624/625 (only the known packaging pin failure). | Resolution of AL-3 (was LOW) | Resolved. No action. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-10 (A1 audit): The A1.2 test (`[null, '', 5, '.py']` gives exactly `[app.py]`) also covers the AL-1(a) malformed-entry error row. AL-1 is therefore narrowed to (b), the unstat-able parent path, which is still untested. | AL-1 narrowed (still HIGH per ratings; accepted by the human) | No action for this feature; accepted reservation. |
| 2026-09-22 | sdd-auditor (Claude Opus 5) | AL-11 (A1 audit): Doc drift after A1. The `CommandSpec.extensions` doc comment in `src/feedback.ts:51`, and its copy in `contract.md` § Interfaces (line 39), still say "Absent, or an empty array, means no extension filtering". That is incomplete (not false) now that a no-valid-entry list also means no filter. The A1 scope deliberately limited code changes to `matchesExtensions`, so this is not an executor deviation. | LOW | Documentation/archive pass: align the wording with the amended PH-6 ("absent, not an array, or no valid entry"). |

## Executor's implementation notes (recorded per tasks.md's requirement to log results in audit.md)

- **Task 1.6 stop-gate (PH-9).** `extensions: ['.x']` was temporarily added to the
  `pytest` readiness entry in `src/feedback.ts`. `npm run typecheck` failed with:
  `src/feedback.ts(214,9): error TS2322: Type '[string]' is not assignable to type
  'undefined'.` The entry was reverted immediately afterward; `npm run typecheck`
  was confirmed clean again.
- **Task 4.3 — who applied `.claude/settings.json`.** Applied by the executor
  (this implementation pass), under the human's explicit Phase-4 pre-authorization
  ("the human has explicitly approved regenerating this repo's own copies,
  including `.claude/settings.json`"), via `buildPayload` +
  `claudeCodeGenerator.renderHook` against this repo's own `.sdd/harness.json`
  config (DC-4 partial extraction) — not by hand-editing the file. No content
  changed beyond what the generator produced.
- **Task 4.5 — SC9 verification.** A real
  `node bin/harness.js init <scratch-outside-repo> --tools claude-code --stack
  typescript --yes` was run into a temp directory outside the repo (after
  `npm run build`). `diff` against this repo's regenerated
  `.claude/settings.json`, `.github/workflows/harny-feedback.yml`, and
  `.sdd/feedback/run-feedback.mjs` was empty for all three (byte-identical).
  `git status` confirmed `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`, and
  `.sdd/harness.json` were not modified.
- **Task 4.7 — manual acceptance evidence (R2 class limitation).** Not run inside
  a live Claude Code session (out of this executor's reach); instead run directly
  against the real runner in a scratch directory, which exercises the identical
  code path a live session's `Stop` hook invokes. Setup: `templates/hooks/run-
  feedback.mjs` and `templates/shared/probes.mjs` copied into a scratch project's
  `.sdd/`; `tests/fixtures/hooks/stub-tool.mjs` copied to `bin/ruff` and `bin/mypy`
  (mode 0755) on `PATH`. Sequence: `accumulate` recorded `src/app.py` (created) and
  `.claude/settings.json` (edited) for one turn key; `git init` + `git add -A`;
  `src/app.py` renamed to `src/renamed.py` (the "in-turn `git mv`" case, old path
  only accumulated); `run --commands '[...ruff extensions:[".py",".pyi"]...,
  ...mypy extensions:[".py",".pyi"]...]'` was invoked for the same turn key.
  Result: exit code `0`, no stub invocation logged (no ruff/mypy finding), and the
  turn file was deleted. This is the manual evidence Task 4.7 calls for; it is
  recorded here rather than as a carried reservation because the scenario was
  exercised successfully, just not inside an interactive Claude Code session.

## Post-audit amendment A1 audit (2026-09-22)

Scope: `contract.md`/`intent.md`/`tasks.md` § "Post-audit amendment A1" (response to AL-3), Tasks A1.1–A1.3.

| Check | Status | Verified By |
|---|---|---|
| `matchesExtensions` matches the amended contract body | PASS | Code read: it computes the non-empty-string entries first, returns `true` when there are none, then runs `endsWith` over the valid entries only. The logic is identical to the contract; only line wrapping differs. The doc comment is verbatim |
| Only `matchesExtensions` changed; `runCommand`/`runWholeProject` byte-unchanged | PASS | Function-extract `diff` vs `HEAD`: both unchanged. `existingPaths`, `perFilePathsFor` and the `runRunMode` loop are as audited |
| PH-2 / PH-6 / Error Handling table internally consistent | PASS | PH-2 now says "at least one valid entry (PH-6)". PH-6 defines "valid" and covers absent, non-array, `[]`, and the no-valid-entry case. The two (A1) error rows (mixed → valid entries apply; none valid → no filter) agree with PH-6 and the code. The old "non-string or `''` entry never matches" row is gone. FC-23 wording updated. The intent pointer note agrees. Minor drift in the `CommandSpec.extensions` doc comment (AL-11, LOW) |
| Dogfood runner regenerated; no hook-config / CI change from A1 | PASS | `diff` template vs `.sdd/feedback/run-feedback.mjs` is empty. A fresh scratch `harny init --tools claude-code --stack typescript --yes` byte-matches all three dogfood files. `.claude/settings.json` and `.github/workflows/harny-feedback.yml` mtimes (10:11) predate the A1 edit (10:45) |
| A1.1 is red against pre-A1 code | PASS | Scratch copy with the pre-A1 `matchesExtensions` body restored: "an all-invalid extensions list still passes a non-matching existing path…" fails; A1.2 passes (declared regression guard). Green on the current code |
| Test suite | PASS | 624/625; the sole failure is the pre-existing, out-of-scope `tests/packaging.test.ts` vitest pin (AL-7) |
| S1–S7 | PASS | No new source or dependency. The new `describe` title carries ids `(A1, AL-3, PH-6)`, the same existing practice noted in AL-4; the `it` titles carry none |

Effect on earlier rows: AL-3 is **resolved**. C17's malformed-entry sub-item is now implemented as the amended contract specifies, and T16 is covered by the A1.2 test (`tests/hooks/run-feedback.test.ts`), which narrows AL-1 to the unstat-able-path row (AL-10). The earlier tables above are left as audited, for history.

## Final Verdict

**Status**: APPROVED WITH RESERVATIONS (re-affirmed after post-audit amendment A1)

**Summary**: The implementation matches the contract, including amendment A1. `matchesExtensions` now treats an `extensions` list with no valid (non-empty string) entry as no filter, which resolves AL-3. `runCommand`/`runWholeProject` are still byte-unchanged, the dogfood copies are byte-identical to a fresh `harny init`, and every intended-red test, A1.1 included, was confirmed red before its fix. The human approved the feature with the remaining reservations below.

**Critical Issues** (must fix before merge):
- None.

**Warnings** (accepted reservations; the human chose to approve with them):
- AL-1 (HIGH, narrowed by A1.2 / AL-10): the "`fs.existsSync` cannot stat the path (parent permissions)" error row still has no automated test (auditor verified by hand). The malformed-entry row is now covered by A1.2.
- AL-2 (MEDIUM): the SC4 empty-filtered-set test does not assert empty stderr or turn-file deletion.
- AL-5 (MEDIUM): no `harny-feedback` CI run exists yet for this uncommitted change. Confirm the PR run is green and its log shows `N of 2 command(s) ran` with N ≥ 1.

**Resolved**:
- AL-3 (LOW): resolved by post-audit amendment A1 (AL-9).

**Recommendations** (nice to have):
- AL-11 (LOW): align the `CommandSpec.extensions` doc comment (`src/feedback.ts:51`, contract.md § Interfaces) with the amended PH-6 at the documentation/archive pass.
- AL-4 (LOW): clarify S6's "test names" rule (`describe` vs `it` titles) in `AGENTS.md`.
- AL-6 (LOW): share the stub-project e2e scaffolding via `tests/helpers/`.
- AL-8 (LOW): the human can optionally repeat Task 4.7 once in a live session on a real python repo.
