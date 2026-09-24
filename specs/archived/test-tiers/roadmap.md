# Roadmap: Test Tiers

> Default TDD flow. After the post-specs gate, the test-writer writes the red-phase
> tests in `tests/` (the new guards plus the count, manifest, allowlist and
> divergence-table maintenance that can be stated before implementation). The executor
> then runs Phases 1–4 (including 3b, the auditor) against them. Phase 5 is a manual walkthrough and cannot be
> automated (contract TT-25). Nothing under `src/`, `bin/`, `package.json`, `.agents/`
> or `.claude/` changes in any phase (TT-21, TT-22).

## Implementation Phases

### Phase 1: The shipped rubric
**Goal**: Ship the high-value-tests rubric as a bundled `harny-test` resource that lands
in every tool's skill root (TT-1, TT-2, TT-3).
**Dependencies**: None
**Estimated complexity**: Low

1. Create `templates/skills/harny-test/high-value-tests.md`. Include one H1, the
   principle paragraph, and the five H2 sections with the exact headings pinned in
   contract § Data Models. Include the content items listed in TT-2. Generalize from the
   human's prompt and from the reference copy `.claude/skills/high-value-tests/SKILL.md`
   (read-only). Drop every domain specific listed in TT-3. Keep frameworks and tools
   only as "e.g." examples. Add no YAML frontmatter. End the file with exactly one
   `\n`. Do not use `'''`.
2. In `templates/skills/README.md`, correct the factual sentence "for two of them, one
   bundled resource file" to three (`harny-sync`, `harny-adr`, `harny-test`), and add
   `high-value-tests.md` to rule 6's example if an example list is extended. Change
   nothing else. Keep the `DIVERGENCE_TABLE['README.md']` forbidden needle absent.

### Phase 2: The `harny-test` skill
**Goal**: Rewrite `templates/skills/harny-test/SKILL.md` so it proposes tiers, records
the Test Plan, confirms under the exact rule, and cites the shipped rubric (TT-4 to
TT-14, TT-17, TT-19).
**Dependencies**: Phase 1 (the citations must resolve to the rubric's headings)
**Estimated complexity**: Medium

1. Frontmatter (TT-19): extend `description` (≤ 1,024 characters) to mention tier
   proposal and confirmation. Replace the `high-value-tests` skill mention in
   `compatibility` (≤ 500 characters) with the bundled `high-value-tests.md`. Set
   `metadata.version: "1.1"` and the new `metadata.harny-writes`. Leave the
   `allowed-tools` line byte-unchanged.
2. `## Inputs`: add `high-value-tests.md` (bundled, loaded on demand) and the human's
   decision relayed on re-invocation (TT-11).
3. `## Steps`: restructure into this order: read specs, learn conventions and apply the
   rubric (cite `` `high-value-tests.md` § "The one question" ``), infer tiers and
   frameworks with evidence (TT-6, TT-7; cite § "Picking the right tier"), record the
   Test Plan (TT-8), decide on confirmation (TT-9) and stop or ask (TT-10, TT-11), do
   the confirmed setup (TT-12), write the tests (TT-13), update audit tracking, and
   verify per tier (TT-14). Replace "Run the `high-value-tests` skill first" and
   "every success criterion gets at least one integration test".
4. `## Guardrails`: re-point "the one question" guardrail to the bundled rubric. Add
   the TT-9, TT-10 and TT-11 hard rules. Use the TT-17 literals exactly.
5. Check S7 by reading: behavior first, tools and frameworks only as attributed
   examples.

### Phase 3: Role and conductor
**Goal**: Make `templates/roles/sdd-test-writer.md` agree with the skill, and teach
`templates/conductor/sdd-conductor.md` the conditional checkpoint without adding a gate
(TT-5, TT-15 to TT-18, TT-20).
**Dependencies**: Phase 2 (the role mirrors the skill's flow and literals)
**Estimated complexity**: Medium

1. Role metadata: extend `invocation` and `handoff` to mention the conditional tier
   checkpoint before red tests. Leave `id`, `purpose`, `cost_tier`, `cost_rationale`
   and `capabilities` byte-unchanged.
2. Role body: remove the "If this repo or the target tool vendors a dedicated rubric…"
   sentence. Keep a one-paragraph restatement of "the one question". Cite the rubric as
   bundled with the `harny-test` skill in the TT-5 form. Add the steps from Phase 2
   (tier inference, Test Plan, confirmation rule, stop behavior, setup scope, per-tier
   verification) using the TT-17 literals. Keep the AL-5 spec-schema pointer block.
   Add no "never commit or push" rule.
3. Conductor: update the pipeline diagram with the conditional checkpoint line inside
   the test-writer stage, with no `HUMAN GATE` label. Extend the summary sentence
   (TT-16). Add hard rule #6 (TT-15), leaving #1–#5 untouched. Under "PAUSE for the
   human at", add the checkpoint as an instance of the existing "decision only the
   human can make" pause, explicitly labelled "not a gate". Under "FLOW
   automatically", add "test plan → red tests when the plan status is `NOT REQUIRED`".
   In "Verify, don't trust", add the Test Plan status check. At the test-review gate,
   add the per-tier summary (TT-18). Name `AskUserQuestion` only as the existing
   attributed example.
4. Confirm by reading: the three `[HUMAN GATE` entries are unchanged, and
   `documentation follows automatically`, `auditor → documentation` and
   `confirms the archive landed` are still present.

### Phase 3b: The auditor takes tiers into account (added at the post-specs gate, 2026-09-24)
**Goal**: Teach the shipped auditor to read the Test Plan, record `### Tier Results`,
and raise the TT-28 findings in its existing severity buckets (TT-26 to TT-29, G7).
**Dependencies**: Phase 2 (the auditor checks the plan format and the literals the
skill defines)
**Estimated complexity**: Medium

1. `templates/skills/harny-audit/SKILL.md`:
   - Add a tier-audit step between the existing test coverage step and the
     `harny-standards` step (TT-26, TT-27).
   - In the report step, add `### Tier Results` in the pinned shape and location.
   - In the severity guardrail, keep the four bucket definitions verbatim and add the
     TT-28 table.
   - Use the TT-17 literals.
   - Set `metadata.version: "1.1"`. `description` may gain a short mention of tier
     checks (≤ 1,024 characters). Leave `allowed-tools` and `harny-writes`
     byte-unchanged.
   - Don't write `S1–S7` or `seven standards (S1`.
2. `templates/roles/sdd-auditor.md`: make the same additions in the body only (Step 6
   tier audit, Step 7 Tier Results, § Severity Ratings TT-28 table), with the TT-28
   rows worded identically to the skill. Leave Role Metadata byte-unchanged.
3. Confirm by reading: the TT-28 conditions and levels are identical in both files,
   and the tier checks never direct the auditor to write outside `audit.md` (AL-7
   scope).

### Phase 4: Shipping verification and fixtures
**Goal**: Make the full suite green, with only the contracted count, manifest and golden
changes (TT-21 to TT-24).
**Dependencies**: Phase 3, Phase 3b
**Estimated complexity**: Low

1. `npm run build` and `npm run typecheck`.
2. Regenerate exactly the seven contracted golden files per tree (TT-24). Scaffold both
   golden scenarios with the built CLI (`node bin/harness.js init …`) into scratch
   `git init` directories. Copy only the seven paths into
   `tests/fixtures/golden/monorepo-mode/ts-root/` and
   `tests/fixtures/golden/monorepo-mode/py-sub/apps/api/`. Then confirm with
   `git status --short tests/fixtures/golden` that exactly 12 modified files and 2 new
   files appear. Add one paragraph to the golden block's docblock in
   `tests/e2e-init.test.ts` recording this regeneration and why it is sanctioned.
3. Run `npx vitest run`. Every test passes, including the red tests from the
   test-writer. The baseline before this feature is 44 files and 932 tests, all
   passing.
4. Check by hand that `git status` shows no change under `src/`, `bin/`,
   `package.json`, `.agents/` or `.claude/`.

### Phase 5: Manual demo walkthrough on Claude Code (workshop rehearsal)
**Goal**: Verify the prompt-level runtime behavior that automated tests cannot verify,
and rehearse the 2026-09-27 workshop demo (TT-25, intent G6, SC10). **Target: Claude
Code** (the human's priority, answer to Q4). The other four tools receive the same
content through the generators, which Phase 4 tests (TT-30). Their runtime behavior is
not walked through, and that gap is reservation TT-R2.
**Dependencies**: Phase 4 (walkthroughs use the built CLI from this branch)
**Estimated complexity**: Medium
**Deadline**: Saturday 2026-09-26

1. **Sample repo**: in a scratch directory outside this repository, create a small
   two-component app: a web frontend (for example a React/Vite app in `apps/web` with
   its existing unit-test setup) and an HTTP API (for example a Node service in
   `apps/api` with a unit-test runner and one route backed by a module boundary). Leave
   no e2e framework installed. `git init` it, then run
   `node <harny>/bin/harness.js init <sample> --yes --tools claude-code --component apps/web=typescript --component apps/api=typescript`.
   Run every walkthrough in a Claude Code session opened on the sample.
2. **M1, delegated flow**: through the conductor, specify a small feature that touches a
   UI interaction and an API route (for example "mark a todo done from the list"). At
   the post-specs gate, approve. Observe the following in order. The test-writer
   records a Test Plan with `unit`, `integration` and `e2e`, frameworks with evidence
   paths, and e2e "Setup needed" naming an exact dev dependency and config file. Its
   report begins `TEST PLAN AWAITING CONFIRMATION`. No test file or manifest change
   exists yet (`git status`). The conductor presents the plan and waits. Confirm with
   one edit. The same test-writer resumes, applies the edit, sets `CONFIRMED`, performs
   exactly the named setup, and writes the tests. The post-red-tests gate shows
   per-tier red status.
3. **M2, unit-only**: specify a pure-logic feature (for example a formatting helper).
   Observe `**Plan status**: NOT REQUIRED (unit-only, no setup)`, no marker, no
   checkpoint pause, and tests written in one invocation.
4. **M3, direct invocation**: invoke `harny-test` directly, with no conductor, on the
   M1 spec. Observe the inline proposal, the question, and the wait. Answer, then
   observe it proceed in the same conversation.
5. **M4, missing framework and no install before yes**: in M1 or M3, before
   confirming, verify that the manifest and lockfile are byte-unchanged. Reject the e2e
   tier. Observe that nothing is installed and the plan becomes unit plus integration,
   `CONFIRMED`.
6. **M5, tier-aware audit**: continue M1 through the executor to the auditor. Before
   the auditor runs, seed one deviation in a copy of the sample: an extra e2e test
   under a plan set back to `PROPOSED`, or an unnamed dev dependency. Observe
   `### Tier Results` in the pinned shape, a per-tier status, and the seeded deviation
   reported as HIGH per TT-28.
7. Record each walkthrough's outcome (date, tool = Claude Code, pass/fail, deviations,
   transcript or screenshot path) in `audit.md` rows M1–M5.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A delegated agent ignores the stop instruction and writes e2e tests or installs a framework anyway | Med | High | TT-9, TT-10 and TT-11 stated as `## Guardrails` hard rules. Conductor verifies `PROPOSED` on disk (TT-15). M1/M4 walkthroughs. Residual risk carried as TT-R1 |
| The checkpoint is read as a fourth gate, contradicting PR-6 and AGENTS.md | Med | Med | TT-16 wording rules plus an automated gate-count guard. Framed as an instance of the existing "decision only the human can make" pause |
| Conductor and role drift on the marker or status literals | Low | High | TT-17 coupling test across all three files |
| Rubric shipped as a verbatim copy of the dogfood file, leaking domain residue | Med | Med | TT-3 `NEUTRALITY_CHECKS` entry. Phase 1 step 1 forbids copying |
| Golden regeneration sweeps in unrelated drift | Low | Med | TT-24: copy only seven paths per tree. The existing path-set and byte comparison catches any other change |
| Another in-flight branch (`commit-checks`, `component-level-docs`, `doctor-security-checks`, `permissions-baseline`, all approved but not archived) also edits the e2e counts or goldens | Med | Low | Rebase before Phase 4. Counts are +1 per root, relative to whatever the base is. Recompute rather than hard-merge |
| Vendor limit exceeded (Copilot 30k role body, Kiro/Copilot 1,024-character description, Codex `'''`) | Low | Med | Current sizes are 7.2k (role), 8.1k (conductor) and 557 characters (description). Existing TG-7 checks fail loudly in e2e |
| Behavior differs across the five tools (for example, a tool whose sub-agents cannot be resumed) | Med | Med | TT-15 falls back to a fresh invocation with context. TT-30 proves the content reaches all five. Only Claude Code is walked through (the human's decision on Q4), and the other four are the named reservation TT-R2, alongside AL-30 and CG-1 |
| Auditor over- or under-rates tier findings, or the skill and role drift apart on levels | Med | Med | TT-28 is a single pinned table, with a parity test between the skill and role copies. M5 seeds a deviation |
| Auditor tier checks push it to write outside `audit.md` (AL-7 scope) | Low | Med | TT-26 states that the scope is `audit.md` only. Phase 3b step 3 check |
| Workshop date slips the walkthrough | Low | High | Phase 5 deadline of 2026-09-26, one day of slack |

## File Change Map
- `templates/skills/harny-test/high-value-tests.md` — CREATE — the shipped, generalized rubric (TT-1 to TT-3)
- `templates/skills/harny-test/SKILL.md` — MODIFY — tier proposal, Test Plan, confirmation rule, rubric citations, frontmatter (TT-4 to TT-14, TT-17, TT-19)
- `templates/roles/sdd-test-writer.md` — MODIFY — metadata `invocation`/`handoff`; body mirrors the skill; conditional removed (TT-5, TT-20)
- `templates/conductor/sdd-conductor.md` — MODIFY — conditional checkpoint, hard rule #6, verify step, per-tier gate summary; three gates intact (TT-15 to TT-18)
- `templates/skills/harny-audit/SKILL.md` — MODIFY — tier audit step, Tier Results, TT-28 severity table, version "1.1" (TT-17, TT-26 to TT-29)
- `templates/roles/sdd-auditor.md` — MODIFY — body only: Step 6 tier audit, Step 7 Tier Results, TT-28 table (TT-17, TT-26 to TT-29)
- `templates/skills/README.md` — MODIFY — "two of them" → three bundled-resource skills
- `tests/skill-references.test.ts` — CREATE — TT-4 on a real five-tool install
- `tests/test-writer-templates.test.ts` — CREATE — TT-5 citations, TT-17 coupling across five files, TT-16 gate count and preserved strings, TT-2 rubric section structure, TT-28 skill↔role severity parity
- `tests/skills-placement.test.ts` — MODIFY — per-tool placement of every `harny-test` file (TT-1)
- `tests/skills-fidelity.test.ts` — MODIFY — `DIVERGENCE_TABLE['harny-test']` and `['harny-audit']` (TT-22)
- `tests/skills-templates.test.ts` — MODIFY — `NEUTRALITY_CHECKS` entry for the rubric (TT-3)
- `tests/e2e-init.test.ts` — MODIFY — counts, `defaultSkillLibraryPaths`, golden docblock (TT-23, TT-24)
- `tests/packaging.test.ts` — MODIFY — manifest entry, 31 → 32 (TT-23)
- `tests/canonical-fidelity.test.ts` — MODIFY — T41 allowlist entries `templates/roles/sdd-test-writer.md` and `templates/roles/sdd-auditor.md` (TT-24); protocol tokens in all five generators' test-writer, auditor and conductor artifacts (TT-30)
- `tests/fixtures/golden/monorepo-mode/ts-root/.claude/skills/harny-test/high-value-tests.md` — CREATE (regenerated)
- `tests/fixtures/golden/monorepo-mode/ts-root/.claude/{skills/harny-test/SKILL.md,agents/sdd-test-writer.md,skills/sdd-conductor/SKILL.md,skills/README.md,skills/harny-audit/SKILL.md,agents/sdd-auditor.md}` — MODIFY (regenerated)
- `tests/fixtures/golden/monorepo-mode/py-sub/apps/api/.claude/skills/harny-test/high-value-tests.md` — CREATE (regenerated)
- `tests/fixtures/golden/monorepo-mode/py-sub/apps/api/.claude/{skills/harny-test/SKILL.md,agents/sdd-test-writer.md,skills/sdd-conductor/SKILL.md,skills/README.md,skills/harny-audit/SKILL.md,agents/sdd-auditor.md}` — MODIFY (regenerated)
- `specs/test-tiers/audit.md`, `specs/test-tiers/tasks.md` — MODIFY — tracking, including M1–M5 results
- *(post-audit, `sdd-documentation` role, not the executor)* `README.md`, `CHANGELOG.md`, `AGENTS.md` (the `templates/skills/harny-test/` tree entry) — MODIFY
