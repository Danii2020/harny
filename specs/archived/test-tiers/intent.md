# Intent: Test Tiers

**Shipped: 2026-09-24**

## Problem Statement

harny ships a test-writer (`templates/roles/sdd-test-writer.md`, the `harny-test` skill
under `templates/skills/harny-test/`, and the conductor that sequences it,
`templates/conductor/sdd-conductor.md`) to five coding-agent tools: Claude Code, Cursor,
Kiro, GitHub Copilot and Codex. That shipped test-writer has two gaps.

1. **It only thinks in one tier.** Nothing in the shipped role or skill tells the test
   writer to consider integration or end-to-end tests, or to pick a framework per tier.
   The step "every success criterion gets at least one integration test" exists, but
   the role gives no guidance on *when* a real integration or e2e test is suitable,
   which framework to use, or how to set one up. In practice this means one of two
   things. The test writer writes unit tests with mocked boundaries for a feature
   whose risk sits at a real boundary (a database, an HTTP API, a queue, a browser
   flow). Or it quietly installs a new test framework (a browser e2e runner, for
   example) without asking anyone. Downstream users of a frontend app or a
   service-integrating backend get tests at the wrong level, or dependencies they never
   agreed to.

2. **It points to a rubric that harny never ships.** `templates/skills/harny-test/SKILL.md`
   says "Run the `high-value-tests` skill first" (Steps, item 2) and "Never write a test
   that fails 'the one question' in the `high-value-tests` skill" (Guardrails). Its
   `compatibility` field also asks for "a `high-value-tests` skill in the same skill set".
   No `high-value-tests` skill is in `SKILL_IDS`, `templates/skills/` or any generated
   install. It exists only in this repository's own dogfood tree
   (`.claude/skills/high-value-tests/SKILL.md`). So every downstream install carries a
   dangling reference. `templates/roles/sdd-test-writer.md` works around the gap with
   "If this repo or the target tool vendors a dedicated rubric skill/rule file for this
   (a `high-value-tests` reference), consult it". As a result the role and the skill
   disagree about where the rubric lives, and in practice it lives nowhere.

3. **The shipped auditor is blind to test tiers.** `harny-audit` and `sdd-auditor.md`
   check that every guarantee has "at least one test". They cannot tell whether
   integration or e2e tests were agreed by a human, whether a planned tier was ever
   written, or whether the test-writer installed setup no one confirmed. The human
   brought this into scope at the post-specs gate (2026-09-24).

Affected people: every downstream team that runs `npx harny init` and then the SDD
pipeline. Their test-writer either loses its test-value rubric silently or looks for a
file that does not exist. It also has no principled way to choose integration or e2e
tests. The human who owns harny plans to demonstrate the pipeline at a workshop on
**Sunday 2026-09-27**. This feature is the test-writer behavior they want to show.

## Goals

1. **G1 — Tests at the right tier.** The shipped test-writer proposes unit,
   integration and/or e2e tests, each only where the nature of the feature makes that
   tier suitable. Examples: UI interactions in a frontend app get e2e, a real boundary
   to another service or module gets integration, and pure logic gets unit only. Every
   tier in the proposal is justified by the spec items it covers.
2. **G2 — Frameworks inferred from evidence, never hard-coded.** For each proposed
   tier, the test-writer infers the framework from the project's own stack and existing
   setup (manifests, config files, existing tests, a conventions doc) and cites that
   evidence. Framework names appear only as attributed examples in shipped prompt
   content. No fixed detection table lives in `src/`.
3. **G3 — Propose, then confirm, then write.** The test-writer first records a test-plan
   proposal and writes no integration or e2e test and installs nothing until a human
   confirms it. The confirmation goes through the orchestrator when the test-writer runs
   as a delegated sub-agent (which cannot pause mid-run to ask). It happens inline in
   the conversation when a human invokes `harny-test` directly. A plan that is unit-only
   **and** needs no setup skips the confirmation and proceeds directly. A plan that
   needs any setup (a dev dependency, a config file or a script) always asks, **even if
   it is unit-only**. The human confirmed this at the post-specs gate on 2026-09-24
   (answer to Q1).
4. **G4 — Ship the rubric, close the dangling reference.** The high-value-tests rubric
   ships as a bundled resource of the `harny-test` skill
   (`templates/skills/harny-test/high-value-tests.md`, the same mechanism as
   `harny-sync`'s `capability-template.md` and `harny-adr`'s `adr-template.md`). It
   reaches every skill root of all five generated tools. The skill and the role both
   cite it, and no shipped file references a skill harny does not ship.
5. **G5 — One coherent story across role, skill and conductor, with the three-gate
   model intact.** The role and skill agree on every rule. The conductor knows about
   the confirmation checkpoint. The pipeline still has exactly three human gates, and
   the checkpoint is not a fourth one.
6. **G6 — Demonstrable by the workshop.** Before 2026-09-27, the propose-then-confirm
   flow has been walked through end-to-end **on Claude Code** (the human's priority,
   decided at the post-specs gate on 2026-09-24) on a scaffolded sample repository with
   a frontend and an API, and the result is recorded. The feature is still *delivered*
   to all five tools through the generators, and that delivery is tested automatically.
   Only the manual runtime walkthrough is limited to Claude Code.
7. **G7 — The auditor takes test tiers into account.** *(Added at the post-specs gate,
   2026-09-24, answer to Q2.)* The shipped auditor (`templates/skills/harny-audit/SKILL.md`
   and `templates/roles/sdd-auditor.md`) reads the Test Plan, verifies that every tier
   of a `CONFIRMED` (or `NOT REQUIRED` unit-only) plan has tests covering the spec items
   listed for it, and flags the following: integration/e2e tests written without a
   `CONFIRMED` plan, planned tiers with no tests, setup the plan did not name, and a
   plan left at `PROPOSED`. Each finding goes into `harny-audit`'s existing
   CRITICAL/HIGH/MEDIUM/LOW buckets, and per-tier results are recorded in a fixed place
   in `audit.md`.

## Success Criteria

- [ ] **SC1** — A fresh `init` with all five tools writes
  `harny-test/high-value-tests.md` beside `harny-test/SKILL.md` under every distinct
  skill root (`.claude/skills/`, `.kiro/skills/`, `.agents/skills/`), and each copy is
  byte-identical to `templates/skills/harny-test/high-value-tests.md`. A single-tool
  install of each of the five tools writes it under that tool's own root. (G4)
- [ ] **SC2** — In a generated install, every "`<name>` skill" reference in a shipped
  skill, role or conductor names a skill harny ships. Every bundled-resource reference
  in a shipped `SKILL.md` resolves to a file beside it in the same install. The
  `harny-test` reference to an unshipped `high-value-tests` skill is gone. (G4)
- [ ] **SC3** — The shipped rubric carries the generalized content the human specified:
  the principle, "the one question", the six don'ts, the five dos, tier selection
  (including e2e), and the SDD-workflow rule. It carries none of the dogfood copy's
  domain specifics (see contract TT-3). (G4)
- [ ] **SC4** — `harny-test/SKILL.md` and `sdd-test-writer.md` both cite the rubric by
  bare file name and section. Every cited section exists in the rubric. The role no
  longer has the "if this repo vendors a … reference" conditional. (G4, G5)
- [ ] **SC5** — The shipped skill and role both instruct the test-writer to produce a
  Test Plan (tiers, framework per tier with evidence, setup needed, rationale tied to
  spec ids, and coverage) and record it in `audit.md` § Test Coverage. They define the
  exact rule for when confirmation is required and the exact stop behavior. (G1, G2,
  G3)
- [ ] **SC6** — The awaiting-confirmation marker and the three plan-status values are
  byte-identical across the test-writer skill and role, the conductor, and the auditor
  skill and role, so the orchestrator can
  recognize a plan that is waiting for confirmation. (G3, G5, G7)
- [ ] **SC7** — The shipped conductor still names exactly three human gates. It
  describes the tier-confirmation checkpoint as conditional, inside the test-writer
  stage, and not a gate. It keeps hard rules #1–#5 with their numbers. (G5)
- [ ] **SC8** — All five generators render the modified role and conductor without
  error, and no file under `src/` changes. Vendor limits (Copilot's 30,000-character
  role body, Codex's TOML literal rules, the 1,024-character skill description) are
  respected. (G4, G5)
- [ ] **SC9** — The whole test suite passes. The contracted file counts, the packaging
  manifest and the two `monorepo-mode` goldens are updated. Only the contracted golden
  files change. (G4)
- [ ] **SC10** — Manual walkthroughs M1–M5 (audit.md) are performed **on Claude Code**
  and recorded before 2026-09-27: the delegated flow on a frontend+API sample, a
  unit-only feature that proceeds without a pause, a direct invocation that asks
  inline, a missing-framework proposal that installs nothing before confirmation, and
  an audit that reports tier results and flags a seeded unconfirmed e2e test. (G1, G2,
  G3, G6, G7)
- [ ] **SC11** — The shipped `harny-audit` skill and `sdd-auditor` role both instruct
  the auditor to read the Test Plan and record a `### Tier Results` table in
  `audit.md` § Test Coverage. They name the same five tier findings with the same
  severities, and use the TT-17 marker and status values identically. `harny-audit`
  keeps its shape contract and `allowed-tools`, and goes to `metadata.version` "1.1".
  (G7)
- [ ] **SC12** — For each of the five generators, the rendered `sdd-test-writer`
  and `sdd-auditor` role artifacts and the conductor artifact carry the TT-17
  protocol tokens. Every tool's install carries the updated `harny-test` and
  `harny-audit` skills. (G4, G5, G7)

## Non-Goals

- **Modifying the dogfood copies.** `.agents/skills/harny-test/`,
  `.agents/skills/harny-audit/`, `.agents/skills/README.md`,
  `.claude/skills/high-value-tests/`, `.claude/skills/sdd-conductor/` and
  `.claude/agents/` are not touched. The shipped
  `templates/skills/harny-test/SKILL.md` and the dogfood
  `.agents/skills/harny-test/SKILL.md` are identical today and diverge on purpose. The
  divergence is recorded in `tests/skills-fidelity.test.ts`'s `DIVERGENCE_TABLE`, which
  is the existing mechanism for exactly this (ADR 0012). This repository's own pipeline
  keeps running the dogfood test-writer, so it does not itself produce a Test Plan
  while building this feature.
- **Changing the spec schema.** `templates/spec-schema/audit.md` is not changed. The
  Test Plan is a subsection that the test-writer adds inside the existing
  `## Test Coverage` section, which it already owns.
- **Changing the auditor's verdict model.** The shipped auditor gains tier checks (G7),
  but its severity buckets, their meanings and the verdict enum
  (`APPROVED` / `APPROVED WITH RESERVATIONS` / `REJECTED`) are unchanged. Only the
  spec-schema `audit.md` template stays untouched; the `### Tier Results` table is
  added by the auditor inside the existing `## Test Coverage` section.
- **Listing `high-value-tests.md` in the readiness check.** The human confirmed this
  (Q3, 2026-09-24): the doctor's harness-file manifest keeps checking only `SKILL.md`
  per skill, as it already does for `capability-template.md`.
- **A fourth human gate.** The gate count and order stay fixed (pipeline-roles PR-6,
  invariant 2).
- **Any `src/` change.** That means no new CLI flag, no new `SKILL_IDS` entry, no
  framework-detection table in code, no generator change and no change to the readiness
  (doctor) harness-file manifest, which checks only `SKILL.md` per skill, the same as
  for `capability-template.md` today.
- **New dependencies** (S4), and running any e2e framework in harny's own CI.
- **Closing the `ask-human-token` reservation** (pipeline-roles). The role's
  `capabilities` stay `read-files, write-files, run-shell, docs-lookup`. The lack of an
  ask-the-human capability is the reason the checkpoint goes through the orchestrator.
- **Verifying runtime agent behavior mechanically.** Tier inference and
  propose-then-confirm are prompt instructions, so automated tests cannot prove an
  agent follows them (see Constraints).
- **Updating `README.md`, `CHANGELOG.md` and `AGENTS.md`.** That is the documentation
  role's post-audit job (PR-5), not implementation scope.

## Constraints

- **Delivery layer only**: `templates/skills/harny-test/`, `templates/roles/sdd-test-writer.md`,
  `templates/conductor/sdd-conductor.md`, `templates/skills/harny-audit/SKILL.md` and
  `templates/roles/sdd-auditor.md` (added at the post-specs gate for G7),
  `templates/skills/README.md` (one factual sentence), plus the `tests/**` and
  `tests/fixtures/golden/**` changes needed to verify them.
- **AGENTS.md § Coding standards S1–S7.** S4: no new runtime or dev dependency. S6:
  tests follow the high-value rubric, carry a `Spec:`/`Covers:` header, keep contract
  ids out of test names, and run offline by default. **S7**: tool-neutral content names
  the behavior first. Tools (Claude Code, etc.) and frameworks (vitest, jest,
  Playwright, pytest, `go test`, …) appear only as attributed examples ("e.g."), never
  as the only possibility.
- **Shipped truth this must not contradict** (from `harny-sync` lookup):
  - pipeline-roles **PR-6**: "exactly three human gates — post-specs, post-red-tests,
    post-audit". Invariant 2: "adding, removing, or relocating one is a
    pipeline-behavior change". The tier checkpoint is designed *not* to be a gate
    (contract TT-16). It is conditional, it confirms the scope of the test plan rather
    than approving a stage's output, and it is an instance of the conductor's existing
    pause "Any decision only the human can make: scope, …". This is stated explicitly
    here, as `harny-propose` Step 0 requires, not left implicit.
  - **PR-3 / PR-7**: no Claude-only mechanic as the sole mechanism.
  - **PR-4**: roles that declare `docs-lookup` verify a library's API or setup via a
    docs-lookup MCP before pinning it.
  - **PR-2**: `sdd-test-writer` stays `cost_tier: mid` and `sdd-auditor` stays
    `most-capable`. AL-7: the auditor's scoped capability
    `write-files (audit.md only)` is unchanged, and its tier checks write only to
    `audit.md`.
  - **SL-1 / SL-3 / SL-4** and the `templates/skills/README.md` shape contract: six
    frontmatter keys, five body sections, `description` ≤ 1,024 characters (the
    Kiro/Copilot limit), `compatibility` ≤ 500 characters. Bundled resources are
    referenced by bare file name (README rule 6). Other skills are referenced by name,
    never by path (rule 5).
  - **TG-3 / TG-4**: role and conductor bodies propagate byte-for-byte, and only the
    wrapper, path, model and capabilities differ per tool. So no generator change is
    needed, and none is allowed.
  - **TG-7**: Copilot role body ≤ 30,000 characters. Codex role prose sits in a TOML
    multi-line literal, so it must not contain `'''`, a bare CR or control characters.
  - **ADR 0012 / D1**: `allowed-tools` is kept uniformly between the dogfood and shipped
    copies (`tests/skills-fidelity.test.ts` asserts this). The `allowed-tools` lines of
    `harny-test` and `harny-audit` do not change.
  - **ADR 0013**: template roles remain full-body, not thinned. The role restates the
    flow rather than pointing at the skill.
- **Honesty about verification.** Automated tests verify *shipping* (the file lands,
  references resolve, the coupling tokens match, the gate count holds). They do not
  verify that an agent infers tiers well or stops when it should. That is verified by
  the manual walkthroughs M1–M5 on Claude Code, and it is recorded in advance as the
  planned audit reservation TT-R1. The same behavior on Cursor, Kiro, GitHub Copilot
  and Codex is delivered and tested for presence, but it is not walked through. That
  gap is the named reservation TT-R2.
- **Schedule**: the walkthroughs must be complete by Saturday 2026-09-26 so the
  Sunday 2026-09-27 workshop demo has a rehearsed, recorded run.

## Prior Art

- `templates/skills/harny-sync/capability-template.md` and
  `templates/skills/harny-adr/adr-template.md`: bundled skill resources, loaded by
  `loadSkillTemplates` (`src/templates.ts`, every regular file in the skill directory)
  and emitted per root by `buildSkillFiles` (`src/engine.ts`). They are already proven
  to land in every root by `tests/skills-placement.test.ts` ("bundled resources travel
  with their skill").
- `.claude/skills/high-value-tests/SKILL.md`: the dogfood rubric the human wrote. This
  feature ships a generalized extract of it, not a copy.
- `harny-doctor`'s ask-before-delegating hand-off (pipeline-roles PR-10): a shipped
  precedent for "record the finding, ask the human, and act only on a yes".
- The conductor's "Verify, don't trust" mechanic (PR-11): the conductor checks the Test
  Plan's status in `audit.md` itself rather than trusting the role's report.
- `tests/skills-fidelity.test.ts` `DIVERGENCE_TABLE` and `tests/skills-templates.test.ts`
  `NEUTRALITY_CHECKS`: the existing machinery for declared shipped-versus-dogfood
  divergence and for keeping harny-only residue out of shipped content.
- `documentation-role-completion` and `subagent-feedback-hooks`: precedents for
  template-only content changes that propagate to all five tools with no generator
  change, and for regenerating only the contracted golden files.
