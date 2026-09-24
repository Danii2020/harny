# Contract: Test Tiers

> Guarantee ids use the prefix `TT-` (unused elsewhere in `specs/`). Every guarantee
> cites the `intent.md` goal it serves. "Shipped" means content under `templates/`
> that `npx harny init` writes into a downstream repository. "Dogfood" means this
> repository's own `.agents/` and `.claude/` trees, which this feature does not touch.

## Interfaces

### Public API

This feature adds no TypeScript API. Its public surface is **shipped prompt content**
plus **one on-disk record format** plus **one orchestrator↔role protocol**. The
existing loader already carries a bundled resource to every skill root, and this
feature relies on that code unchanged:

```ts
// src/templates.ts (UNCHANGED) — loadSkillTemplates reads every regular file in
// templates/skills/<id>/, so harny-test/high-value-tests.md is loaded with no code change.
export interface SkillTemplate {
  readonly id: SkillId;
  /** `SKILL.md` plus every sibling regular file, sorted by `name` (determinism). */
  readonly files: readonly SkillResource[];
  readonly sourcePath: string;
}

// src/engine.ts (UNCHANGED) — writes each skill's files once per distinct skill root:
// '.claude/skills' (claude-code), '.kiro/skills' (kiro),
// '.agents/skills' (cursor, github-copilot, codex — shared, deduped).
export function buildSkillFiles(payload: HarnessPayload, roots: readonly string[]): readonly GeneratedFile[];
```

**Shipped artifacts (the file manifest this feature changes):**

| Canonical source | Change | Reaches (per selected tool) |
|---|---|---|
| `templates/skills/harny-test/high-value-tests.md` | CREATE | `<skillsDir>/harny-test/high-value-tests.md`: Claude Code `.claude/skills/`, Kiro `.kiro/skills/`, Cursor/GitHub Copilot/Codex `.agents/skills/` |
| `templates/skills/harny-test/SKILL.md` | MODIFY | `<skillsDir>/harny-test/SKILL.md` (same roots) |
| `templates/roles/sdd-test-writer.md` | MODIFY (metadata `invocation`/`handoff` + body) | `.claude/agents/sdd-test-writer.md`, `.cursor/agents/sdd-test-writer.md`, `.kiro/agents/sdd-test-writer.md`, `.github/agents/sdd-test-writer.agent.md`, `.codex/agents/sdd-test-writer.toml` |
| `templates/conductor/sdd-conductor.md` | MODIFY (body) | `.claude/skills/sdd-conductor/SKILL.md`, `.cursor/skills/sdd-conductor/SKILL.md`, `.kiro/skills/sdd-conductor/SKILL.md`, `.github/skills/sdd-conductor/SKILL.md`, `.agents/skills/sdd-conductor/SKILL.md` (Codex) |
| `templates/skills/README.md` | MODIFY (one factual sentence) | `<skillsDir>/README.md` |

**Orchestrator↔test-writer protocol (shipped prompt content, identical in skill, role
and conductor):**

- **Awaiting marker**: the exact line `TEST PLAN AWAITING CONFIRMATION`, as the first
  line of the test-writer's final report when it stops for confirmation.
- **Plan-status values** (the value after `**Plan status**:` in the Test Plan):
  `PROPOSED`, `CONFIRMED`, `NOT REQUIRED`.
- **Re-invocation input**: the human's decision (confirm as-is, or edits such as "drop
  e2e" or "use framework X for integration"), passed to the same test-writer role in
  the re-invocation context. The conductor resumes the prior invocation when the tool
  supports it; otherwise it starts a fresh invocation with that context.

### Data Models

**Tier vocabulary** (closed set, shipped prose): `unit`, `integration`, `e2e`.

| Tier | Suitable when (the rubric's § "Picking the right tier") |
|---|---|
| `unit` | Pure logic: branching, arithmetic, mapping, guards and invariants the project owns; component output rendered in-process and asserted on visible behavior |
| `integration` | Behavior across a real boundary: a database, an HTTP API, a queue, another module or service, security/trigger/stored-procedure behavior, exercised against the real thing (or the project's own in-process stand-in for it) |
| `e2e` | User-visible flows across a UI (for example, a feature that touches components or interactions in a frontend app) |

**The Test Plan record**: a Markdown subsection that the test-writer writes into
`specs/<feature>/audit.md`, inside the existing `## Test Coverage` section and
immediately above its table. The shape is pinned. The values below are illustrative,
and the framework names are attributed examples:

```markdown
### Test Plan

**Plan status**: PROPOSED

| Tier | Framework | Evidence | Setup needed | Covers | Rationale |
|---|---|---|---|---|---|
| unit | vitest (e.g.) | `package.json` devDependencies; `vitest.config.ts`; existing `tests/**/*.test.ts` | none | contract TT-1, TT-4; intent SC1 | pure mapping logic, no boundary |
| integration | vitest + the project's in-process HTTP stand-in (e.g.) | `apps/api/package.json`; existing `apps/api/tests/routes.test.ts` | none | contract G7; intent SC2 | behavior crosses the API↔DB seam |
| e2e | Playwright (e.g.) | web UI in `apps/web` (`apps/web/package.json`: react, vite); no e2e runner found | dev dependency `@playwright/test`; config file `apps/web/playwright.config.ts`; script `test:e2e` | intent SC3 | user-visible flow across the UI |

**Not covered by an automated test**: <contract/intent id> — <why only a low-value test could cover it; how it is verified instead>

**Default run**: offline. Integration tests that need a live service are tagged `<the project's tag convention>` and skipped by default. e2e tests run separately via `<command>`.
```

When confirmed, the status line becomes `**Plan status**: CONFIRMED (<YYYY-MM-DD>, by
the human, <in conversation | via the orchestrator>)`. For a unit-only plan with no
setup it is `**Plan status**: NOT REQUIRED (unit-only, no setup)`.

**The rubric resource** `templates/skills/harny-test/high-value-tests.md`: plain
Markdown with no YAML frontmatter. It has exactly one H1 and then these H2 sections, in
this order, with these exact heading texts:

1. `## The one question`
2. `## Don't write these`
3. `## Do write these`
4. `## Picking the right tier`
5. `## Using this in the SDD workflow`

(The principle paragraph sits under the H1, before the first H2.)

### State Changes

- **`templates/`**: 1 file created and 4 modified (see the manifest above). `src/` is
  unchanged. `package.json` is unchanged.
- **Downstream installs**: +1 file per distinct skill root. No other path changes.
- **Downstream `specs/<feature>/audit.md`**, at test-writer run time: gains a
  `### Test Plan` subsection inside `## Test Coverage`.
- **Downstream project manifest/config**, at test-writer run time: gains the dev
  dependencies, config files and scripts named in a *confirmed* plan's "Setup needed"
  column, and nothing else.
- **This repository's tests and fixtures**: see Integration Points.

## Behavior Guarantees

### The shipped rubric (G4)

1. **TT-1 — The rubric ships to every skill root of every tool.** *(G4)*
   `templates/skills/harny-test/high-value-tests.md` exists. Every `init` that selects
   any of the five tools writes it at `<skillsDir>/harny-test/high-value-tests.md`,
   beside `harny-test/SKILL.md`, byte-identical to the source. With all five tools that
   means `.claude/skills/`, `.kiro/skills/` and `.agents/skills/`, each once (dedup
   unchanged). `harny-test` is a core skill, so this also holds under `--skills none`.
   The file ends in exactly one `\n` (S3). The existing `loadSkillTemplates` /
   `buildSkillFiles` path achieves this with no `src/` change.
2. **TT-2 — Rubric content.** *(G4)* The rubric carries, in the section structure
   pinned in Data Models, generalized from the human's prompt:
   - **Principle** (under the H1): a test earns its place only if it catches a real
     regression that the build, the type checker or a better-placed test would not.
     Coverage of a contract line is not the goal. Change-detectors are worse than no
     test.
   - **The one question**: "If a real bug were introduced here, would this test fail —
     and would it stay green through a harmless refactor?" Yes/Yes → write it. No →
     tautology or framework test, don't write it. Yes/No → change-detector, rewrite it
     to assert behavior or drop it.
   - **Don't write these**, exactly six numbered items: (1) tautologies (a constant
     equals its literal); (2) third-party/framework tests, especially against mocked
     dependencies; (3) source-text grep tests (style class strings, migration/SQL
     text), where the rubric says to verify behavior instead; (4) file-existence and
     scaffold registries (the compiler and imports already catch these); (5) redundant
     duplicates of a stronger behavioral or integration test, where a global structural
     invariant asserted once is fine; (6) mechanical boilerplate cases copied across
     identical thin pass-through functions, where one representative test is enough.
   - **Do write these**, exactly five items: branching, arithmetic and mapping logic
     with representative and boundary inputs; guards and invariants the project owns;
     behavior at the seam, tested via the seam (assert call shape and the returned or
     mapped value, not query strings); security-critical behavior against the real
     thing in an integration test; real edge cases from the contract where the code has
     a path for them.
   - **Picking the right tier**: pure logic → unit; component output → render it and
     assert visible behavior, not class names; DB, security, trigger or stored-procedure
     behavior → live integration test; user-visible flows across a UI → e2e; a cheap
     structural invariant → one guard, asserted once.
   - **Using this in the SDD workflow**: contract guarantees and intent success criteria
     are the source of *what* to cover, but each maps to the cheapest test that would
     actually fail on a regression, at the right tier. If the only way to cover a line
     is low-value, note it in `audit.md` (the Test Plan's "Not covered by an automated
     test" line) and move on.
3. **TT-3 — Rubric neutrality.** *(G4)* The rubric contains none of the dogfood copy's
   domain specifics: not `IVA`, `es-EC`, `shadcn`, `Radix`, `Supabase`, `RLS`,
   `security definer`, `.live.test.ts`, `Postgres`, `receipt`, or `finance auto-feed`.
   Every framework, tool or library it names appears as an attributed example ("e.g.",
   "for example"), never as the only option (S7). It has no YAML frontmatter, so no tool
   can mistake it for a skill. It contains no `'''`.
4. **TT-4 — No dangling references anywhere in the shipped tree.** *(G4)* In a
   generated install (all five tools, `--skills all`), for every skill root:
   - every "`` `<name>` skill ``" reference in any installed `harny-*/SKILL.md`, and in
     every installed role and conductor artifact, names an id in `SKILL_IDS` or
     `sdd-conductor`;
   - every backticked bare lowercase `<file>.md` reference in an installed
     `harny-*/SKILL.md`, other than the five spec-file names (`intent.md`,
     `contract.md`, `roadmap.md`, `tasks.md`, `audit.md`), exists as a file in that same
     skill's installed directory.

   This holds for the whole shipped tree, not only for `harny-test`. The literal
   `` `high-value-tests` skill `` appears in no file under `templates/`.
5. **TT-5 — Skill and role cite the rubric the same way.** *(G4, G5)*
   `templates/skills/harny-test/SKILL.md` and `templates/roles/sdd-test-writer.md` each
   cite the rubric by bare file name and section, in the exact form
   `` `high-value-tests.md` § "<H2 heading text>" ``. Each cites at least
   § "The one question" and § "Picking the right tier". Every cited heading exists as
   an H2 in the rubric. The role refers to the rubric as bundled with the `harny-test`
   skill (by skill name, never by a tool-specific path, per README rule 5). The role's
   sentence beginning "If this repo or the target tool vendors a dedicated rubric" is
   removed. The role keeps a one-paragraph restatement of "the one question" (ADR 0013:
   template roles stay full-body), and that restatement agrees with TT-2.

### Tier proposal and confirmation (G1, G2, G3)

6. **TT-6 — Tier selection.** *(G1)* The skill and the role instruct the test-writer to
   pick tiers only from the closed vocabulary `unit`, `integration`, `e2e`, using the
   rubric's § "Picking the right tier". A tier is included only when at least one
   contract or intent item is best covered at that tier. Each included tier states a
   rationale and the contract and intent ids it covers. A feature with no real boundary
   and no user-visible UI flow gets `unit` only. The existing step "every success
   criterion gets at least one integration test" is replaced by "each success criterion
   maps to the cheapest suitable tier" (TT-2, last item).
7. **TT-7 — Framework inference from evidence.** *(G2)* For each tier, the test-writer
   names the framework and cites the evidence it was inferred from, as repository paths
   (manifests, test-runner config, existing tests, a conventions doc). Detection is an
   instruction in prompt content. No framework table is added to `src/`. Framework
   names in shipped content appear only as attributed examples. For instance, vitest or
   jest for JS/TS unit tests, Playwright for web e2e, pytest for Python, `go test` for
   Go. When no evidence exists for a tier, the test-writer proposes that stack's
   standard choice, and "Setup needed" names the **exact** dev dependency (package name,
   plus a version or range following the manifest's own convention), the **exact**
   config file path(s), and the **exact** command or script that runs the tier
   separately. It verifies the framework's current setup and API via docs-lookup (for
   example Context7, or the tool's equivalent) before naming them (PR-4).
8. **TT-8 — Where the plan is recorded.** *(G3)* The Test Plan is written only as the
   `### Test Plan` subsection of `specs/<feature>/audit.md` § `## Test Coverage`, in the
   pinned shape. It is not written to `tasks.md` or anywhere else. The test-writer
   already owns that section (`harny-writes`), the auditor reads it in the same file,
   and `tasks.md` is traceable to roadmap phases, which a test plan is not. If a
   `### Test Plan` already exists (a re-invocation), the test-writer updates it in
   place and never appends a second one.
9. **TT-9 — When confirmation is required.** *(G3)* Confirmation is required **if and
   only if** the plan contains a tier other than `unit`, **or** any row's "Setup
   needed" is not `none`. Otherwise the test-writer records
   `**Plan status**: NOT REQUIRED (unit-only, no setup)` and continues to write the
   tests in the same invocation, with no stop and no marker. A unit-only plan that
   would bootstrap a test framework (no test setup exists yet) therefore **does**
   require confirmation. This supersedes the current unconditional "bootstrap the
   standard one" instruction. Nothing is installed without confirmation.
10. **TT-10 — Stop and ask, by invocation context.** *(G3)* When confirmation is
    required:
    - **Cannot wait for a human in this conversation** (running as a delegated role or
      sub-agent whose output returns to an orchestrator): record the plan with
      `**Plan status**: PROPOSED`. Write **no** test file, run **no** install, and
      modify **no** manifest or config file. Make the first line of the final report
      `TEST PLAN AWAITING CONFIRMATION`, followed by a summary of the plan (tiers,
      frameworks, setup, and what each tier covers), then stop.
    - **Can wait** (a human invoked `harny-test` directly in this conversation): record
      the plan as `PROPOSED`, present it inline, ask for confirmation or edits, and wait
      for the answer. Then continue under TT-11 in the same invocation.

    The skill and the role describe the behavior first. A tool-specific ask mechanism
    appears only as an attributed example (S7, PR-7).
11. **TT-11 — Confirmation provenance.** *(G3)* Only a human decision sets `CONFIRMED`.
    That decision is either given in the conversation, or relayed by the orchestrator in
    the re-invocation context. The test-writer never self-confirms, and never treats a
    `PROPOSED` status found on disk as permission. It applies any edits to the plan
    first, then sets `**Plan status**: CONFIRMED (<date>, by the human, <channel>)`. If
    the edits introduce setup that the plan did not name (a new dependency, config file
    or command), the status goes back to `PROPOSED` and TT-10 applies again. If the
    human declines every non-unit tier and all setup, the remaining unit-only plan is
    recorded as `CONFIRMED` and the test-writer proceeds.
12. **TT-12 — Setup scope after confirmation.** *(G2, G3)* After `CONFIRMED`, the
    test-writer adds exactly the dev dependencies, config files and scripts named in
    "Setup needed", and nothing else. It never adds a runtime (non-dev) dependency. If
    an install fails, it records the failure against that tier and reports it. It never
    substitutes a different framework without re-proposing.
13. **TT-13 — Default run stays offline, existing rules preserved.** *(G1)* Integration
    tests that need a live service are tagged by the project's convention and skipped
    by the default run. e2e tests follow the project's convention for running
    separately, or, if there is none, the separate command named in the confirmed plan.
    The default test command never runs them. These existing rules are kept verbatim in
    meaning: no contract or intent ids in test names; a spec-linked header on every test
    file; Arrange-Act-Assert; fake injected seams, not internals; never rewrite a test
    to paper over an implementation bug; the PENDING→WRITTEN update of the Test
    Coverage table.
14. **TT-14 — Red verification is reported per tier, and never claimed without a
    run.** *(G1)* After writing tests, the test-writer runs each tier with that tier's
    own command (the default run for unit, and the tagged or separate commands where the
    environment allows). It reports each tier as either "red for the right reason"
    (missing implementation) or "not run: <reason>" (for example, a browser or live
    service is unavailable). It never reports a tier as red-verified unless it ran it.

### Conductor and the three gates (G3, G5)

15. **TT-15 — The conductor routes the checkpoint.** *(G3)* The shipped conductor
    instructs this sequence. After the post-specs gate, invoke the test-writer. If its
    report begins with `TEST PLAN AWAITING CONFIRMATION`, the conductor first confirms
    independently that `audit.md`'s Test Plan reads `**Plan status**: PROPOSED`
    ("Verify, don't trust"). It then presents the plan to the human using the tool's
    structured ask-the-human mechanism (for example `AskUserQuestion` on Claude Code,
    as an attributed example only), and relays the human's decision verbatim to the
    **same** test-writer role. It prefers resuming that invocation, and otherwise starts
    a fresh one with the decision in context. The conductor never confirms on the
    human's behalf and never edits the plan itself (hard rule #5: changes go back to the
    same role). If the status is `NOT REQUIRED`, the flow continues with no pause.
16. **TT-16 — Exactly three gates; the checkpoint is not a gate.** *(G5)* The conductor's
    pipeline diagram still contains exactly three `[HUMAN GATE` entries, in the same
    order (specs, tests, audit). The checkpoint appears in the diagram as a
    conditional step inside the test-writer stage, labelled as a checkpoint and not
    with `HUMAN GATE`. The summary sentence still reads "Five roles, three human gates,
    one automatic post-audit handoff". It is extended, never replaced, to say the tier
    checkpoint is conditional and is not a gate. In § "Human gates vs. automatic flow",
    the checkpoint is listed under the existing pause "Any decision only the human can
    make" (scope), not as a gate bullet. Hard rules #1–#5 keep their numbers and their
    existing text. The checkpoint is added as hard rule #6. The strings
    `documentation follows automatically`, `auditor → documentation` and
    `confirms the archive landed` remain present.
17. **TT-17 — Protocol tokens are identical in all three places.** *(G3, G5)* The
    literal `TEST PLAN AWAITING CONFIRMATION` and the three literals `PROPOSED`,
    `CONFIRMED` and `NOT REQUIRED` (each introduced by `**Plan status**:`) appear
    identically in `templates/skills/harny-test/SKILL.md`,
    `templates/roles/sdd-test-writer.md` and `templates/conductor/sdd-conductor.md`.
18. **TT-18 — The post-red-tests gate shows tiers.** *(G1, G5)* At the existing test
    review gate, the conductor's summary includes the confirmed Test Plan (tiers,
    frameworks, setup performed) and each tier's red-verification status from TT-14,
    including any "not run" tier. The gate itself is unchanged.

### Skill shape, role shape and shipping (G4, G5)

19. **TT-19 — `harny-test/SKILL.md` keeps the shape contract.** *(G5)* The file keeps
    the six frontmatter keys (no others), and the five body sections in order (title,
    `## When to use this`, `## Inputs`, `## Steps`, `## Guardrails`). `name` stays
    `harny-test`. `description` stays ≤ 1,024 characters and states that the skill
    proposes tiers first. `compatibility` stays ≤ 500 characters and no longer mentions
    a `high-value-tests` skill; it names the bundled `high-value-tests.md` instead.
    `allowed-tools` is byte-unchanged (`Read, Write, Edit, Bash, WebFetch, WebSearch`,
    per D1). `metadata.version` becomes `"2.0"`, a breaking change for any orchestrator
    because an invocation can now end without tests (TT-10). `metadata.harny-writes`
    becomes `test files; test-framework setup named in a confirmed Test Plan (dev
    dependencies, config files, scripts); specs/<feature>/audit.md Test Coverage
    (including its Test Plan)`. `## Inputs` lists `high-value-tests.md` (bundled, loaded
    on demand) and the re-invocation decision (TT-11) as inputs. `## Guardrails` states
    TT-9, TT-10 and TT-11 as hard rules: never write integration/e2e tests or perform
    setup without confirmation, never self-confirm, and never claim an unrun tier is
    red.
20. **TT-20 — The role stays a valid, full-body role.** *(G5)* `sdd-test-writer.md`
    keeps `id`, `purpose`, `cost_tier: mid`, `cost_rationale` and
    `capabilities: read-files, write-files, run-shell, docs-lookup` unchanged. Its
    `invocation` and `handoff` are extended to mention the conditional confirmation
    checkpoint before red tests. Its body carries the same flow as the skill (TT-6 to
    TT-14). The body stays under 30,000 characters and contains no `'''`, bare CR or
    control character, so all five generators render it and the conductor without a
    `HarnessError` (TG-7). The AL-5 spec-schema pointer block, and the absence of the
    `sdd-documentation`-only "never commit or push" rule, are preserved.
21. **TT-21 — No code, generator or dependency change.** *(G4, G5)* No file under
    `src/`, `bin/` or `package.json` changes (S4). No generator change is needed or
    made, because body propagation is TG-3/TG-4. The readiness harness-file manifest is
    unchanged.
22. **TT-22 — The dogfood tree is untouched, and the divergence is declared.** *(G5)* No
    byte under `.agents/` or `.claude/` changes. In `tests/skills-fidelity.test.ts`,
    `DIVERGENCE_TABLE['harny-test']` changes from `byte-identical` to `diverges` with
    ``forbiddenInTemplate: ['Run the `high-value-tests` skill first']`` and
    `requiredInTemplate: ['high-value-tests.md', 'TEST PLAN AWAITING CONFIRMATION']`.
    Both needles are verified against the dogfood copy by the existing mechanism.
    `harny-test/high-value-tests.md` has no dogfood counterpart and is not added to the
    "bundled resources default to byte-identical" block.
23. **TT-23 — Install counts.** *(G4)* +1 file per distinct skill root:
    - single-tool default install: 38 → **39** files (each of the five single-tool
      scenarios in `tests/e2e-init.test.ts`);
    - five tools, default skills: 92 → **95** total, skill-library 33 → **36**;
    - five tools, `--skills all`: 98 → **101**, skill-library 39 → **42**;
    - five tools, `--skills none`: 89 → **92**, skill-library 30 → **33**.

    `defaultSkillLibraryPaths` gains `${rootDir}/harny-test/high-value-tests.md`. The
    packaging manifest gains `templates/skills/harny-test/high-value-tests.md`
    (`EXPECTED_TEMPLATE_FILES` 31 → 32).
24. **TT-24 — Goldens: only the contracted files change.** *(G4)* In each of
    `tests/fixtures/golden/monorepo-mode/ts-root/` and
    `tests/fixtures/golden/monorepo-mode/py-sub/apps/api/`, exactly these five paths
    change, and nothing else:
    `.claude/skills/harny-test/high-value-tests.md` (created),
    `.claude/skills/harny-test/SKILL.md`, `.claude/agents/sdd-test-writer.md`,
    `.claude/skills/sdd-conductor/SKILL.md` and `.claude/skills/README.md` (modified).
    Each is copied byte-for-byte from a fresh run of the **built** CLI with the golden's
    own flags (`init <dir> --yes --tools claude-code --stack typescript` at a `git init`
    root; `init <repo>/apps/api --yes --tools claude-code --stack python` in a
    `git init` repo). No file is hand-edited. The golden test's declared-exception list
    does not grow. `tests/canonical-fidelity.test.ts` T41's `isContractedEntry` gains
    `templates/roles/sdd-test-writer.md` by exact match (the conductor and
    `templates/skills/**` are already allowlisted).
25. **TT-25 — Honest verification boundary.** *(G6)* TT-6, TT-7, TT-9, TT-10, TT-11,
    TT-12, TT-14, TT-15 and TT-18 describe agent runtime behavior that follows from
    prompt instructions. Automated tests verify only that the instructions ship, that
    they are coherent (TT-4, TT-5, TT-17, TT-16's gate count), and that they reach every
    tool. Runtime behavior is verified by manual walkthroughs M1–M4 (audit.md), recorded
    before 2026-09-27. The unverifiable remainder is carried as planned reservation
    TT-R1.

## Error Handling Contract

These rows are prompt-level behaviors of the shipped test-writer and conductor at
downstream run time, except the last three rows, which are harny build-time behaviors.

| Error Condition | Behavior | User Impact |
|---|---|---|
| Re-invoked with a "confirmed" decision, but `audit.md` has no `### Test Plan` (or it was deleted) | Test-writer rebuilds the plan, records it `PROPOSED`, and stops under TT-10. It does not write tests on a confirmation it cannot match to a plan. | Human sees the plan again and re-confirms |
| Human's edits add a framework, dependency or config not in the plan | Status reverts to `PROPOSED`, and TT-10 applies again | One more confirmation round. Nothing is installed unconfirmed |
| Stack evidence is ambiguous (two candidate frameworks for a tier) | The plan recommends one, cites the evidence for both in "Evidence", and names the alternative in "Rationale". Whether confirmation is required is still decided only by TT-9: if the recommendation needs installing, "Setup needed" is not `none` and the human confirms | The choice is visible in the record. Nothing unconfirmed is installed |
| A confirmed setup step fails (install error, offline) | That tier is marked failed in the report with the error. Other tiers proceed. No substitute framework is installed | Human sees which tier is blocked and why |
| A tier cannot be run in the current environment (no browser, no live service) | Tests are written. Report says "not run: <reason>" for that tier (TT-14). It is never claimed red | Human knows red status is unverified for that tier at the post-red-tests gate |
| Conductor sees the marker but `audit.md` does not read `PROPOSED` | Conductor does not present a stale or absent plan. It reports the mismatch to the human and re-invokes the test-writer to reconcile (hard rule #5) | Human is told the role's report and the record disagree |
| No human is reachable (for example, an unattended run) | The conductor does not confirm on the human's behalf. The pipeline waits at the checkpoint, as it does at a gate. A human's explicit, recorded waiver is the only exception, and the conductor records it in the Test Plan's status line channel | Integration/e2e tests are never written by default without a human |
| Build time: a shipped template names a skill harny does not ship, or a bundled file that is absent | The TT-4 guard test fails, naming the file and the reference | harny contributor fixes before merge |
| Build time: the role or conductor would exceed a vendor limit or contain `'''` | The existing `HarnessError('TEMPLATE')` from the generator (TG-7), before any write | `init` fails loudly. It is caught by the existing e2e and generator tests |
| Build time: goldens drift beyond the five contracted paths | The existing golden-byte test fails on path-set or byte mismatch | harny contributor investigates the unintended change |

## Dependencies

- **Internal**: `src/templates.ts` `loadSkillTemplates` and `src/engine.ts`
  `buildSkillFiles` and `skillRootsFor`, all unchanged. `src/vocabulary.ts` `SKILL_IDS`
  and `CORE_SKILL_IDS` are unchanged; `harny-test` is already core. The five
  generators' `renderRole` and `renderConductor` are unchanged.
- **External packages**: none added (S4). Tests use the existing `vitest` and Node
  builtins.
- **Human-authored source**: the rubric content is a generalized extract of the
  human's prompt (mirrored in `.claude/skills/high-value-tests/SKILL.md`). That file is
  read as input and never modified or copied verbatim.

## Integration Points

- **Generators**: every tool receives the new rubric through `skillsDir`, and the
  updated role and conductor through TG-3 body propagation. No per-tool code applies.
- **Conductor ↔ test-writer**: the TT-10 marker and the TT-8 status line in `audit.md`.
  The conductor's existing "Verify, don't trust" and "Prefer resuming an existing
  invocation" mechanics carry the checkpoint.
- **Auditor (unchanged)**: reads `audit.md` whole, so it sees the Test Plan, but it is
  not instructed to check it (see open question Q2).
- **Tests in this repository**:
  - `tests/skills-fidelity.test.ts`: `DIVERGENCE_TABLE['harny-test']` (TT-22).
  - `tests/skills-templates.test.ts`: a `NEUTRALITY_CHECKS` entry for
    `harny-test/high-value-tests.md` (TT-3). The existing shape tests keep covering
    TT-19 unchanged.
  - `tests/skills-placement.test.ts`: per-tool placement of every `harny-test` file
    (TT-1).
  - `tests/skill-references.test.ts` (new): TT-4 on a real install.
  - `tests/test-writer-templates.test.ts` (new): TT-5 citations, TT-17 token coupling,
    TT-16 gate count and preserved strings, and TT-3's rubric section structure.
  - `tests/e2e-init.test.ts`: counts and `defaultSkillLibraryPaths` (TT-23), plus the
    golden docblock recording TT-24's regeneration.
  - `tests/packaging.test.ts`: the manifest entry (TT-23).
  - `tests/canonical-fidelity.test.ts`: the T41 allowlist entry (TT-24).
- **Knowledge base (at archive time, via `harny-sync`)**: `pipeline-roles` gains a
  requirement for the conditional tier checkpoint and its not-a-gate status (PR-6 is
  unchanged). `skill-library` gains a requirement that `harny-test` bundles the rubric
  and that shipped templates carry no dangling skill references.
