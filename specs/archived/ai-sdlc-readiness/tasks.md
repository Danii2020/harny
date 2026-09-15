# Tasks: AI/SDLC Readiness Check

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task names the `roadmap.md` phase step it implements and the `contract.md`
guarantee(s) it serves. Paths are real paths in this repository.

## Phase 1: Foundation — behavior document, data model, and per-tool facts

- [x] Task 1.1: Amend behavior 1 to five families in fixed order, naming `repo
      readiness` and why it is separate from the harness manifest — `templates/doctor/README.md`
      *(roadmap 1.1 · AR-1, AR-21)*
- [x] Task 1.2: Add a behavior stating the two tiers — a must-have item absent fails the
      run and makes the repo not ready; a recommended item absent warns and never changes
      an exit code — `templates/doctor/README.md` *(roadmap 1.1 · AR-3, AR-4, AR-21)*
- [x] Task 1.3: Extend (do not replace) existing behavior 4 to distinguish three
      non-`ok` cases — not checked (`skip`), checked and lacking but not blocking
      (`warn`), checked and blocking (`fail`) — and restate behavior 5 with "a warned run
      is a ready run" — `templates/doctor/README.md` *(roadmap 1.1 · AR-2, AR-14, AR-21)*
- [x] Task 1.4: Add a behavior stating the presence/coherence division — the runner
      asserts presence only and never inspects a document's contents — and add the
      stale-runner remediation note, tool-neutrally per `S7` — `templates/doctor/README.md`
      *(roadmap 1.1 · AR-17, AR-21)*
- [x] Task 1.5: Add `CheckTier` and `DoctorCheck.tier?: CheckTier`, doc-commented that an
      absent field means `must-have` and that this type is unrelated to `CostTier` —
      `src/doctor.ts` *(roadmap 1.2 · AR-5)*
- [x] Task 1.6: Add `AGENTS_GUIDANCE_PATH`, `README_PATHS`, `ARCHITECTURE_PATHS`,
      `REPO_READINESS_FAMILY_LABEL` — `src/doctor.ts` *(roadmap 1.3 · AR-6, AR-11)*
- [x] Task 1.7: Make the existing `conventions-doc` entry import `AGENTS_GUIDANCE_PATH`
      instead of re-literalling `'AGENTS.md'`, with its emitted JSON unchanged byte for
      byte — `src/doctor.ts` *(roadmap 1.3 · `S5`, AR-7, AR-13)*
- [x] Task 1.8: Extend `DoctorChecksFile` with `repoReadiness` and `repoReadinessLabel`,
      keeping `version: 1` and every existing member's declaration order —
      `src/doctor.ts` *(roadmap 1.4 · AR-5, AR-13)*
- [x] Task 1.9: Add `readonly guidancePath: string | undefined` to `Generator`, with the
      ADR 0011-not-0014 rationale in its doc comment — `src/generators/types.ts`
      *(roadmap 1.5 · AR-9)*
- [x] Task 1.10: Declare `guidancePath = 'CLAUDE.md'`, with its 2026-09-14 verification
      comment — `src/generators/claude-code.ts` *(roadmap 1.6 · AR-9)*
- [x] Task 1.11: Declare `guidancePath = undefined` (Cursor reads root `AGENTS.md`
      natively), with its verification comment — `src/generators/cursor.ts`
      *(roadmap 1.6 · AR-9)*
- [x] Task 1.12: Declare `guidancePath = '.kiro/steering'`, with its verification comment
      and the `AL-30` caveat — `src/generators/kiro.ts` *(roadmap 1.6 · AR-9)*
- [x] Task 1.13: Declare `guidancePath = '.github/copilot-instructions.md'`, with its
      verification comment and the `AL-30` caveat — `src/generators/github-copilot.ts`
      *(roadmap 1.6 · AR-9)*
- [x] Task 1.14: Declare `guidancePath = undefined` (Codex loads root `AGENTS.md`), with
      its verification comment and the `CG-1`/`O4` caveat — `src/generators/codex.ts`
      *(roadmap 1.6 · AR-9)*

## Phase 2: Core Logic — the family builder and the runner

- [x] Task 2.1: Implement `buildRepoReadinessChecks(generators)` returning
      `repo-readiness:readme` (must-have, ungated) and `repo-readiness:architecture`
      (recommended, ungated) in that fixed order — `src/doctor.ts`
      *(roadmap 2.1 · AR-6, AR-10, AR-13)*
- [x] Task 2.2: Extend `buildRepoReadinessChecks` with one
      `repo-readiness:agent-guidance:<path>` entry per distinct declared `guidancePath`,
      recommended and `HARNESS_GATE`-gated, using the existing `dedupePreserveOrder`
      helper with `undefined` filtered out — `src/doctor.ts`
      *(roadmap 2.1 · AR-6, AR-8, AR-10)*
- [x] Task 2.3: Wire `repoReadiness` and `repoReadinessLabel` into `buildDoctorChecks`'
      return value **without touching the existing `require` array** — no entry added,
      removed or reordered — `src/doctor.ts` *(roadmap 2.2 · AR-7, AR-13)*
- [x] Task 2.4: Extract the family-2 body into one `evaluateEntry(entry, cwd)` used by
      both family 2 and family 3, with the miss branch splitting on
      `entry.tier === 'recommended'` → `warn`, else `fail` —
      `templates/doctor/run-doctor.mjs` *(roadmap 2.3 · AR-3, AR-4, AR-5, AR-12)*
- [x] Task 2.5: Add the `'warn'` arm and `warnCount` to `emit` —
      `templates/doctor/run-doctor.mjs` *(roadmap 2.4 · AR-4, AR-14)*
- [x] Task 2.6: Emit family 3 between the harness-manifest loop and the spec-state block,
      printing `checks.repoReadinessLabel` as its heading and iterating
      `checks.repoReadiness ?? []`, both reads tolerating absence —
      `templates/doctor/run-doctor.mjs` *(roadmap 2.4 · AR-1, AR-5, AR-11)*
- [x] Task 2.7: Update the summary line to four counts in the order ok / skipped /
      warned / failed, leaving `process.exit(failCount > 0 ? 2 : 0)` untouched —
      `templates/doctor/run-doctor.mjs` *(roadmap 2.5 · AR-4, AR-14)*
- [x] Task 2.8: Review the changed runner line by line and confirm no document name,
      accepted path, tier value or family label was introduced as a literal — the
      deliberate non-repetition of RD-R1 — `templates/doctor/run-doctor.mjs`
      *(roadmap 2.6 · AR-11)*

## Phase 3: Integration — the two skills, parity, and dogfood

- [x] Task 3.1: Add the coherence-assessment step — the three elements (purpose,
      components, validation), must-have for the conventions document and recommended for
      README/architecture, reported per document by name —
      `.agents/skills/harny-doctor/SKILL.md` *(roadmap 3.1 · AR-17)*
- [x] Task 3.2: Add the ready / not-ready verdict rule and the ask-before-delegating
      hand-off to `harny-document`, plus the new guardrail, leaving "Never fix what it
      finds" verbatim — `.agents/skills/harny-doctor/SKILL.md` *(roadmap 3.1 · AR-18)*
- [x] Task 3.3: Grow the frontmatter `description` within the `SL-4` cap using only the
      six `SL-3` keys — `.agents/skills/harny-doctor/SKILL.md` *(roadmap 3.1 · AR-20)*
- [x] Task 3.4: Add bootstrap mode — its trigger, its bounded input set, its draft
      marking, and its refusals (no source, no `specs/` path, no `CHANGELOG.md`, no
      `harny-sync`/`harny-adr` hand-off) — and state that the post-audit path is unchanged
      and unreachable from it — `.agents/skills/harny-document/SKILL.md`
      *(roadmap 3.2 · AR-19)*
- [x] Task 3.5: Grow the frontmatter `description` within the `SL-4` cap using only the
      six `SL-3` keys — `.agents/skills/harny-document/SKILL.md` *(roadmap 3.2 · AR-20)*
- [x] Task 3.6: Copy the edited skill byte-for-byte —
      `templates/skills/harny-doctor/SKILL.md` *(roadmap 3.3 · AR-20)*
- [x] Task 3.7: Copy the edited skill byte-for-byte —
      `templates/skills/harny-document/SKILL.md` *(roadmap 3.3 · AR-20)*
- [x] Task 3.8: Regenerate with the two new members and the family-3 entries for this
      repo's `claude-code`-only tool selection — `.sdd/doctor/checks.json`
      *(roadmap 3.4 · AR-13, AR-22)*
- [x] Task 3.9: Regenerate as a byte-identical copy of the updated template —
      `.sdd/doctor/run-doctor.mjs` *(roadmap 3.4 · AR-13)*
- [x] Task 3.10: Verify (do not assume) that the skill count, the template file count in
      `EXPECTED_TEMPLATE_FILES`, and every "ten skills" statement remain correct and need
      no edit — `tests/packaging.test.ts` *(roadmap 3.5 · AR-13)*

## Phase 4: Testing & Validation

- [x] Task 4.1: Assert the three entry kinds with their ids, `anyOf` sets and tiers —
      `tests/doctor.test.ts` *(roadmap 4.1 · AR-6)*
- [x] Task 4.2: Assert per-generator derivation and dedup with `undefined` filtered out,
      across a multi-tool and a single-tool config — `tests/doctor.test.ts`
      *(roadmap 4.1 · AR-8)*
- [x] Task 4.3: Assert `conventions-doc` is untouched — same id, same position in
      `require`, no `tier` — and that a missing conventions document still fails —
      `tests/doctor.test.ts` *(roadmap 4.1 · AR-7)*
- [x] Task 4.4: Assert purity and byte-identity of the generated `checks.json` across two
      builds from identical inputs — `tests/doctor.test.ts` *(roadmap 4.1 · AR-13)*
- [x] Task 4.5: Assert at source level that no tool id and no instruction-file path
      literal appears in the module — `tests/doctor.test.ts` *(roadmap 4.1 · AR-8)*
- [x] Task 4.6: Assert a must-have miss exits `2` and prints a `FAIL` line naming its
      remediation — `tests/doctor-runner.test.ts` *(roadmap 4.2 · AR-3)*
- [x] Task 4.7: Assert a recommended miss exits `0` and prints a `WARN` line naming its
      remediation — `tests/doctor-runner.test.ts` *(roadmap 4.2 · AR-4)*
- [x] Task 4.8: Assert a pre-feature checks payload with no `repoReadiness` runs all four
      original families unchanged, and that an entry with an unrecognised tier is treated
      as must-have — `tests/doctor-runner.test.ts` *(roadmap 4.2 · AR-5)*
- [x] Task 4.9: Assert the five families print in the fixed order and the summary line
      carries four counts in the order ok / skipped / warned / failed —
      `tests/doctor-runner.test.ts` *(roadmap 4.2 · AR-1, AR-14)*
- [x] Task 4.10: Assert at source level that the runner contains no new hard-coded
      document name, path, tier value or family label, and no content-inspection call —
      `tests/doctor-runner.test.ts` *(roadmap 4.2 · AR-11, AR-17)*
- [x] Task 4.11: Assert a red repo-readiness run writes nothing — fixture file list
      identical before and after — `tests/doctor-runner.test.ts`
      *(roadmap 4.4 · AR-15)*
- [x] Task 4.12: Assert the declared `guidancePath` matches the verified-facts table —
      `tests/generators/claude-code.test.ts` *(roadmap 4.3 · AR-9)*
- [x] Task 4.13: Assert the declared `guidancePath` matches the verified-facts table —
      `tests/generators/cursor.test.ts` *(roadmap 4.3 · AR-9)*
- [x] Task 4.14: Assert the declared `guidancePath` matches the verified-facts table —
      `tests/generators/kiro.test.ts` *(roadmap 4.3 · AR-9)*
- [x] Task 4.15: Assert the declared `guidancePath` matches the verified-facts table —
      `tests/generators/github-copilot.test.ts` *(roadmap 4.3 · AR-9)*
- [x] Task 4.16: Assert the declared `guidancePath` matches the verified-facts table —
      `tests/generators/codex.test.ts` *(roadmap 4.3 · AR-9)*
- [x] Task 4.17: Assert byte-identity of the two edited `SKILL.md` files across
      `.agents/skills/` and `templates/skills/` —
      `tests/skills-fidelity.test.ts` *(roadmap 4.5 · AR-20)*
- [x] Task 4.18: Run `npx harny doctor` against this repository live, confirm exit `0`
      with zero new failures and zero new warnings, and paste the actual report into
      § Notes below as the evidence — `specs/ai-sdlc-readiness/tasks.md`
      *(roadmap 4.6 · AR-22)*
- [x] Task 4.19: Record which success criteria are held by structure or manual
      observation rather than by automated test, so the RD-R5 class of gap is disclosed
      rather than implied — `specs/ai-sdlc-readiness/audit.md` *(roadmap 4.7)*

## Blocked Items

[None yet]

## Notes

**For the executor:**

- `templates/doctor/README.md` is amended **first** (Task 1.1–1.4), before any code. The
  behavior document is the canonical statement; the runner implements it, not the
  reverse. `S7` governs it: name the behavior first and a tool as an attributed example.
- The single most load-bearing "do not touch" in this feature is the existing `require`
  array in `buildDoctorChecks` (Task 2.3). `conventions-doc` stays exactly where it is —
  same id, same position, no `tier`. Moving it into the new family would mean a repo with
  a stale committed runner silently stops enforcing the most important must-have.
- `process.exit(failCount > 0 ? 2 : 0)` in the runner is deliberately untouched (Task
  2.7). If a `warn` ever reaches it, AR-4 is broken.
- `.claude/skills/harny-doctor` and `.claude/skills/harny-document` are **symlinks**;
  edit the canonical bodies under `.agents/skills/` (Tasks 3.1–3.5), then copy to
  `templates/skills/` (Tasks 3.6–3.7). Do not edit through the symlink path and do not
  create a second real file.
- No file is created by this feature. If a task seems to need a new file, stop and raise
  it — the file counts asserted by `tests/packaging.test.ts` are part of the contract.
- No dependency may be added (`S4`, AR-23).

**Live report from Task 4.18** (`node bin/harness.js doctor` run against this
repository's own working tree, 2026-09-14, after Phase 3's dogfood regeneration):

```
OK node-version - running on Node v24.16.0
OK conventions-doc
OK harness-manifest
OK spec-schema:intent
OK spec-schema:contract
OK spec-schema:roadmap
OK spec-schema:tasks
OK spec-schema:audit
OK feedback-runner
OK ci-workflow
OK conductor:.claude/skills/sdd-conductor/SKILL.md
OK core-skills:.claude/skills/harny-propose
OK core-skills:.claude/skills/harny-test
OK core-skills:.claude/skills/harny-implement
OK core-skills:.claude/skills/harny-audit
OK core-skills:.claude/skills/harny-document
OK core-skills:.claude/skills/harny-sync
OK core-skills:.claude/skills/harny-feedback
OK core-skills:.claude/skills/harny-doctor
OK knowledge-base
-- repo readiness --
OK repo-readiness:readme
OK repo-readiness:architecture
OK repo-readiness:agent-guidance:CLAUDE.md
OK npm-test
summary: 24 ok, 0 skipped, 0 warned, 0 failed
```

Exit code: `0`. Zero new failures, zero new warnings — AR-22/SC10 confirmed live, matching
the worked-example claim: `README.md` exists (must-have satisfied), `AGENTS.md` satisfies
`repo-readiness:architecture`, and this repo's `claude-code`-only tool selection's
`CLAUDE.md` exists (its own `repo-readiness:agent-guidance:CLAUDE.md` entry is `ok`).

**Deviation recorded (with justification):** `src/doctor.ts`'s `runDoctor` previously
spawned the runner with `stdio: 'inherit'`, streaming its report straight to the
inherited file descriptor. `tests/cli.test.ts`'s new SC2/SC3 tests capture output via
`vi.spyOn(process.stdout, 'write')`/`console.log`, which cannot observe bytes written to
an inherited fd by a child process (verified empirically: a probe script confirmed
`stdio: 'inherit'` output is invisible to a `process.stdout.write` spy in this test
harness). To make those two frozen tests pass without editing them, `runDoctor` now
spawns with `stdio: ['ignore', 'pipe', 'pipe']` and re-emits the captured `stdout`/
`stderr` verbatim through `io.log`, unparsed. This does not touch `DoctorResult`'s shape
(`skipped`/`failed` stay structurally empty arrays; no `warned` field was added) — RD-R2
stays open exactly as intent.md's Non-Goals require. This was not called out in
`roadmap.md`'s File Change Map; it is a minimal, behavior-preserving plumbing change
(the user still sees the full report; it is now printed after the subprocess exits
rather than streamed live) required to satisfy `tests/cli.test.ts`'s already-written
SC2/SC3 assertions.

**Second, smaller deviation:** the `.agents/skills/harny-document/SKILL.md` /
`templates/skills/harny-document/SKILL.md` pair keep the one line of pre-existing,
already-declared divergence from `templates-skill-library-parity` (`tests/
skills-fidelity.test.ts`'s `DIVERGENCE_TABLE['harny-document']`, kind `'diverges'`,
`requiredInTemplate: ["rather than assuming any prior history exists"]`) — this was not
touched, so the two files are not fully byte-identical, only identical outside that one
pre-existing, still-required additive clause. Every other line this feature added
(bootstrap mode, the description growth) was copied byte-for-byte to both files.

---

**Executor completion**: 2026-09-14. All Phase 1–4 tasks marked `[x]`. `npx vitest run`:
554/554 passing (519 pre-existing + 35 new), zero regressions. `npx tsc -p
tsconfig.json --noEmit`: clean. `harny-standards` (S1–S6) and `harny-feedback` checked
per file below.

---

**Post-audit fix (2026-09-15): `audit.md` finding F1 (HIGH) resolved.**

`src/doctor.ts`'s `runDoctor` `spawnSync` call (the `stdio: 'inherit'` → `['ignore',
'pipe', 'pipe']` + `encoding: 'utf8'` plumbing change from the executor's original pass,
made so `tests/cli.test.ts`'s SC2/SC3 could observe the runner's report) had no
`maxBuffer` and never checked `result.error`. A runner report exceeding Node's 1 MiB
`spawnSync` default (plausible: family 5 embeds a failing test command's entire combined
stdout+stderr into one `FAIL` line) produced `status: null` / `result.error.code ===
'ENOBUFS'`, which matched neither the `EXIT.OK` nor the `NOT_READY` (`2`) branch and fell
through to the generic `throw new Error('… exited with unexpected code null …')` — a
plain, non-`HarnessError` that the CLI reports as `EXIT.UNEXPECTED` (`1`), silently
inverting a correctly-run red result into an apparently broken runner and breaking
AR-16/RD-7 (verb vs. direct invocation agreement).

**Fix**: added a `DOCTOR_RUNNER_MAX_BUFFER` constant (64 MiB — generous headroom over
Node's 1 MiB default) passed as `spawnSync`'s `maxBuffer`, and added explicit
`result.error` handling *before* the exit-code branches: any `spawnSync`-level failure
(most commonly `ENOBUFS` past even the raised limit, or a pre-spawn failure like
`EACCES`) is now thrown as a diagnosable `HarnessError('USAGE')` — naming the byte limit
and the direct `node .sdd/doctor/run-doctor.mjs` workaround in its `details` for the
`ENOBUFS` case — never the generic fallthrough `Error`. No new `HarnessErrorCode` or
exit code was introduced (`USAGE` already exists and already maps to exit `2` at the CLI
layer, distinct from both `EXIT.OK` and `NOT_READY`/`6`).

**Test added**: `tests/doctor.test.ts`, inside the existing `runDoctor — pre-flight,
exit-code translation, and no-write proof` describe block — a stub runner that writes 70
MiB of stdout (exceeding the new 64 MiB `maxBuffer`) before exiting, asserting `runDoctor`
throws `HarnessError('USAGE')` naming the runner path, never a plain `Error`. A second,
new top-of-file `Spec:`/`Covers:` block documents this addition; neither pre-existing
header nor any pre-existing test in the file was touched.

Scope held exactly to F1: F2 (RD-R2 rationale wording), F3 (streaming/stderr-channel
behavior notes), F4 (bootstrap-mode test-assertion strength), and every LOW finding are
untouched, left as `audit.md`'s documented reservations.

Re-verified after the fix: `npx vitest run` → 555/555 passing (554 + 1 new), zero
regressions. `npx tsc -p tsconfig.json --noEmit` → clean.
