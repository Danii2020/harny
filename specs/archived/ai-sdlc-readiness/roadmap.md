# Roadmap: AI/SDLC Readiness Check

Four phases, ordered so the canonical behavior document is amended before any code
implements it, the data model exists before anything produces or consumes it, and the
dogfood regeneration happens only once the template artifacts are final.

## Implementation Phases

### Phase 1: Foundation — behavior document, data model, and per-tool facts

**Goal**: Establish what the fifth family *is* — in prose first, then in types — and
give every generator the one new fact the family needs, before any producer or consumer
exists. Nothing in this phase changes an observable outcome.
**Dependencies**: None
**Estimated complexity**: Low

1. Amend `templates/doctor/README.md` **first** (`contract.md` AR-21): behavior 1 grows
   from four families to five, naming `repo readiness` and why it is separate from the
   harness manifest; a new behavior states the two tiers (must-have fails and makes the
   repo not ready; recommended warns and never changes an exit code); existing behavior
   4 is **extended, not replaced**, to distinguish `skip` / `warn` / `fail`; existing
   behavior 5 is restated with "a warned run is a ready run"; a new behavior states the
   presence-in-the-runner / coherence-in-the-reading-procedure division. Tool-neutral
   throughout (`S7`) — the per-tool instruction files are named as attributed examples,
   never as the only possibility. Also add the stale-runner remediation note from
   `contract.md` § Error Handling Contract.
2. Add `CheckTier` and `DoctorCheck.tier?: CheckTier` to `src/doctor.ts`, with the
   doc-comment stating that an absent field means `must-have` and that this type is
   unrelated to `CostTier`.
3. Add the path constants `AGENTS_GUIDANCE_PATH`, `README_PATHS`, `ARCHITECTURE_PATHS`
   and `REPO_READINESS_FAMILY_LABEL` to `src/doctor.ts`, and make the existing
   `conventions-doc` entry import `AGENTS_GUIDANCE_PATH` instead of re-literalling
   `'AGENTS.md'` (`S5`). Its emitted JSON must not change by a single byte.
4. Extend `DoctorChecksFile` with `repoReadiness: readonly DoctorCheck[]` and
   `repoReadinessLabel: string`, keeping `version: 1` and the existing declaration
   order of all other members (key order is serialization order — `CLI-4`, `S3`).
5. Add `readonly guidancePath: string | undefined` to the `Generator` interface in
   `src/generators/types.ts`, with the ADR 0011-not-0014 rationale in its doc comment.
6. Declare `guidancePath` in all five generators, exactly per `contract.md`
   § "Verified per-tool root instruction files": `claude-code` → `'CLAUDE.md'`;
   `cursor` → `undefined`; `kiro` → `'.kiro/steering'`; `github-copilot` →
   `'.github/copilot-instructions.md'`; `codex` → `undefined`. Each value carries a
   source comment with its 2026-09-14 verification date and the `AL-30`/`CG-1` caveat.
   `tsc` failing on any generator that omits the member is the proof of AR-9.

### Phase 2: Core Logic — the family builder and the runner

**Goal**: Produce the fifth family's entries and evaluate them, including the tier
split and the new `warn` outcome.
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Implement `buildRepoReadinessChecks(generators)` in `src/doctor.ts`, returning the
   three entry kinds in the fixed order of `contract.md` § Interfaces: `readme`
   (must-have, ungated), `architecture` (recommended, ungated), then one
   `agent-guidance:<path>` per distinct declared `guidancePath` (recommended,
   `HARNESS_GATE`), computed with the existing `dedupePreserveOrder` helper and
   `undefined` filtered out. Pure (`BG-17`).
2. Wire it into `buildDoctorChecks`' return value as `repoReadiness`, and set
   `repoReadinessLabel` from `REPO_READINESS_FAMILY_LABEL`. **Do not touch the existing
   `require` array** — no entry added, removed or reordered (AR-7), which is what keeps
   `conventions-doc` blocking under a stale committed runner.
3. In `templates/doctor/run-doctor.mjs`: extract the family-2 body into one
   `evaluateEntry(entry, cwd)` used by both family 2 and family 3 (AR-12), with the miss
   branch splitting on `entry.tier === 'recommended'` → `warn`, else `fail`.
4. Add the `'warn'` arm and `warnCount` to `emit`, and emit family 3 between the
   harness-manifest loop and the spec-state block, printing
   `checks.repoReadinessLabel` as its heading and iterating
   `checks.repoReadiness ?? []`. Both new reads tolerate absence (`SC9`).
5. Update the summary line to four counts in the order ok / skipped / warned / failed.
   Leave `process.exit(failCount > 0 ? 2 : 0)` **untouched** — a warn must not reach it
   (AR-4).
6. Re-read the changed runner against `contract.md` AR-11: confirm no document name,
   accepted path, tier value or family label was introduced as a literal. This is the
   deliberate non-repetition of RD-R1 and is a review step, not a test.

### Phase 3: Integration — the two skills, parity, and dogfood

**Goal**: Give the coherence assessment and the human-gated hand-off a home, and bring
this repo's own scaffolded artifacts back in sync.
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. Edit `.agents/skills/harny-doctor/SKILL.md` (canonical; `.claude/skills/harny-doctor`
   is a symlink to it): add the coherence-assessment step (three elements, must-have for
   the conventions document and recommended for README/architecture), the ready /
   not-ready verdict rule, and the ask-before-delegating hand-off to `harny-document`.
   Add the new guardrail; leave "Never fix what it finds" verbatim. Grow the frontmatter
   `description` within the `SL-4` cap, using only the six `SL-3` keys.
2. Edit `.agents/skills/harny-document/SKILL.md`: add bootstrap mode — its trigger, its
   bounded input set, its draft marking, and its refusals (no source, no `specs/` path,
   no `CHANGELOG.md`, no `harny-sync`/`harny-adr` hand-off). State that the post-audit
   path is unchanged and unreachable from bootstrap mode. Same frontmatter constraints.
3. Copy both edited files to `templates/skills/harny-doctor/SKILL.md` and
   `templates/skills/harny-document/SKILL.md` so all copies are byte-identical
   (`FC-11`, `BG-13`, AR-20).
4. Regenerate this repo's dogfood artifacts: `.sdd/doctor/checks.json` (now carrying the
   two new members and the family-3 entries for `claude-code`) and
   `.sdd/doctor/run-doctor.mjs` (byte-identical to the template, `BG-11`).
5. Confirm the skill-library counts and the template file count are unchanged — this
   feature adds no skill and no template file, so `tests/packaging.test.ts`'s
   `EXPECTED_TEMPLATE_FILES` and every "ten skills / thirty templates" statement stay
   correct and need no edit. Verify rather than assume.

### Phase 4: Testing & Validation

**Goal**: Prove every guarantee that can be proven by test, and record honestly which
cannot.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Extend `tests/doctor.test.ts` (`src/doctor.ts` unit): the three entry kinds with
   their ids, `anyOf` sets and tiers (AR-6); per-generator derivation and dedup with
   `undefined` filtered (AR-8); `conventions-doc` untouched — same id, same position,
   no `tier` (AR-7); purity/byte-identity of the generated `checks.json` (AR-13); and a
   source-level assertion that `src/doctor.ts` contains no tool-id or instruction-file
   path literal (AR-8 / `SC7`).
2. Extend `tests/doctor-runner.test.ts` (real subprocess against fixture repos, the
   model that file already uses): a must-have miss exits `2` and prints `FAIL` (AR-3); a
   recommended miss exits `0` and prints `WARN` (AR-4); a pre-feature `checks.json` with
   no `repoReadiness` runs all four old families unchanged (AR-5 / `SC9`); an entry with
   an unrecognised `tier` is treated as must-have; the five families print in the fixed
   order (AR-1); the summary line carries four counts (AR-14); and a source-level
   assertion that the runner contains no new hard-coded literal (AR-11 / `SC8`).
3. Extend `tests/generators/*.test.ts` (or the shared registry test) so every generator
   asserts its declared `guidancePath` against the verified-facts table (AR-9 / `SC6`).
4. Add a no-write assertion for a red repo-readiness run — snapshot the fixture repo's
   file list before and after (AR-15 / `SC15`).
5. Assert byte-identity of the two edited `SKILL.md` files across `.agents/skills/` and
   `templates/skills/` in the existing skills-fidelity test (AR-20 / `SC13`).
6. Run `npx harny doctor` against this repository live and confirm exit `0` with zero
   new failures and zero new warnings (AR-22 / `SC10`). Record the actual report in
   `tasks.md` § Notes as the evidence, the way `readiness-doctor`'s Task 5.7 did.
7. Record explicitly in `audit.md` which criteria are verified by structure or by manual
   observation rather than by automated test, so the RD-R5 class of gap is disclosed
   rather than implied.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A repo green today goes red because it has no `README.md` | High | Medium | Intended behavior per `intent.md` § Constraints, not a regression. Announce it in `README.md` and `CHANGELOG.md` at documentation time; the remediation string is actionable and the fix is one file |
| A stale committed `.sdd/doctor/run-doctor.mjs` silently omits family 3 | Medium | Medium | `conventions-doc` deliberately stays in family 2, so the single most important must-have keeps being enforced by an old runner (AR-7); remediation documented in `templates/doctor/README.md` (Phase 1.1) |
| A per-tool `guidancePath` is wrong — a check pointed at a file the tool never reads | Medium | Low | Bounded by design: every such entry is `recommended` and every `anyOf` includes `AGENTS.md`, so a wrong path degrades to a redundant advisory entry, never a false red (`contract.md` § Verified per-tool facts). Inherits `AL-30`/`CG-1` as a carried reservation |
| The runner accretes a new hard-coded literal, repeating RD-R1 | Medium | Medium | Every new value travels in `DoctorChecksFile`; Phase 2.6 is an explicit review step and Phase 4.2 adds a source-level assertion |
| Scope creep toward the 28-item reference checklist | Medium | High | `intent.md` § Non-Goals enumerates exactly what is excluded; the family ships three entries and three coherence elements, and the auditor checks the count |
| `warn` is added to `emit` but a future check forgets a tier and silently blocks | Low | Medium | Absent tier means must-have — the conservative direction (AR-5); an unrecognised value is also must-have |
| Coherence assessment drifts into the runner as a keyword grep | Low | High | AR-17 forbids it explicitly; Phase 4.2's source-level assertion catches a grep introduced into the runner |
| `harny-doctor` auto-invokes `harny-document` and writes files unasked | Low | High | AR-18 plus a new guardrail line; "Never fix what it finds" is preserved verbatim as the anchor |
| Bootstrap mode becomes a way to bypass the post-audit gate | Low | High | AR-19 makes the two paths mutually unreachable and enumerates bootstrap mode's refusals |
| Editing `src/doctor.ts`'s `conventions-doc` entry to use a constant changes emitted bytes | Low | Medium | Phase 1.3 states the requirement; the existing determinism test compares generated output, and a byte change fails it |

## File Change Map

**Canonical templates (shipped to every scaffolded repo):**
- `templates/doctor/README.md` — MODIFY — five families, two tiers, the `warn` outcome,
  the presence/coherence division, the stale-runner note (Phase 1.1)
- `templates/doctor/run-doctor.mjs` — MODIFY — `warn` arm + `warnCount`, shared
  `evaluateEntry`, family 3 between manifest and spec state, four-count summary
  (Phase 2.3–2.5)
- `templates/skills/harny-doctor/SKILL.md` — MODIFY — parity copy of the edited skill
  (Phase 3.3)
- `templates/skills/harny-document/SKILL.md` — MODIFY — parity copy (Phase 3.3)

**Source:**
- `src/doctor.ts` — MODIFY — `CheckTier`, `DoctorCheck.tier`, the four new constants,
  `DoctorChecksFile.repoReadiness`/`repoReadinessLabel`, `buildRepoReadinessChecks`,
  and `conventions-doc` importing `AGENTS_GUIDANCE_PATH` (Phase 1.2–1.4, 2.1–2.2)
- `src/generators/types.ts` — MODIFY — `guidancePath` member on `Generator` (Phase 1.5)
- `src/generators/claude-code.ts` — MODIFY — `guidancePath = 'CLAUDE.md'` (Phase 1.6)
- `src/generators/cursor.ts` — MODIFY — `guidancePath = undefined` (Phase 1.6)
- `src/generators/kiro.ts` — MODIFY — `guidancePath = '.kiro/steering'` (Phase 1.6)
- `src/generators/github-copilot.ts` — MODIFY — `guidancePath =
  '.github/copilot-instructions.md'` (Phase 1.6)
- `src/generators/codex.ts` — MODIFY — `guidancePath = undefined` (Phase 1.6)

**Skills (canonical bodies; `.claude/skills/harny-*` are symlinks to these):**
- `.agents/skills/harny-doctor/SKILL.md` — MODIFY — coherence assessment, verdict rule,
  human-gated hand-off, new guardrail (Phase 3.1)
- `.agents/skills/harny-document/SKILL.md` — MODIFY — bootstrap mode (Phase 3.2)

**Dogfood artifacts (this repo's own scaffolded copies):**
- `.sdd/doctor/checks.json` — MODIFY — regenerated with the two new members and the
  family-3 entries (Phase 3.4)
- `.sdd/doctor/run-doctor.mjs` — MODIFY — byte-identical copy of the updated template
  (Phase 3.4)

**Tests:**
- `tests/doctor.test.ts` — MODIFY — family builder, derivation, `conventions-doc`
  invariance, purity, no-literal assertion (Phase 4.1)
- `tests/doctor-runner.test.ts` — MODIFY — tier outcomes, backward compatibility,
  family order, summary counts, no-write, no-literal assertion (Phase 4.2, 4.4)
- `tests/generators/claude-code.test.ts` — MODIFY — declared `guidancePath` (Phase 4.3)
- `tests/generators/cursor.test.ts` — MODIFY — declared `guidancePath` (Phase 4.3)
- `tests/generators/kiro.test.ts` — MODIFY — declared `guidancePath` (Phase 4.3)
- `tests/generators/github-copilot.test.ts` — MODIFY — declared `guidancePath`
  (Phase 4.3)
- `tests/generators/codex.test.ts` — MODIFY — declared `guidancePath` (Phase 4.3)
- `tests/skills-fidelity.test.ts` — MODIFY — byte-identity of the two edited skills
  (Phase 4.5)

**Specs (written by the pipeline, not by the executor):**
- `specs/ai-sdlc-readiness/audit.md` — MODIFY — filled in by the auditor
- `specs/ai-sdlc-readiness/tasks.md` — MODIFY — checked off by the executor

**No new files are created by this feature.** Every change is a modification to an
existing artifact, which is why the generated-file count, the template file count and
the skill count are all unchanged.
