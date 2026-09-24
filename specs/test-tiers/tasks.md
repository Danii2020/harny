# Tasks: Test Tiers

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

(Every task cites its roadmap phase. The tasks under "Red phase" belong to the
test-writer and are traced to the roadmap phase whose guarantees they verify. Contract
ids are in parentheses.)

## Red phase (test-writer, before Phase 1): verifies Phases 1–4
- [ ] Task R.1 (Phase 1, 4): Per-tool placement. For each of the five tools alone,
  `init` writes `harny-test/SKILL.md` and `harny-test/high-value-tests.md` under that
  tool's `skillsDir`, byte-equal to `templates/`. The expected set explicitly names
  `high-value-tests.md` so it cannot pass vacuously (TT-1) — `tests/skills-placement.test.ts`
- [ ] Task R.2 (Phase 2, 3): Reference resolution on a real five-tool `--skills all`
  install. Every "`` `<name>` skill ``" reference resolves to `SKILL_IDS` or
  `sdd-conductor`. Every lowercase bundled `.md` reference in a `SKILL.md` (excluding
  the five spec-file names) exists beside it (TT-4) — `tests/skill-references.test.ts`
- [ ] Task R.3 (Phase 2, 3): Rubric citations. Every `` `high-value-tests.md` § "<H>" ``
  citation in the skill and the role names an H2 of the rubric, and each file cites at
  least "The one question" and "Picking the right tier" (TT-5). The role no longer
  contains "vendors a dedicated rubric" (TT-5) — `tests/test-writer-templates.test.ts`
- [ ] Task R.4 (Phase 2, 3): Protocol coupling. `TEST PLAN AWAITING CONFIRMATION` and
  `**Plan status**:` followed by each of `PROPOSED`, `CONFIRMED` and `NOT REQUIRED`
  appear in the skill, the role and the conductor (TT-17) —
  `tests/test-writer-templates.test.ts`
- [ ] Task R.5 (Phase 3): Three gates hold. The conductor's pipeline diagram contains
  exactly three `[HUMAN GATE` entries, and `documentation follows automatically`,
  `auditor → documentation` and `confirms the archive landed` remain present (TT-16) —
  `tests/test-writer-templates.test.ts`
- [ ] Task R.6 (Phase 1): Rubric structure. One H1, then exactly the five pinned H2
  headings in order, and no leading `---` frontmatter (TT-2, TT-3) —
  `tests/test-writer-templates.test.ts`
- [ ] Task R.7 (Phase 1): Neutrality. A `NEUTRALITY_CHECKS` entry for
  `harny-test/high-value-tests.md` with the TT-3 residue list (TT-3) —
  `tests/skills-templates.test.ts`
- [ ] Task R.8 (Phase 2): Declared divergence. Change
  `DIVERGENCE_TABLE['harny-test']` to `diverges` with the TT-22 needles, and update the
  file's header docblock (TT-22) — `tests/skills-fidelity.test.ts`
- [ ] Task R.9 (Phase 4): Counts. `defaultSkillLibraryPaths` gains
  `harny-test/high-value-tests.md`. Change 38→39 (×5), 92→95 / 33→36, 98→101 / 39→42,
  and 89→92 / 30→33, with an explanatory comment (TT-23) — `tests/e2e-init.test.ts`
- [ ] Task R.10 (Phase 4): Packaging manifest. Add
  `templates/skills/harny-test/high-value-tests.md` and change the count to 32
  (TT-23) — `tests/packaging.test.ts`
- [ ] Task R.11 (Phase 3): T41 allowlist. Add `templates/roles/sdd-test-writer.md` by
  exact match (TT-24) — `tests/canonical-fidelity.test.ts`
- [ ] Task R.12 (Phase 4): Run the suite. Confirm each new or changed assertion fails
  for the right reason (the rubric is missing, the dangling reference is still present,
  tokens are absent, or counts are off by one per root), and that the golden test still
  passes at red time. Update `audit.md` Test Coverage — `specs/test-tiers/audit.md`

## Phase 1: The shipped rubric
- [ ] Task 1.1: Create the generalized rubric: one H1, the principle, and five pinned
  H2 sections with the TT-2 content. No residue, frontmatter or `'''`. Exactly one
  trailing `\n` (TT-1, TT-2, TT-3) — `templates/skills/harny-test/high-value-tests.md`
- [ ] Task 1.2: Correct "for two of them, one bundled resource file" to three —
  `templates/skills/README.md`

## Phase 2: The `harny-test` skill
- [ ] Task 2.1: Frontmatter. Update `description`, `compatibility`, `metadata.version`
  "2.0" and `metadata.harny-writes`, and leave `allowed-tools` byte-unchanged (TT-19) —
  `templates/skills/harny-test/SKILL.md`
- [ ] Task 2.2: `## Inputs`. Add the bundled rubric and the relayed human decision
  (TT-11, TT-19) — `templates/skills/harny-test/SKILL.md`
- [ ] Task 2.3: `## Steps`. Cover the rubric citation, tier and framework inference
  with evidence, the Test Plan record, the confirmation rule, stop or ask, setup scope,
  writing the tests, audit tracking, and per-tier verification. Replace both superseded
  instructions (TT-5 to TT-14) — `templates/skills/harny-test/SKILL.md`
- [ ] Task 2.4: `## Guardrails`. Re-point "the one question", and add the TT-9, TT-10
  and TT-11 hard rules with the exact TT-17 literals —
  `templates/skills/harny-test/SKILL.md`

## Phase 3: Role and conductor
- [ ] Task 3.1: Role metadata. Extend `invocation` and `handoff`, leaving the other
  keys byte-unchanged (TT-20) — `templates/roles/sdd-test-writer.md`
- [ ] Task 3.2: Role body. Remove the vendoring conditional, cite the rubric, and
  mirror the skill's flow and literals, keeping the AL-5 pointer block (TT-5, TT-6 to
  TT-14, TT-17, TT-20) — `templates/roles/sdd-test-writer.md`
- [ ] Task 3.3: Conductor. Add the diagram checkpoint line, the extended summary
  sentence, hard rule #6, the pause-list entry ("not a gate"), the flow entry, the
  verify step, and the per-tier gate summary (TT-15 to TT-18) —
  `templates/conductor/sdd-conductor.md`

## Phase 4: Shipping verification and fixtures
- [ ] Task 4.1: Build and typecheck — `package.json` scripts (no edit)
- [ ] Task 4.2: Regenerate exactly five golden paths per tree from the built CLI, and
  confirm 8 modified and 2 new files under `tests/fixtures/golden` (TT-24) —
  `tests/fixtures/golden/monorepo-mode/ts-root/.claude/**`,
  `tests/fixtures/golden/monorepo-mode/py-sub/apps/api/.claude/**`
- [ ] Task 4.3: Add the docblock paragraph recording the sanctioned regeneration
  (TT-24) — `tests/e2e-init.test.ts`
- [ ] Task 4.4: Run the full suite green. Confirm no change under `src/`, `bin/`,
  `package.json`, `.agents/` or `.claude/` (TT-21, TT-22) — repository root

## Phase 5: Manual demo walkthrough (deadline 2026-09-26)
- [ ] Task 5.1: Scaffold the frontend+API sample repository with the built CLI (TT-25)
  — scratch directory outside the repository
- [ ] Task 5.2: M1, delegated flow with the checkpoint (TT-9, TT-10, TT-11, TT-12,
  TT-15, TT-18) — `specs/test-tiers/audit.md` row M1
- [ ] Task 5.3: M2, a unit-only feature proceeds without a pause (TT-9) —
  `specs/test-tiers/audit.md` row M2
- [ ] Task 5.4: M3, direct invocation asks inline and waits (TT-10) —
  `specs/test-tiers/audit.md` row M3
- [ ] Task 5.5: M4, nothing installed before confirmation, and a declined tier is
  dropped (TT-11, TT-12) — `specs/test-tiers/audit.md` row M4

## Blocked Items
[None yet]

## Notes
- **Do not touch** `.agents/skills/harny-test/`, `.agents/skills/README.md`,
  `.claude/skills/high-value-tests/`, `.claude/skills/sdd-conductor/` or
  `.claude/agents/` (intent § Non-Goals). The dogfood rubric is read-only input for
  Task 1.1.
- **No `src/` change is expected.** If one seems necessary, stop and report it. It
  would contradict TT-21 and needs a contract amendment.
- The golden test is expected to pass at red time and to fail after Phases 1–3, until
  Task 4.2 regenerates the goldens. That is the designed sequence, not a regression.
- Four other feature branches (`commit-checks`, `component-level-docs`,
  `doctor-security-checks`, `permissions-baseline`) are approved but not archived. If
  the base moves, recompute TT-23's counts as +1 per skill root relative to the new
  base.
- The new test files follow S6. Each opens with a `Spec: specs/test-tiers` /
  `Covers: …` header, and no contract id appears in a test name.
