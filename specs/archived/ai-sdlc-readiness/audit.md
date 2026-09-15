# Audit: AI/SDLC Readiness Check

Audited 2026-09-14 by `harny-audit`; **re-audited 2026-09-15** after the executor fixed
finding F1. Every `R` row traces to an `intent.md` goal or success criterion; every `C`
row traces to a `contract.md` behavior guarantee; every `T` row traces to a `tasks.md`
Phase 4 task.

This document keeps the full history of both passes: F1 is retained in place with its
original evidence and marked RESOLVED, rather than deleted, so the record shows what was
found as well as what was fixed.

**Independent verification performed by the auditor — pass 1 (2026-09-14)** (not taken
on report): `npx vitest run` → 29 files, 554/554 passing; `node bin/harness.js doctor` →
exit `0`, `24 ok, 0 skipped, 0 warned, 0 failed`; `node .sdd/doctor/run-doctor.mjs` →
identical report, exit `0`; stale-runner compatibility exercised by running `HEAD`'s
pre-feature runner against the new-format `checks.json`; `spawnSync` buffer behavior
probed empirically on Node v24.16.0; skill/runner parity measured with `diff`; the
pre-existing `harny-document` divergence measured against `HEAD` on both sides.

**Independent verification performed by the auditor — pass 2 (2026-09-15)**, re-auditing
the F1 fix: `npx vitest run` → 29 files, **555/555 passing**; `npx tsc -p tsconfig.json
--noEmit` → clean; `node bin/harness.js doctor` → still exit `0`, `24 ok, 0 skipped,
0 warned, 0 failed`; runner and skill parity re-measured with `diff` → still identical.
The fix was then driven **end to end at the CLI surface against a scaffolded temp repo
with a stub runner**, which is the evidence that actually closes F1:

| Stub runner behavior | Verb (`node bin/harness.js doctor`) | Direct (`node .sdd/doctor/run-doctor.mjs`) |
|---|---|---|
| 5 MiB of stdout, exit `2` (a correctly-run RED result, and the exact band F1 broke) | exit **`6`** (`NOT_READY`), full 5,242,998 bytes printed | exit `2` |
| 70 MiB of stdout, exit `2` (past the new limit) | exit **`2`** (`USAGE`) with an `ENOBUFS` diagnostic naming the runner path, the `67108864`-byte limit, and the direct-invocation workaround with the correct `cwd`; ~64 MiB of partial output still printed | exit `2`, full 73,400,320 bytes printed |

Before the fix the 5 MiB row produced exit `1` (`EXIT.UNEXPECTED`). It now produces the
contracted `6`.

## Requirements Checklist

| ID | Requirement | Source | Status | Notes |
|---|---|---|---|---|
| R1 | A fifth check family, `repo readiness`, runs between the harness-manifest and spec-state families, in fixed order on every run | intent.md G1, SC1 | PASS | Live dogfood shows `-- repo readiness --` after `knowledge-base` (last family-2 entry) and before `npm-test`; `tests/doctor-runner.test.ts` pins the index ordering across all four boundaries. One caveat under F7: only family 3 prints a heading, so the other four families remain visually unlabelled |
| R2 | A must-have item that is absent fails the run: the repo reports not ready and the verb exits `6` | intent.md G2, SC2 | PASS | `tests/cli.test.ts` drives the verb end to end on a scaffolded fixture with no `README.md` → exit `6`, remediation named; `tests/doctor-runner.test.ts` pins runner exit `2` |
| R3 | A recommended item that is absent warns with its remediation and never changes an exit code | intent.md G2, SC3 | PASS | Both layers tested; `process.exit(failCount > 0 ? 2 : 0)` verified untouched, so a `warn` can never reach it |
| R4 | The summary line reports four counts, and `WARN` is textually distinct from `SKIP` and `FAIL` | intent.md G2, SC4 | PASS | One test isolates a simultaneous ok/skip/warn/fail and asserts all three tags plus the four-count summary shape |
| R5 | A missing conventions document still fails the run with its existing check id and behavior unchanged | intent.md G2, SC5 | PASS | `conventions-doc` emits byte-identical JSON (`anyOf: ["AGENTS.md","CLAUDE.md"]`, same remediation string, no `tier`); the constant substitution is a pure refactor. Verified against the stale runner too |
| R6 | Per-tool guidance entries exist for the tools the repo actually selected, each satisfied by that tool's file or by `AGENTS.md` | intent.md G6, SC6 | PASS | All five generators tested individually and in combination; `cursor`/`codex` correctly contribute none |
| R7 | No tool id, instruction-file path, or tool count appears as a literal in `src/doctor.ts` | intent.md G6, SC7 | PARTIAL | Holds for every value this feature introduces. `'CLAUDE.md'` remains a source literal at `src/doctor.ts:175–176` inside `conventions-doc`, which AR-7 requires be left untouched. SC7 and AR-7 cannot both hold literally; the implementation correctly chose AR-7. See F5 |
| R8 | No document name, accepted path, tier value, or family label appears as a literal in the runner | intent.md G7, SC8 | PASS | Source-level assertion checks each contracted value as a quoted JS literal; read line by line and confirmed independently. The `--`/`--` heading decoration is formatting, not a family label |
| R9 | A `checks.json` generated before this feature produces its exact pre-feature outcomes under the new runner | intent.md G2, SC9 | PASS | Tested; `checks.repoReadiness ?? []` and the truthiness-guarded heading mean a pre-feature payload yields no family-3 lines and no stray heading |
| R10 | The check run against harny's own repository produces zero new failures and zero new warnings | intent.md G1, SC10 | PASS | Reproduced independently by the auditor: exit `0`, `24 ok, 0 skipped, 0 warned, 0 failed`, byte-for-byte matching `tasks.md` § Notes |
| R11 | `harny-doctor` documents the three coherence elements, their tiers, and the human-asked hand-off; "Never fix what it finds" survives verbatim | intent.md G3/G4, SC11 | PASS | Steps 3 and 4 inserted after "read the report in full", exactly as contracted; guardrail diffed against `HEAD` and confirmed verbatim, with the new guardrail added beside it, not over it |
| R12 | `harny-document` documents bootstrap mode, its precondition, its refusals, and its draft marking | intent.md G5, SC12 | PASS | § Bootstrap mode covers trigger, bounded inputs, draft marking, all four refusals, and mutual unreachability. Its *test* coverage is weak — see F4 |
| R13 | Both edited skills are byte-identical across their roots, and the scaffolded runner is byte-identical to the template | intent.md G4/G5, SC13 | PASS | `harny-doctor`: byte-identical. Runner: byte-identical. `harny-document`: identical outside the one pre-existing `templates-skill-library-parity` divergence, measured at `HEAD` and confirmed unchanged (same three lines, same position) |
| R14 | `templates/doctor/README.md` states the five families, the two tiers, the `warn` outcome and the presence/coherence division as behavior, tool-neutrally, before any implementation detail | intent.md G2/G3, SC14 | PASS | All four statements present in § The behavior, ahead of § What this checks. Claude Code/`CLAUDE.md` named as "one attributed example… never the only possibility" (`S7`). Structural nit under F6 |
| R15 | The readiness check writes nothing, on any outcome including a failed repo-readiness outcome | intent.md G1, SC15 | PASS | Before/after file-list snapshots at both the runner and verb layers, on a red-by-missing-README run |
| R16 | Scope held: three repo-readiness entries and three coherence elements — no scoring, no maturity levels, no enumerated 28-item checklist, no new CLI verb or flag, no new file created | intent.md § Non-Goals | PASS | Exactly three entries, exactly three elements. `git diff --diff-filter=A` against `HEAD` is empty — no file created. No scoring/maturity/percentage vocabulary anywhere in the change surface. No CLI surface added |
| R17 | Both amended current-truth statements (RD-1/I3 four→five families; I2's definition of ready) are stated explicitly in `contract.md` so `harny-sync` carries them into `specs/current/readiness-checks.md` | intent.md § Constraints | PASS | AR-1 and AR-2 state both amendments as first-class guarantees. **`harny-sync` must additionally amend RD-R2's wording** — see F2 |

## Contract Compliance

| ID | Contract Item | Status | Verified By |
|---|---|---|---|
| C1 | AR-1 — five families in fixed order; one line per check; no check aborts the run | PASS | Live dogfood + direct runner invocation + the index-ordering test; `evaluateEntry` has no early return past `emit`, and the runner still buffers into `lines` and prints once at the end |
| C2 | AR-2 — amended readiness invariant: ready = every check `ok`/`skip`/`warn`; deterministic | PASS | `process.exit(failCount > 0 ? 2 : 0)` read and confirmed untouched; `warnCount` never participates. Determinism from the pure builder plus fixed iteration order |
| C3 | AR-3 — a must-have gap yields `FAIL`, runner exit `2`, `HarnessError('NOT_READY')`, verb exit `6` | PASS | Proven at both layers by test. **Pass 2:** the F1 edge exception is closed — a 5 MiB red report now reaches verb exit `6` (verified live), where it previously produced exit `1` |
| C4 | AR-4 — a recommended gap yields `WARN`, exit `0`, `ready: true` | PASS | `tests/cli.test.ts` SC3 asserts exit `0`; `tests/doctor-runner.test.ts` asserts `WARN` and the absence of a `FAIL` for the same id |
| C5 | AR-5 — absent `tier` means must-have; absent `repoReadiness` contributes no lines | PASS | `entry.tier === 'recommended'` is an exact test, so absent *and* unrecognised both fall to `fail`; both cases tested. Pre-feature payload test asserts `not.toContain('repo-readiness')` |
| C6 | AR-6 — the three repo-readiness entries match the § Data Models table exactly | PASS | Ids, `anyOf` sets, tiers, gates and remediation strings compared field by field against the contract table, and against the regenerated `.sdd/doctor/checks.json` |
| C7 | AR-7 — `conventions-doc` untouched: id, position in `require`, `anyOf`, absent `tier`, failing outcome | PASS | Diffed against `HEAD`: only the two string expressions changed, both evaluating to the identical bytes (`AGENTS_GUIDANCE_PATH` is `'AGENTS.md'`; the template literal reproduces the old remediation exactly). Still `require[0]`; `'tier' in entry` asserted `false`; the `require` array is otherwise untouched. Stale-runner run confirms it still evaluates `OK conventions-doc` under a pre-feature runner |
| C8 | AR-8 — per-tool entries derived from resolved generators, deduped first-seen, `undefined` filtered | PASS | The strongest evidence is behavioral: a test feeds four fake generators with invented paths (`fake/a-guidance.md` etc.) and asserts they survive into the output verbatim, deduped, with `undefined` dropped — impossible if any value were hard-coded. `dedupePreserveOrder` is `[...new Set()]`, which preserves first-seen order |
| C9 | AR-9 — all five generators declare `guidancePath`; values match the verified-facts table character for character | PASS | All five read and compared against the table. `cursor`/`codex` assert `'guidancePath' in generator` as well as the value, correctly distinguishing "declared undefined" from "absent". `tsc` clean means the compile-time proof holds |
| C10 | AR-10 — per-tool entries harness-gated; the two universal entries ungated | PASS | `requires` deep-equals `{ anyFile: ['.sdd/harness.json'] }` on every guidance entry and is `undefined` on both universal entries; a behavioral test removes `.sdd/harness.json` and confirms the `SKIP` wording matches family 2's exactly |
| C11 | AR-11 — the runner hard-codes nothing new; every value travels in `DoctorChecksFile` | PASS | Auditor re-read the changed runner line by line (roadmap 2.6's review step, repeated independently). The only new reads are `checks.repoReadiness` and `checks.repoReadinessLabel` |
| C12 | AR-12 — one presence-entry evaluator shared by families 2 and 3; `probeSatisfied` remains the single probe implementation | PASS | Family 2's body was genuinely extracted, not duplicated; both loops call `evaluateEntry`. The runner's only import is still `probeSatisfied as requirementMet` from `../shared/probes.mjs`; no probe kind added |
| C13 | AR-13 — builders pure; `checks.json` byte-identical from identical inputs; scaffolded runner byte-identical to template | PASS | Purity tested; `diff templates/doctor/run-doctor.mjs .sdd/doctor/run-doctor.mjs` empty. Key order preserved (`repoReadiness`/`repoReadinessLabel` inserted between `require` and `commands`, matching the interface declaration order) |
| C14 | AR-14 — summary line reports ok / skipped / warned / failed in that order | PASS | Regex-asserted in order; observed live |
| C15 | AR-15 — no writes on any outcome, including a red repo-readiness result | PASS | Recursive file-list snapshots at both layers; the runner contains no write call of any kind |
| C16 | AR-16 — verb and direct invocation evaluate the same five families and agree | PASS (bounded) | Verified on the happy path: both produce byte-identical reports and exit `0`. **Pass 2:** F1's disagreement is closed across the entire realistic range — at 5 MiB both paths now reach "not ready". Above 64 MiB the verb *abstains* (`USAGE`, "could not be run to completion") rather than reaching a *different* conclusion, which does not violate a guarantee about agreeing conclusions; see the F1 RESOLVED note and F12. Still held by manual observation only, never by an automated test driving both paths (RD-R5 lineage) |
| C17 | AR-17 — coherence assessed by the skill only; no grep, heading match, or keyword list in the runner | PASS | Behaviorally proven: an *empty* `README.md` still satisfies `repo-readiness:readme`. `evaluateEntry` calls only `fs.existsSync` via `anyPathExists`; no `readFileSync` on any guidance document. `harny-doctor` step 3 owns the judgement |
| C18 | AR-18 — the hand-off is asked for, never taken unilaterally; existing guardrail verbatim | PASS | "Invoke `harny-document` only after an explicit yes" in step 4; new guardrail added; "Never fix what it finds" diffed against `HEAD` and confirmed verbatim |
| C19 | AR-19 — bootstrap mode bounded, marked as draft, and mutually unreachable from the post-audit path | PASS (prose); test coverage weak | Every contracted element read and confirmed present in both copies: trigger, bounded inputs, draft marking, the four refusals, the explicit `specs/<feature>/`-target refusal, and the unreachability statement. Note: `contract.md` § Interfaces places this guarantee in the `SKILL.md` itself — there is no code site to check, so nothing is "missing"; the gap is in how weakly it is asserted. See F4 |
| C20 | AR-20 — skill parity across roots; six frontmatter keys; description under the cap | PASS | `harny-doctor` byte-identical; `harny-document` identical outside the pre-existing declared divergence. Frontmatter keys: `harny-doctor` 5 of the 6 permitted, `harny-document` 6 of 6 — no disallowed key. Descriptions 1007 and 1016 chars against `SL-4`'s 1,536 cap |
| C21 | AR-21 — behavior document amended first, extending behavior 4 rather than replacing it | PARTIAL | The README was amended and every required statement is present, tool-neutrally, before any implementation detail. But behavior 4's original headline was rewritten rather than extended, and the two-tier statement was merged into it instead of becoming its own new behavior. Substance correct, letter bent — see F6 |
| C22 | AR-22 — harny's own repo is green: zero new failures, zero new warnings | PASS | Reproduced independently by the auditor, exit `0`, `24 ok, 0 skipped, 0 warned, 0 failed` |
| C23 | AR-23 — no runtime or dev dependency added | PASS | `git diff package.json package-lock.json` is empty |
| C24 | Error Handling Contract — every row's stated behavior holds, including the unrecognised-tier, pre-feature-payload, and stale-runner rows | PASS | Rows 1–7 and 9 verified by test or by read. The **stale-runner row was verified live by the auditor**: `HEAD`'s pre-feature runner against the new-format `checks.json` prints `OK conventions-doc`, no `repo-readiness` lines, and a three-count summary — exactly as contracted. The skill-level rows (11–13) are prose-only, correctly disclosed. **Pass 2:** the F1 inversion of "never confused with a red result" is closed — a correctly-run red result is no longer reported as a broken runner at any size under 64 MiB, and above it the failure is a *diagnosable* `USAGE` naming the cause, not a generic crash |

## Test Coverage

| ID | Test Description | Status | Test File |
|---|---|---|---|
| T1 | The three entry kinds carry their exact ids, `anyOf` sets and tiers | PASS | `tests/doctor.test.ts` |
| T2 | Per-generator derivation and dedup, `undefined` filtered, across a multi-tool and a single-tool config | PASS | `tests/doctor.test.ts` — the fake-path variant is genuinely strong evidence, not a tautology |
| T3 | `conventions-doc` unchanged — same id, same position, no `tier` — and a missing conventions document still fails | PASS | `tests/doctor.test.ts` (invariance); the "still fails" half by `tests/doctor-runner.test.ts` and `tests/cli.test.ts` |
| T4 | Two builds from identical inputs produce a byte-identical `checks.json` | PASS | `tests/doctor.test.ts` |
| T5 | Source-level: no tool id and no instruction-file path literal in `src/doctor.ts` | PARTIAL | `tests/doctor.test.ts` — narrowed to `.kiro/steering` and `.github/copilot-instructions.md`; cannot assert `'CLAUDE.md'` because AR-7 requires it to stay. See F5 |
| T6 | A must-have miss exits `2` and prints a `FAIL` line naming its remediation | PASS | `tests/doctor-runner.test.ts`; `tests/cli.test.ts` (verb, exit `6`) |
| T7 | A recommended miss exits `0` and prints a `WARN` line naming its remediation | PASS | `tests/doctor-runner.test.ts`; `tests/cli.test.ts` |
| T8 | A pre-feature payload with no `repoReadiness` runs all four original families unchanged; an unrecognised tier is treated as must-have | PASS | `tests/doctor-runner.test.ts` |
| T9 | The five families print in fixed order; the summary carries four counts in order | PASS | `tests/doctor-runner.test.ts` |
| T10 | Source-level: no new hard-coded literal and no content-inspection call in the runner | PASS | `tests/doctor-runner.test.ts` — the empty-`README.md` test is the behavioral half and is the better of the two |
| T11 | A red repo-readiness run leaves the fixture's file list identical before and after | PASS | `tests/doctor-runner.test.ts`; `tests/cli.test.ts` |
| T12–T16 | Each generator declares `guidancePath` per the verified-facts table | PASS | `tests/generators/{claude-code,cursor,kiro,github-copilot,codex}.test.ts` |
| T17 | The two edited `SKILL.md` files are byte-identical across roots and name the new coherence/hand-off/bootstrap prose | PARTIAL | `tests/skills-fidelity.test.ts` — byte-identity and the `harny-doctor` substrings are sound; the `harny-document` substring set is largely satisfied by pre-existing text. See F4 |
| T18 | Live `npx harny doctor` against this repository exits `0` with no new failures and no new warnings | PASS (manual) | Manual — recorded in `tasks.md` § Notes, **reproduced independently by the auditor** |
| T19 | Verb and direct `node .sdd/doctor/run-doctor.mjs` agree | MISSING (manual only) | No automated test drives both paths — RD-R5 lineage, unchanged by this feature. Verified manually by the auditor on the happy path and, in pass 2, at 5 MiB and 70 MiB |
| T20 | `runDoctor` handles a runner whose output exceeds the capture buffer | PASS | `tests/doctor.test.ts` — added by the F1 fix. Drives real `runDoctor` against a stub runner writing 70 MiB and asserts `HarnessError('USAGE')` naming the runner path, never a plain `Error`. A genuine behavioral test, not a source grep; correctly gates `process.exit` on the `write` callback so the pipe is not truncated before the overrun occurs |

## Coverage held by structure or manual observation, not by automated test

Per `tasks.md` Task 4.19, so the RD-R5 class of gap is named rather than implied.

| Criterion | Held by | Status |
|---|---|---|
| SC10 / AR-22 (harny's own repo green) | Manual live run | DISCLOSED — and independently reproduced by the auditor. Acceptable: an automated version would have to assert against this repo's own mutable state |
| AR-16 / RD-7 (verb and direct invocation agree) | Manual observation; RD-R5 already records that no automated test drives both paths | DISCLOSED — and now materially more important, because F1 introduces the first known case where the two genuinely disagree. Recommend closing this gap in a follow-up |
| AR-9's verification dates (per-tool facts) | Vendor documentation, never a live tool install — the `AL-30` / `CG-1` class | DISCLOSED and correctly bounded: every affected entry is `recommended` and every `anyOf` includes `AGENTS.md`, so a wrong path degrades to a redundant advisory, never a false red. Verified by reading the entries, not merely by trusting the claim |
| AR-17 / AR-18 (harny-doctor prose) | Read of the `SKILL.md` files plus substring assertions | DISCLOSED — assertions are adequate here (`Purpose`/`Components`/`Validation`/`ready for SDD work`/`harny-document` are all new-content-bearing) |
| AR-19 (harny-document bootstrap prose) | Read of the `SKILL.md` files plus substring assertions | DISCLOSED but **understated** — four of the five asserted substrings pre-date this feature. See F4 |
| The stale-runner row in the Error Handling Contract | Structure (`conventions-doc` staying in family 2) plus documentation | DISCLOSED — upgraded from "structure only" to **verified**: the auditor ran `HEAD`'s runner against the new checks payload and observed the contracted outcome |

## `harny-standards` compliance (S1–S7)

Checked against `AGENTS.md` § "Coding standards" read live — the single source; nothing
restated here.

| Standard | Status | Evidence |
|---|---|---|
| S1 | PASS | All new/changed TypeScript is ESM with `.js` specifiers and `node:`-prefixed builtins; the runner is `.mjs` with `node:fs`/`node:path`/`node:child_process` and a `.mjs` relative import |
| S2 | PASS | **Pass 2:** the F1 fix adds one throw site and it is a `HarnessError('USAGE')`, correctly placed before the exit-code translation. The pre-existing plain `Error` (`readiness-doctor` F12) survives but is once again reachable only by a genuine bug — the `non-bug` reachability that pass 1 flagged is gone. See F10 |
| S3 | PASS | Builders are pure and tested for it; `checks.json` serialization unchanged; every changed file ends in exactly one `\n` (verified byte-wise); every path written is relative and contained — in fact nothing is written at all |
| S4 | PASS | `package.json` and `package-lock.json` untouched; contract declares none |
| S5 | PASS with note | `AGENTS_GUIDANCE_PATH` is owned by `src/doctor.ts` and imported at all three of its call sites, including `conventions-doc`, which stopped re-literalling it — exactly what Task 1.7 asked for, with byte-identical output. `'CLAUDE.md'` remains literalled in both `src/doctor.ts` and `src/generators/claude-code.ts`; see F5. The test-fixture mirroring in `tests/doctor-runner.test.ts` is a deliberate, commented choice (that file drives a real subprocess and must never import `src/`) and is not an S5 violation |
| S6 | PASS with one carried deviation | Every touched test file carries a `Spec:`/`Covers:` header naming this feature and its ids; `tests/` mirrors `src/`; the default run is fully offline (all 554 pass with no network). Carried deviation: contract ids inside `describe`/`it` strings — identical to `readiness-doctor` audit F13, a repo-wide convention that contradicts `S6`'s wording. See F9 |
| S7 | PASS | `templates/doctor/README.md` states each behavior first and names Claude Code reading `CLAUDE.md` explicitly as "one attributed example… never the only possibility"; the runner header and both edited skills are tool-neutral, and `harny-doctor` keeps its portability guardrail naming "the project's equivalents" |

## `harny-feedback` verification

Checked per `harny-feedback`'s auditor step — verify, never re-run. The mapped commands
were **not** re-invoked by the auditor.

- **Per-turn hook present and fired.** `.claude/settings.json` carries both the
  `PostToolUse` accumulate hook and the `Stop` run hook, wired to
  `.sdd/feedback/run-feedback.mjs`. `.sdd/feedback/.turns/` has an mtime of
  `2026-09-14 22:39:09` — well after its own `.gitignore` (`19:27:30`) and coincident
  with the end of the implementation session — meaning turn files were written and
  consumed there during this feature's work. The directory is now empty but for
  `.gitignore`, which is the post-run steady state. Findings heeded: `tsc --noEmit`
  clean and 554/554 green are consistent with a hook that reported nothing outstanding.
- **Mapped commands for this stack.** `resolveStackProfile('typescript')` yields
  `eslint` (per-file, gated on an eslint config) and `tsc --noEmit` (whole-project,
  gated on `tsconfig.json`). This repo has `tsconfig.json` but **no** eslint config, so
  `eslint` is legitimately probe-skipped — coverage, not a finding.
- **CI workflow present; no run against this change.** `.github/workflows/harny-feedback.yml`
  exists and is correctly generated. Its trigger is `pull_request` only, and this change
  is uncommitted and unpushed, so no run exists for it. The most recent run in repo
  history (`34853159815`, sha `4ef809b`, `agent-feedback-controls`) concluded **success**,
  and its log carries `harny-feedback: 1 of 2 command(s) ran, 1 skipped.` — `N = 1`, not a
  vacuous green. Reported as F11.

## Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| F1 | Unhandled `ENOBUFS` introduced by the `stdio` deviation; breaks AR-16 and inverts the red-result/broken-runner distinction in one reachable case | HIGH | **RESOLVED 2026-09-15** — verified end to end |
| F2 | RD-R2's recorded *rationale* is now false — the reservation's effect survives, its stated cause does not | MEDIUM | OPEN (for `harny-sync`) |
| F3 | Loss of live output streaming, and runner stderr re-routed to stdout | MEDIUM | OPEN |
| F4 | AR-19's substring assertions are largely satisfied by pre-existing text; bootstrap mode's refusal set is effectively untested | MEDIUM | OPEN |
| F5 | SC7/AR-8 are not literally satisfiable alongside AR-7; `'CLAUDE.md'` remains a literal in `src/doctor.ts` | LOW | OPEN |
| F6 | README behavior 4 rewritten rather than extended; the two-tier statement merged into it rather than added as a new behavior | LOW | OPEN |
| F7 | Only family 3 prints a heading; the other four families remain unlabelled | LOW | OPEN |
| F8 | `DoctorResult.ran`'s doc-comment now overstates what it contains | LOW | OPEN |
| F9 | S6: contract ids inside `describe`/`it` strings (carried from `readiness-doctor` F13) | LOW | OPEN (carried) |
| F10 | S2: plain `Error` for an unexpected runner exit code (carried from `readiness-doctor` F12) | LOW | **IMPROVED 2026-09-15** — no longer reachable for a legitimate condition |
| F11 | No CI run exists against this change | LOW | OPEN |
| F12 | AR-16 now holds *bounded* at 64 MiB rather than unconditionally; the bound is undocumented in `contract.md` | LOW | NEW (pass 2) |

### F1 (HIGH) — the `stdio` deviation leaves `ENOBUFS` unhandled — **RESOLVED 2026-09-15**

> **Resolution summary (pass 2).** Fixed by the executor in `src/doctor.ts` and verified
> end to end by the auditor; the original finding is retained verbatim below for the
> record. See "F1 resolution — auditor's verification" immediately after it.

**Original finding (2026-09-14):**

`src/doctor.ts:380–384` changed `stdio: 'inherit'` to `stdio: ['ignore', 'pipe', 'pipe']`
with `encoding: 'utf8'`, but passes no `maxBuffer`. Probed empirically on Node v24.16.0:

| child stdout | `result.status` | `result.error.code` |
|---|---|---|
| 1,000,001 bytes | `2` | *(none)* |
| 3,000,001 bytes | `null` | `ENOBUFS` |

`runDoctor` never inspects `result.error`. With `status === null` it matches neither
`EXIT.OK` nor `2` and falls through to
`throw new Error('.sdd/doctor/run-doctor.mjs exited with unexpected code null (expected 0 or 2).')`,
which is not a `HarnessError` and therefore maps to `EXIT.UNEXPECTED` (`1`).

This is reachable, not theoretical: family 5 embeds the **entire** combined
stdout+stderr of the failing test command into a single `FAIL` detail line
(`templates/doctor/run-doctor.mjs:264–265`), and a failing suite in a mid-sized repo
routinely exceeds 1 MiB. The doctor is precisely the tool one points at an unfamiliar
repo whose tests may be red.

Consequences:
1. **AR-16 / RD-7 is broken** in that case: direct `node .sdd/doctor/run-doctor.mjs`
   exits `2` (not ready), while `npx harny doctor` exits `1` (runner broke). The two
   disagree.
2. **The Error Handling Contract's core separation is inverted** — "a broken runner is
   never confused with a red result" now fails in the other direction: a correctly-run
   red result is reported as a broken runner.
3. **AR-3's contracted `HarnessError('NOT_READY')` → exit `6` is never reached.**

It never produces a false *green*, which is what keeps this out of CRITICAL. The fix is
one line — pass a generous `maxBuffer` and/or branch on `result.error` before the
exit-code translation — plus a test. `harny-implement` owns the fix; this audit does not
apply it.

### F1 resolution — auditor's verification (2026-09-15)

**What changed** (`src/doctor.ts` only, plus one test in `tests/doctor.test.ts`):

- `DOCTOR_RUNNER_MAX_BUFFER = 64 * 1024 * 1024`, a module-private constant, passed as
  `maxBuffer` on the `spawnSync` call.
- An explicit `result.error` branch placed **before** the `EXIT.OK` / `2` / fallthrough
  branches, throwing `HarnessError('USAGE')` with an `ENOBUFS`-specific detail naming
  the byte limit and the direct-invocation workaround.
- Partial stdout/stderr captured up to the limit is still printed via `io.log`,
  best-effort, before the throw.

**Verified by the auditor, independently:**

1. **The realistic band that F1 broke is closed.** A stub runner emitting 5 MiB and
   exiting `2` now yields verb exit **`6`** (`NOT_READY`) with all 5,242,998 bytes
   printed. This is the case that previously produced exit `1`. AR-3 and the Error
   Handling Contract's red-vs-broken separation both hold again.
2. **The overrun case is diagnosable, not a crash.** A stub emitting 70 MiB yields verb
   exit **`2`** (`USAGE`) — not `1` (`UNEXPECTED`) — with the message
   `.sdd/doctor/run-doctor.mjs could not be run to completion: spawnSync … ENOBUFS` and
   the detail `Its combined output exceeded the 67108864-byte capture limit. Run node
   .sdd/doctor/run-doctor.mjs directly (cwd …) to see the full report.` The workaround it
   names was tested and works: direct invocation on the same runner exits `2` and prints
   all 73,400,320 bytes. ~64 MiB of partial output was still emitted before the throw, as
   intended.
3. **RD-R2 is not reintroduced or worsened.** Confirmed structurally: the `result.error`
   throw at `src/doctor.ts:422` precedes both the construction of `ran` (line 436) and
   the only `return` (line 439), so `DoctorResult` is never constructed on the error
   path. The single return still hard-codes `skipped: []`/`failed: []`, and no `warned`
   field was added. `DoctorResult`'s declared shape is byte-for-byte unchanged. RD-R2
   stays exactly as open as `intent.md` § Non-Goals requires — see F2 for the separate
   wording problem, which this fix does not touch and was not asked to.
4. **`maxBuffer: 64 MiB` is reasonable, and a fixed constant is the right call.** It is
   64× Node's default and far above any realistic readiness report; the driver is family
   5 embedding a failing suite's combined output, which rarely reaches single-digit MiB.
   Making it configurable would require a new CLI flag, which `intent.md` § Non-Goals
   explicitly forbids ("No new CLI verb and no new CLI flag") — so a fixed constant plus
   a documented escape hatch is not merely acceptable here, it is what the spec's own
   constraints mandate, and the escape hatch is real and verified. Not raised as a
   finding. One characteristic worth knowing: `spawnSync` buffers in memory and
   `encoding: 'utf8'` decodes on top, so the pathological case peaks north of 100 MiB
   transiently — bounded and acceptable for a CLI, noted rather than faulted.
5. **`S5`/`S2` hygiene.** The constant is owned at one site and interpolated into the
   diagnostic rather than re-typed as "64 MiB" (`S5`). The new throw is a `HarnessError`
   (`S2`); see F10, which this materially improves.
6. **No regression.** `npx vitest run` → 555/555; `npx tsc -p tsconfig.json --noEmit` →
   clean; dogfood still `24 ok, 0 skipped, 0 warned, 0 failed` at exit `0`; runner and
   both skill parities re-measured identical. `git status --short` shows the change
   surface grew by nothing beyond `src/doctor.ts` and `tests/doctor.test.ts`.
7. **Nothing else was touched.** F2, F3, F4, F5, F6, F7 and F8 were each re-checked at
   their exact source locations and are unchanged — correctly left as reservations
   rather than opportunistically swept in.

**Rated RESOLVED.** F1 no longer blocks or qualifies approval.

### F2 (MEDIUM) — RD-R2's recorded rationale is now obsolete

`specs/current/readiness-checks.md` RD-R2 reads: *"`DoctorResult.skipped` and `.failed`
are structurally never non-empty **because `stdio: 'inherit'` leaves the parent with no
channel to observe per-check outcomes**"*, and `intent.md` § Non-Goals repeats the same
causal claim nearly verbatim while declaring the output-capture rework out of scope.

This feature performed exactly that output-capture rework. The parent now has the
channel; it simply declines to parse it. The reservation's **effect** is genuinely
unchanged — I confirmed both fields are still hard-coded `[]`, no `warned` field was
added, and `DoctorResult`'s shape is untouched — so the Non-Goal "not closing RD-R2" is
honored and the executor's note on this point is accurate. But the reservation's
**stated cause** is now false, and `harny-sync` archive mode would otherwise carry that
false statement forward into current truth. RD-R2's wording must be amended at
documentation time to something like *"declines to parse the captured output"*.

### F3 (MEDIUM) — streaming loss and stderr/stdout conflation

Two observable behavior changes ride along with the same undeclared deviation:

1. Output is now buffered until the child exits. Family 5 spawns the full test suite;
   the user previously saw the report stream, and now sees nothing until every check —
   including the test run — has finished. Seconds on harny; potentially minutes
   elsewhere.
2. The child's stderr is re-emitted through `io.log` (stdout), not `io.warn`. Runner
   diagnostics such as `run-doctor.mjs: could not read --checks file "…"` now arrive on
   stdout. `InitIO` already exposes `warn`, so this is a one-line choice, not a
   constraint.

Neither is contract-pinned, so neither is a violation — but both are user-visible
regressions arising from a change that `roadmap.md`'s File Change Map never anticipated.

### F4 (MEDIUM) — AR-19's assertions do not actually pin bootstrap mode's refusals

`tests/skills-fidelity.test.ts`'s `REQUIRED_SUBSTRINGS` for `harny-document` are
`'Bootstrap mode'`, `'draft'`, `'CHANGELOG.md'`, `'harny-sync'`, `'harny-adr'`. Four of
those five already occur in the pre-existing post-audit section of the same file. The
assertion would therefore still pass if **every one** of bootstrap mode's refusal
clauses were deleted, so long as the `## Bootstrap mode` heading survived.

To be clear about what is *not* wrong here: the conductor asked whether bootstrap mode's
guardrail logic exists as code. It does not need to — `contract.md` § Interfaces places
this guarantee in the `SKILL.md` itself ("Skill interface — `.claude/skills/harny-document/SKILL.md`"),
so prose *is* the specified interface. I read both copies in full and confirm every
contracted element is present and correct: the trigger, the bounded input set, the draft
marking, all four refusals, the explicit refusal of a `specs/<feature>/` target, and the
mutual-unreachability statement. This is **not** a missing implementation — it is a
weak assertion over a correct implementation. Recommended fix: assert on distinctive
phrases from the refusal clauses themselves (e.g. "never writes or reads a `specs/`
path", "can never be used to bypass the post-audit gate").

### F5 (LOW) — SC7 and AR-7 cannot both hold literally

`src/doctor.ts:175–176` still carry `'CLAUDE.md'` as a source literal inside
`conventions-doc`. SC7 ("No tool id, instruction-file path, or tool count appears as a
literal in `src/doctor.ts`") and AR-8's restatement are absolute; AR-7 simultaneously
requires `conventions-doc` be left untouched. The implementation chose AR-7, which is
correct — AR-7 is the load-bearing, stale-runner-safety guarantee, and `intent.md`
§ Constraints calls it "the single most load-bearing 'do not touch' in this feature".
The T5 assertion consequently narrows itself to the two genuinely new tool paths, which
is the honest scope. This is a spec-internal contradiction to settle in the wording of
`specs/current/`, not an implementation defect. `'CLAUDE.md'` is now also literalled in
`src/generators/claude-code.ts` as that tool's owned fact, so a future cleanup has an
obvious owner to import from.

### F6 (LOW) — README behavior 4 replaced rather than extended

`contract.md` § "Public API — `templates/doctor/README.md`" asks for *"a new behavior"*
stating the two tiers, and for existing behavior 4 to be *"extended, not replaced"*.
The implementation merged the tier statement into behavior 4 and dropped its original
headline, *"A skip is reported as coverage, never as a pass."* The semantics survive —
new behavior 4 names `skip` as "not checked" and preserves the three-way distinction —
and the list did grow from six to eight items with genuinely new items 7 and 8. Every
required statement is present, tool-neutral, and ahead of any implementation detail. So
the substance of AR-21 holds; only the "extend, don't replace" letter is bent. Worth a
sentence restoring "never as a pass" as an explicit claim.

### F7 (LOW) — only one family is visually labelled

`templates/doctor/run-doctor.mjs:191–193` prints `-- repo readiness --` before family 3,
but families 1, 2, 4 and 5 print no heading at all. The report therefore reads as four
unlabelled families plus one labelled one, rather than five labelled sections. SC1 is
satisfied (repo-readiness findings *are* grouped under their own family, in the right
position), so this is cosmetic — but the asymmetry is visible in the live report and a
future reader may mistake `-- repo readiness --` for a special case rather than the
first of a series.

### F8 (LOW) — `DoctorResult.ran`'s doc-comment is now inaccurate

`src/doctor.ts:297` documents `ran` as *"`id` of every `require`/command check that ran,
skipped, or failed"*, and `runDoctor:398` still populates it from `checks.require` and
`checks.commands` only. The three repo-readiness checks now genuinely run and are absent
from it. `contract.md` § State Changes explicitly pins `runDoctor`'s return value as
unchanged, so this is contract-compliant by construction — but the field's own
description no longer describes it, and a caller reading `ran` will silently under-count.

### F9 (LOW, carried) — S6 and contract ids in test names

Contract ids appear inside `describe`/`it` strings throughout the new tests
(`(AR-6, T1)`, `(T9, AR-1, SC1)`, …). `S6` says contract ids never appear in test names.
This is identical to `readiness-doctor` audit F13 and is a repo-wide convention that
predates this feature; recorded, not faulted. Worth settling once in `AGENTS.md` rather
than churning tests per feature. The same applies to `tests/doctor-runner.test.ts`'s flat
path, also carried from F13.

### F10 (LOW, carried) — S2 and the plain `Error` — **IMPROVED 2026-09-15**

`readiness-doctor` audit F12 already recorded that `src/doctor.ts`'s unexpected-exit-code
throw is the only deliberate non-`HarnessError` in `src/`, and that the contract pins it.
Carried unchanged — except that F1 makes it reachable for a legitimate runtime condition
rather than only for a genuine bug, which is the reading `CLI-2` relied on to justify it.

**Pass 2:** the F1 fix materially improves this. `result.error` — the one legitimate
runtime condition that reached the plain `Error` — is now intercepted and raised as
`HarnessError('USAGE')`. The plain `Error` fallthrough survives but is once again
reachable only by a genuine bug (a runner exiting with some status other than `0`/`2`
and no spawn error), which is exactly the reading `CLI-2` and `S2` rely on. The carried
deviation is now harmless; `readiness-doctor` F12's suggested `S2` clarifying clause in
`AGENTS.md` remains worth adding, but is no longer load-bearing.

### F12 (LOW, new in pass 2) — AR-16 is now bounded, and the bound is undocumented

The F1 fix makes AR-16/RD-7 hold across the whole realistic range, but it holds
*bounded*: under 64 MiB the verb and the direct runner agree exactly; above it the verb
raises `USAGE` and declines to reach a readiness conclusion at all.

**My judgment is that this does not violate RD-7**, and the conductor's framing is
right. RD-7 guarantees the two paths "evaluate the same checks and reach the same
ready/not-ready conclusion". In the overrun case the verb does not reach a *different*
conclusion — it reaches *none*, says so explicitly, and names the path that can reach
one. An abstention that announces itself is not a disagreement. The contrast with the
pre-fix behavior is the whole point: exit `1` asserted "the runner could not run" about a
runner that *had* run correctly and red, which was a false claim about the world; exit
`2` (`USAGE`) with an `ENOBUFS` message makes a true one.

What is worth recording is only that `contract.md` AR-16 states the agreement
unconditionally, and it is now conditional on a 64 MiB report ceiling. One clause at
documentation time — noting the bound and the direct-invocation escape hatch — keeps the
contract honest. No code change needed.

### F11 (LOW) — no CI run against this change

`.github/workflows/harny-feedback.yml` triggers on `pull_request` only, and this change
is uncommitted and unpushed, so no run exists for it. This is structural to auditing
before the documentation/commit step, not a fault of this feature. The most recent run
in repo history is green with `N = 1` (a real `tsc` run, `eslint` legitimately
probe-skipped), so the gate itself is known-working. Flagged so the conductor requires a
green PR run before merge.

## Open reservations carried forward

| ID | Status after this feature | Auditor's verification |
|---|---|---|
| RD-R1 | **Exactly as open.** Neither widened nor closed | `templates/doctor/run-doctor.mjs` still hard-codes `'intent.md'` and `'audit.md'` at the same two sites, with the same text as `HEAD`. G7 is honored: no new document name, path, tier or label literal was added |
| RD-R2 | **Effect exactly as open; rationale now obsolete** | `DoctorResult` shape untouched, `skipped`/`.failed` still hard-coded `[]`, no `warned` field added. But the `stdio: 'inherit'` clause the reservation names as its cause no longer describes the code. See F2. **Re-confirmed in pass 2:** the F1 fix throws before `DoctorResult` is ever constructed, so it neither reintroduces nor worsens this |
| RD-R5 | **Unchanged, and now more consequential** | Still no automated test drives both the verb and the direct runner path. F1 was the first known case where they disagreed; it is fixed, but the gap that let it ship undetected is not. Closing RD-R5 remains the highest-value follow-up |
| AL-30 / CG-1 / O4 | **Carried, correctly bounded** | Every per-tool `guidancePath` fact is documentation-verified only, but each derived entry is `recommended` and each `anyOf` includes `AGENTS.md`, so a wrong fact degrades to a redundant advisory, never a false red |

## Executor-flagged items — auditor's independent conclusions

1. **`conventions-doc` "untouched"** — **Confirmed legitimate.** Id, position (`require[0]`),
   `anyOf`, absent `tier` and failing outcome are all unchanged; the two changed string
   expressions evaluate to byte-identical output; the `require` array gained, lost and
   reordered nothing. Verified three ways: source diff against `HEAD`, the regenerated
   `checks.json`, and a live run of `HEAD`'s pre-feature runner against the new payload.
2. **The `stdio` deviation** — **Narrow and honestly recorded, but incomplete as
   shipped.** `DoctorResult`'s shape is untouched and RD-R2's effect is neither fixed nor
   worsened, exactly as claimed. RD-7 holds on the happy path (verified: identical
   reports, identical exit codes). But the change was **not** fully behavior-preserving:
   it left `ENOBUFS` unhandled (F1, HIGH — **since fixed and verified closed**), loses
   live streaming, conflates stderr into stdout (F3), and falsifies RD-R2's stated
   rationale (F2). Of those, only F1 affected runtime behavior; F2 and F3 remain open.
3. **The SC17 fixture amendment** — **Correct call, not scope creep.** `intent.md`
   § Constraints declares the behavior change explicitly. The fixture's own comment
   already recorded an identical earlier amendment (adding `AGENTS.md` for
   `conventions-doc`), so this follows established precedent in the same test. The
   assertion (`result === 0`) is unchanged — nothing was weakened; the fixture was kept
   truthful to its own name.
4. **`harny-document`'s one non-identical line** — **Confirmed pre-existing.** Diffed both
   sides at `HEAD`: the identical three-line `templates-skill-library-parity` divergence
   was already present, at the same position, with the same text. This feature introduced
   no new divergence; every line it added landed byte-for-byte in both copies.
5. **Bootstrap-mode runtime behavior** — **Implemented and correct; test coverage weak.**
   `contract.md` § Interfaces places this guarantee in the `SKILL.md` itself, so there is
   no code site that is "missing" — prose is the specified interface, and every contracted
   element is present and correct in both copies. Rated as a **coverage gap (F4, MEDIUM)**,
   not a defect, per the conductor's own instruction.
6. **The live dogfood run** — **Reproduced independently.** `node bin/harness.js doctor` →
   exit `0`, `24 ok, 0 skipped, 0 warned, 0 failed`, byte-for-byte matching `tasks.md`
   § Notes. The direct runner invocation produces the identical report and exit code.
7. **Feedback hook and CI** — hook fired (turn-directory mtime evidence) and its findings
   are consistent with a clean run; CI workflow present and structurally correct; no run
   against this change because it is unpushed (F11). The mapped commands were not
   re-invoked by the auditor, per `harny-feedback`'s guardrail.

## Audit Log

| Date | Auditor | Finding | Severity | Resolution |
|---|---|---|---|---|
| 2026-09-14 | `harny-audit` | **F1 — unhandled `ENOBUFS` from the undeclared `stdio` deviation.** `spawnSync` without `maxBuffer` returns `status: null` / `error.code === 'ENOBUFS'` above 1 MiB (probed on Node v24.16.0). `runDoctor` never inspects `result.error` and throws a plain `Error` → exit `1`. Breaks AR-16 (verb and direct invocation disagree), inverts the red-result/broken-runner distinction, and bypasses AR-3's exit `6`. Reachable because family 5 embeds the whole failing test command's output in one line | HIGH | Pass a generous `maxBuffer` to `spawnSync` and/or branch on `result.error` before exit-code translation; add a regression test. Strongly recommended before merge |
| 2026-09-14 | `harny-audit` | **F2 — RD-R2's rationale falsified.** The reservation (and `intent.md` § Non-Goals) attribute the empty `skipped`/`failed` to `stdio: 'inherit'` giving no observation channel. That channel now exists; only the parsing is declined. The effect is correctly left open, but the stated cause is wrong | MEDIUM | `harny-sync` must amend RD-R2's wording in `specs/current/readiness-checks.md` at documentation time, not carry the stale rationale forward |
| 2026-09-14 | `harny-audit` | **F3 — streaming loss and stderr→stdout conflation.** Report now buffers until the child (including the full test suite) exits; runner stderr is re-emitted via `io.log` rather than the available `io.warn` | MEDIUM | Route `result.stderr` through `io.warn`; consider a streaming capture if the pause proves material on large repos |
| 2026-09-14 | `harny-audit` | **F4 — AR-19's substring assertions are largely satisfied by pre-existing text.** Four of five `REQUIRED_SUBSTRINGS` for `harny-document` already occur in the post-audit section; the bootstrap refusal set would survive deletion undetected | MEDIUM | Assert on distinctive phrases from the refusal clauses themselves |
| 2026-09-14 | `harny-audit` | **F5 — SC7 not literally satisfiable alongside AR-7.** `'CLAUDE.md'` remains a literal at `src/doctor.ts:175–176` inside the deliberately-untouched `conventions-doc` | LOW | Settle the wording of SC7/AR-8 in `specs/current/` to exempt `conventions-doc`; implementation chose correctly |
| 2026-09-14 | `harny-audit` | **F6 — README behavior 4 replaced rather than extended**, and the two-tier statement merged into it rather than added as its own behavior; "never as a pass" dropped | LOW | Restore an explicit "a skip is never a pass" claim in behavior 4 |
| 2026-09-14 | `harny-audit` | **F7 — only family 3 prints a heading**; the other four families remain unlabelled in the report | LOW | Cosmetic; consider labelling all five or none |
| 2026-09-14 | `harny-audit` | **F8 — `DoctorResult.ran`'s doc-comment overstates its contents**; the three repo-readiness checks run but are not listed | LOW | Correct the doc-comment; changing the value itself is out of scope per contract § State Changes |
| 2026-09-14 | `harny-audit` | **F9 — `S6`: contract ids inside `describe`/`it` strings** (carried from `readiness-doctor` F13); `tests/doctor-runner.test.ts`'s flat path likewise | LOW | Recorded, not faulted. Settle `S6`'s wording in `AGENTS.md` once |
| 2026-09-14 | `harny-audit` | **F10 — `S2`: plain `Error` for an unexpected runner exit code** (carried from `readiness-doctor` F12), now reachable for a legitimate condition rather than only a bug | LOW | Resolved incidentally by fixing F1 |
| 2026-09-14 | `harny-audit` | **F11 — no CI run against this change** (workflow triggers on `pull_request`; change unpushed). Latest run in history is green with `N = 1`, so the gate itself is working | LOW | Require a green `harny feedback` run on the PR before merge |
| 2026-09-15 | `harny-audit` | **F1 RESOLVED.** Re-audited the executor's fix (`DOCTOR_RUNNER_MAX_BUFFER = 64 MiB` + a `result.error` branch raising `HarnessError('USAGE')` before the exit-code translation, plus one behavioral test). Verified end to end at the CLI surface: a 5 MiB red report now yields verb exit `6` (was `1`); a 70 MiB overrun yields exit `2` (`USAGE`) with an `ENOBUFS` diagnostic naming the limit and a workaround that was tested and works. `DoctorResult` never constructed on the error path, so RD-R2 is neither reintroduced nor worsened. 555/555 tests, `tsc` clean, dogfood and all parities still green | — | Closed. No further action |
| 2026-09-15 | `harny-audit` | **F10 IMPROVED.** The plain `Error` fallthrough is no longer reachable for a legitimate runtime condition; `S2`'s carried deviation is now harmless | LOW | Downgraded to cosmetic; the `AGENTS.md` `S2` clarifying clause remains optional |
| 2026-09-15 | `harny-audit` | **F12 — AR-16 now holds bounded at 64 MiB, and `contract.md` states it unconditionally.** Judged *not* an RD-7 violation: the verb abstains with a diagnosable `USAGE` and names the path that can conclude, rather than reaching a different conclusion | LOW | Add one clause to AR-16 at documentation time noting the bound and the direct-invocation escape hatch. No code change |
| 2026-09-15 | `harny-audit` | **F2/F3/F4 and all remaining LOW findings re-checked and confirmed untouched** at their exact source locations — correctly left as reservations rather than opportunistically swept into the fix | — | Unchanged; carry forward as listed |

## Final Verdict

*(Pass 1, 2026-09-14: APPROVED WITH RESERVATIONS, with F1 (HIGH) as the one item
strongly recommended before merge. Superseded by pass 2 below after F1 was fixed.)*

**Status**: APPROVED WITH RESERVATIONS

**Summary**: The feature is faithfully and unusually carefully implemented — all 23
behavior guarantees now hold, the fifth family is genuinely data-driven (proven
behaviorally with invented per-tool paths, not merely by grep), `conventions-doc` is
verifiably untouched down to its emitted bytes, scope is held to exactly three entries
and three coherence elements with no new file and no new dependency, and both open
reservations are left open. The one substantive problem found in pass 1 — the undeclared
`stdio` deviation leaving `spawnSync`'s `ENOBUFS` unhandled — has been fixed correctly,
minimally, and with a real behavioral test, and is verified closed end to end. The
remaining reservations are documentation-and-coverage items, none of which affects
runtime behavior.

**Critical Issues** (must fix before merge):

- *(none)* — no contract violation, missing interface, or broken guarantee on any
  contracted path.

**Warnings** (should fix, not blocking):

- ~~**F1 (HIGH)**~~ — **RESOLVED 2026-09-15.** Verified end to end: a 5 MiB red report now
  reaches verb exit `6` (previously `1`), and a >64 MiB overrun produces a diagnosable
  `HarnessError('USAGE')` naming the limit and a working workaround, never a crash.
  RD-R2 is not reintroduced. No longer qualifies approval.
- **F2 (MEDIUM).** RD-R2's recorded rationale is now false. Its *effect* is correctly
  left open, but `harny-sync` must amend the wording in
  `specs/current/readiness-checks.md` rather than carry the obsolete `stdio: 'inherit'`
  justification forward. **This is the single most important item to carry into
  documentation** — it is the only finding that would otherwise write a false statement
  into current truth.
- **F3 (MEDIUM).** Live streaming is lost and runner stderr is re-emitted on stdout via
  `io.log`; `io.warn` is available and is the right channel.
- **F4 (MEDIUM).** AR-19's substring assertions are largely satisfied by pre-existing
  text, so bootstrap mode's refusal set is effectively untested. The prose itself is
  present and correct — this is a coverage gap, not a defect.

**Recommendations** (nice to have):

- Close RD-R5 for AR-16 by adding a single test that drives both the verb and the direct
  runner against one fixture and asserts they agree — F1 is exactly the class of bug it
  would have caught, and its fix does not close the gap that let it ship.
- Note AR-16's new 64 MiB bound and its direct-invocation escape hatch in `contract.md`
  at documentation time (F12).
- Restore an explicit "a skip is never a pass" claim to `templates/doctor/README.md`
  behavior 4 (F6), and either label all five families in the report or none (F7).
- Correct `DoctorResult.ran`'s doc-comment (F8).
- Settle `S6`'s wording on contract ids in test names once in `AGENTS.md`, rather than
  re-litigating the same carried deviation every feature (F9). The `S2` clarifying clause
  (F10) is now optional rather than load-bearing.
- Require a green `harny feedback` CI run on the PR before merge (F11).
