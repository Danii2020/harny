# Pipeline Roles Specification

> Last synced: 2026-09-24 by test-tiers. Owned artifacts: `templates/roles/*.md`,
> `templates/conductor/sdd-conductor.md`, `.claude/agents/sdd-*.md`,
> `.claude/skills/sdd-conductor/SKILL.md`, the cost-tier and capability
> vocabularies, the three human gates.

## Purpose

The five SDD pipeline roles (architect, test-writer, executor, auditor,
documentation), their portable content contract, and the conductor that
sequences them behind three human gates.

## Requirements

### Requirement: PR-1 — Five roles with cost-tier and capability vocabulary

The system SHALL define five roles — `sdd-architect`, `sdd-test-writer`,
`sdd-executor`, `sdd-auditor`, `sdd-documentation` — each with a `cost_tier`
(`most-capable` | `mid` | `cheapest`) and a `capabilities` set drawn from a
6-token vocabulary: `read-files`, `write-files`, `run-shell`, `web-search`,
`docs-lookup`, `task-tracking`.

**Source:** canonical-role-templates · contract.md § "Public API — the templates/ file manifest"; § "Data Model — controlled vocabularies"

#### Scenario: A role is declared
- **WHEN** a canonical role file is declared
- **THEN** it names exactly one of the five role identities, one `cost_tier`
  value, and a `capabilities` set drawn only from the 6-token vocabulary

### Requirement: PR-2 — Cost-tier assignment per role

The system SHALL map `cost_tier`: architect and auditor → `most-capable`;
test-writer, executor, and documentation → `mid`.

**Source:** canonical-role-templates · contract.md § "Per-role content contract"; audit.md C3.
**Amended by** documentation-role-completion · contract.md § Amendments A-PR2, A-PR2b
(documentation clause `cheapest` → `mid`; the other four roles' clauses, and the
3-tier `COST_TIERS` vocabulary itself, are unchanged — `cheapest` becomes
unoccupied by the five default roles, not removed, and stays reachable via a
`--model` override or a custom role).

#### Scenario: A role's cost_tier is resolved
- **WHEN** a role's `cost_tier` is resolved
- **THEN** architect and auditor resolve to `most-capable`, and test-writer,
  executor, and documentation resolve to `mid`

### Requirement: PR-3 — Portability invariant for canonical role files

The system SHALL NOT let any canonical role file name a Claude-Code `tools:`
array, a concrete model id, or a Claude-only path as its sole source of truth
— model need is expressed only as `cost_tier`, permissions only as
`capabilities`.

**Source:** canonical-role-templates · contract.md Behavior Guarantee 1 ("Portability invariant")

#### Scenario: A canonical role file expresses model or permission needs
- **WHEN** a canonical role file expresses a model need or a permission need
- **THEN** it does so only via `cost_tier` or `capabilities`, never via a
  Claude-Code-only tool array, model id, or path as the sole source

### Requirement: PR-4 — Mandatory docs-lookup instruction

The system SHALL require any role declaring `docs-lookup` (architect,
executor, test-writer) to instruct verifying library/API usage via Context7
(or the target tool's equivalent docs-lookup MCP) before pinning a signature,
contract, or test against it — never trusting memory.

**Source:** canonical-role-templates · contract.md § "Docs-lookup content rule"; audit.md R9

#### Scenario: A role declaring docs-lookup is about to pin a library signature
- **WHEN** a role that declares `docs-lookup` is about to pin a library or
  API signature, contract, or test
- **THEN** it first verifies current usage via Context7 (or the target
  tool's equivalent docs-lookup MCP) rather than relying on memory

### Requirement: PR-5 — Automatic documentation hand-off

The system SHALL run `sdd-documentation` as an automatic, non-gated hand-off
immediately after a human approves the auditor's verdict (`APPROVED` or
`APPROVED WITH RESERVATIONS`, never `REJECTED`); it updates `README.md`,
`CHANGELOG.md` (Keep a Changelog style), and `ARCHITECTURE.md`/`AGENTS.md`,
stamps `Shipped: <date>` on `intent.md`, then hands off in order to `harny-sync`
archive mode, `harny-adr`, and `harny-sync` again for the capability docs and
`_index.md`. The role SHALL report completion only after confirming — via the
readiness runner's spec-state family, invocable in isolation as
`node .sdd/doctor/run-doctor.mjs --only spec-state` — that its own feature no
longer appears as shipped-but-unarchived; a failing line for a *different*
feature is surfaced as a finding, never silently ignored and never fixed in
passing; narrating the archive step, or handing it back as a "next step", does
not satisfy this precondition.

**Source:** canonical-role-templates · contract.md § "sdd-documentation content contract — fixed design".
**Extended by** documentation-role-completion · contract.md § Amendment A-PR5, § Behavior
Guarantees RC-9, RC-10, RC-11: the hand-off's completion now additionally requires the
archive to be verified, not just performed; PR-5's trigger, its `REJECTED` refusal, and
its non-gated character are unchanged.

#### Scenario: A human approves the auditor's verdict
- **WHEN** a human approves the auditor's `APPROVED` or
  `APPROVED WITH RESERVATIONS` verdict
- **THEN** `sdd-documentation` runs automatically, updates `README.md`,
  `CHANGELOG.md`, and `ARCHITECTURE.md`/`AGENTS.md`, stamps
  `Shipped: <date>` on `intent.md`, hands off to `harny-sync` archive mode →
  `harny-adr` → `harny-sync` again, and reports completion only after the
  spec-state family confirms its own feature is no longer shipped-but-unarchived

### Requirement: PR-6 — Conductor enforces exactly three human gates

The system SHALL have the conductor (`sdd-conductor`) enforce exactly three
human gates — post-specs, post-red-tests, post-audit — and never self-approve
an agent's output on the human's behalf.

**Source:** canonical-role-templates · contract.md § "Conductor content contract"; audit.md C13

#### Scenario: The pipeline reaches a gate point
- **WHEN** the pipeline reaches the post-specs, post-red-tests, or
  post-audit point
- **THEN** the conductor pauses for an explicit human decision rather than
  self-approving

### Requirement: PR-7 — No sole tool-specific mechanic in tool-neutral content

The system SHALL NOT, in tool-neutral content, name a single tool's mechanic
(e.g. a Claude-only tool name) as the only possibility — the behavior must be
stated generically first, with the tool name kept only as an attributed
example.

**Source:** canonical-role-templates · audit.md AL-9 (a regression that was introduced, caught, and fixed within the same feature)

#### Scenario: Tool-neutral content describes a mechanic
- **WHEN** tool-neutral content describes a mechanic that a specific tool
  implements
- **THEN** the behavior is stated generically first, with the tool named
  only as an attributed example

### Requirement: PR-8 — Role instructions extracted into harny-* skills

The system SHALL have each role's full instruction set extracted into an
action-shaped `harny-*` skill (`harny-propose`, `harny-test`,
`harny-implement`, `harny-audit`, `harny-document`); the five
`.claude/agents/sdd-*.md` files are frontmatter plus a ≤25-line pointer body
naming the skill(s) they preload via `skills:`.

**Source:** sdd-skill-library · contract.md § "Thin agent file shape"

#### Scenario: A pipeline role's behavior is looked up
- **WHEN** a pipeline role's behavior needs to be looked up
- **THEN** it is found in that role's `harny-*` skill, not in the thinned
  `.claude/agents/sdd-*.md` body

### Requirement: PR-9 — Conductor unaffected by skill extraction

The system SHALL keep the conductor unaffected by the skill extraction: it
still addresses the five roles by their unchanged `name:` values, keeps its
three gates in the same positions, and is not itself moved, renamed, or
converted into a `harny-*` skill.

**Source:** sdd-skill-library · contract.md Behavior Guarantee 6; Integration Points

#### Scenario: The conductor sequences the five roles after skill extraction
- **WHEN** the conductor sequences the five roles after the skill extraction
- **THEN** it still addresses them by their unchanged `name:` values, keeps
  the same three gates, and remains a template, not a `harny-*` skill

### Requirement: PR-10 — harny-document bootstrap mode, bounded and mutually unreachable from the post-audit path

The system SHALL give `harny-document` a second, explicitly-scoped invocation path — bootstrap mode — reachable only when there is no approved `audit.md` for a named feature (a target repository with no harny spec history), mutually exclusive with the normal post-audit hand-off (`PR-5`). Bootstrap mode drafts only the named repo-level document(s) from observed repository evidence, marks every output as a draft for human review, and refuses to touch `specs/`, source files, `CHANGELOG.md`, or trigger the `harny-sync`/`harny-adr` hand-off. It is invoked by `harny-doctor` only after the human says yes to delegating a documentation gap (see the `readiness-checks` capability's ask-before-delegating requirement), or directly by a human.

**Source:** ai-sdlc-readiness · intent.md § G5, contract.md § AR-19

#### Scenario: harny-doctor asks to delegate a missing README
- **WHEN** a human agrees to delegate drafting a missing repo-level document, and no approved `audit.md` exists for any named feature
- **THEN** `harny-document` runs in bootstrap mode: it drafts only the named document(s), marks them as drafts, and does not touch `specs/`, source, `CHANGELOG.md`, or trigger `harny-sync`/`harny-adr`

#### Scenario: an approved audit.md exists
- **WHEN** an approved `audit.md` exists for a named feature
- **THEN** bootstrap mode is not reached — the normal post-audit hand-off (`PR-5`) applies instead

### Requirement: PR-11 — Conductor verifies the archive before declaring the pipeline complete

The system SHALL have the conductor (both `templates/conductor/sdd-conductor.md` and,
where present, a live per-tool copy) confirm that `sdd-documentation`'s archive
hand-off actually landed — by running the readiness runner's spec-state family itself
— before declaring the pipeline complete for a feature, rather than accepting the
role's own report that it did. This is an application of the conductor's existing
"Verify, don't trust" mechanic and its "a role should not be trusted to certify its
own gate" principle. Where a live, per-tool conductor copy exists on disk (e.g. this
repo's own untracked `.claude/skills/sdd-conductor/SKILL.md`), a presence-gated parity
test asserts it names the `sdd-documentation` stage, carries the matching post-audit
hard rule, lists `auditor → documentation` in its automatic-flow list, and carries
this same archive-verification duty — skipping (never failing) when that file is
absent, since it is untracked and therefore absent on a fresh clone and in CI.

**Source:** documentation-role-completion · contract.md § Behavior Guarantees RC-14, RC-15, RC-16; intent.md SC6, SC7, SC8

#### Scenario: The documentation role reports completion
- **WHEN** `sdd-documentation` reports its completion
- **THEN** the conductor runs the spec-state check itself before declaring the
  pipeline done for that feature, rather than trusting the role's report

#### Scenario: A live, per-tool conductor copy is present but has drifted
- **WHEN** a live conductor copy on disk is missing the documentation stage, the
  matching hard rule, the automatic-flow entry, or the archive-verification duty
- **THEN** the presence-gated parity test fails, naming the missing element

#### Scenario: No live conductor copy exists on disk
- **WHEN** the live, per-tool conductor file does not exist (e.g. a fresh clone or CI)
- **THEN** the parity test skips, observably, and the suite still passes

### Requirement: PR-12 — Conditional tier-confirmation checkpoint, not a gate

The system SHALL have `sdd-test-writer` propose tests at the tier (`unit` /
`integration` / `e2e`) suited to each spec item, with a framework inferred per tier
from repository evidence, recorded as a `### Test Plan` in `audit.md` § Test
Coverage. Confirmation is required if and only if the plan contains a tier beyond
`unit`, or any row's "Setup needed" is not `none` — a unit-only plan that would still
need setup also asks. A plan that is both unit-only and needs no setup is recorded
`NOT REQUIRED` and proceeds with no pause. The checkpoint is a conditional step
inside the test-writer stage, described as an instance of the conductor's existing
"any decision only the human can make" pause — it is explicitly not a fourth
`[HUMAN GATE`; PR-6's three-gate count and order are unchanged.

**Source:** test-tiers · contract.md § Behavior Guarantees TT-6 to TT-18; ADR 0046, ADR 0047, ADR 0048.

#### Scenario: The test-writer's plan needs a non-unit tier or any setup
- **WHEN** the Test Plan contains a tier beyond `unit`, or any row's "Setup needed"
  is not `none`
- **THEN** the test-writer stops for confirmation before writing a test or
  installing anything — a delegated invocation records `PROPOSED` and reports the
  first line `TEST PLAN AWAITING CONFIRMATION` for the conductor to relay; a direct
  invocation asks inline and waits

#### Scenario: The plan is unit-only with no setup
- **WHEN** the Test Plan is unit-only and every row's "Setup needed" is `none`
- **THEN** it is recorded `NOT REQUIRED (unit-only, no setup)`, tests are written in
  the same invocation with no pause, and the conductor's diagram shows no additional
  `[HUMAN GATE` line

### Requirement: PR-13 — Auditor checks tier coverage

The system SHALL have `sdd-auditor` read a `CONFIRMED` or `NOT REQUIRED` Test Plan
and record a `### Tier Results` table in `audit.md` § Test Coverage, immediately
below the Test Plan, verifying per tier that tests exist, that every listed spec id
is covered at that tier, that the setup present matches the plan, and that the tier
ran or is honestly reported "not run: <reason>". Deviations (an integration/e2e test
written without a `CONFIRMED` plan, a confirmed tier with no tests, setup the plan
never named, or a plan still `PROPOSED`) are raised as findings mapped onto the
auditor's existing CRITICAL/HIGH/MEDIUM/LOW buckets; the verdict enum is unchanged.

**Source:** test-tiers · contract.md § Behavior Guarantees TT-26 to TT-29; intent.md G7; ADR 0049.

#### Scenario: The auditor audits a feature with a Test Plan
- **WHEN** `sdd-auditor` audits a feature whose `audit.md` contains a `### Test Plan`
- **THEN** it writes a `### Tier Results` table below it, checking coverage, setup
  and run status per tier, and logs any deviation as a finding in the existing
  severity buckets rather than a new tier-specific scale

## Invariants

1. `cost_tier` and `capabilities` stay abstract vocabulary — a per-tool generator maps them to that tool's real model ids and permission names; no canonical role file may hardcode a tool-specific value as its only source of truth (breaking this reopens `canonical-role-templates` AL-9's regression class).
2. The three human gates' count and order are fixed; adding, removing, or relocating one is a pipeline-behavior change, not a content change.
3. A role's `name:` value is load-bearing — the conductor addresses subagents by name, so renaming one silently breaks orchestration.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-7 | Scoped write access (e.g. the auditor's `write-files (audit.md only)`) is expressed as a free-text parenthetical inside an otherwise pure capability token list, rather than a structured field a strict parser could rely on | LOW | canonical-role-templates · audit.md AL-7 |
| ask-human-token | The `capabilities` vocabulary has no token backing the conductor's most important behavior — pausing for a human at the three gates — while `docs-lookup` does have a token for its own concern | LOW | canonical-role-templates · audit.md Final Verdict "Recommendations" |
| RC-R1 | **The residual tail-drop risk is not closed.** `PR-11`'s check's judgment is deterministic, but its invocation is still an agent instruction; an agent that drops the archive hand-off can equally drop the verification step immediately after it. The unchanged backstop is `harny-doctor`'s next session-start/pre-spec-work run. This feature does not guarantee the archive always happens — it guarantees that when the check is run, the answer is computed rather than asserted. Deliberate, not accidental. | MEDIUM (design, deliberate) | documentation-role-completion · contract.md RC-13; audit.md RC-R1 |
| RC-R4 | **The live, per-tool conductor copy remains untracked.** `PR-11`'s parity guard detects drift only where that file exists on a given machine; its own repair during this feature's ship is covered by no commit, since `.claude/skills/sdd-conductor/` is gitignored. | LOW (design, deliberate) | documentation-role-completion · audit.md RC-R4, AL-8 |
| RC-AL2 | The acceptance-substring tests pinning `PR-5`'s completion-precondition text (e.g. `['only after', 'spec-state']`) are looser than the guarantee itself — a future prose edit could satisfy the pins while losing the intent. Verified to hold today only by independent auditor re-derivation in context. | LOW | documentation-role-completion · audit.md AL-2 |
| RC-AL3 | The per-generator propagation test for `PR-5`'s completion-precondition text pins a single anchor substring rather than the full element list, weaker than the "verbatim" guarantee it stands for. Verified to hold today only by independent auditor re-derivation across all five scaffolded artifacts. | LOW | documentation-role-completion · audit.md AL-3 |
| TT-AL1 | **`templates/roles/sdd-test-writer.md`'s Step 5 sends a `NOT REQUIRED` plan to "continue straight to Step 7"; the role's own numbering makes the step that writes the tests Step 6, not Step 7.** As shipped, the literal text tells a unit-only, no-setup plan to skip writing its own tests. Held at runtime in the one observed walkthrough (a delegated sub-agent wrote the tests anyway), but the shipped cross-reference is wrong and reaches all five tools. | HIGH | test-tiers · audit.md AL-1 |
| TT-AL2 | Four Error Handling Contract rows never made it into the shipped `harny-test`/`harny-audit` prompts: a re-invocation whose confirmed decision has no matching Test Plan on disk; ambiguous framework evidence across two candidates; the auditor being unable to classify a test's tier; and no human being reachable to confirm. | HIGH | test-tiers · audit.md AL-2 |
| TT-AL3 | The pinned Test Plan shape and its position above the Test Coverage table are not actually shipped; the skill's own pointer ("contract § Data Models") resolves to nothing in a downstream install. Observed at runtime: the Test Plan landed below the table instead of above it. | MEDIUM | test-tiers · audit.md AL-3 |
| TT-AL4 | The previous spec-to-test mapping instructions (every error-handling row, every constraint, the edge-case list) were dropped from the shipped test-writer without a contract line authorizing the removal; the shipped auditor still expects every contract guarantee to have at least one test. | MEDIUM | test-tiers · audit.md AL-4 |
| TT-R1 | Tier inference, the confirmation rule, stop/ask behavior, setup scope and per-tier red reporting are prompt instructions no automated test can prove an agent follows; evidence is limited to five manual walkthroughs on Claude Code, three of which are PARTIAL (no e2e proposal seen, no edit relayed, no decline path, no inline continuation, and every "red for the right reason" leg blocked by the sample's own permission rule). | MEDIUM (human-gated) | test-tiers · audit.md AL-5, TT-R1 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| canonical-role-templates | 2026-07-26 | The five roles' portable content contract, the cost-tier/capability vocabularies, the conductor's content contract |
| sdd-skill-library | 2026-09-09 | Extraction of each role's instructions into a `harny-*` skill; the thinned agent-file shape |
| templates-skill-library-parity | 2026-09-13 | Decision to keep `templates/roles/sdd-*.md` as full-body role files (not thinned) in the portable layer; reconciliation of the live pipeline and `templates/` on archive lifecycle for scaffolded repos |
| ai-sdlc-readiness | 2026-09-15 | PR-10: `harny-document`'s bounded bootstrap mode — a second invocation path for a repo with no harny spec history, mutually unreachable from the post-audit path, output always marked draft |
| dogfood-quick-fixes | 2026-09-22 | Added § Hard-rule inventory: `sdd-documentation` is the only role in the five-role set that carries an explicit hard rule forbidding `git commit` and `git push` (the other four deliberately do not carry this rule). This rule is stated in `templates/roles/sdd-documentation.md` § "Step 5: Hard Rules" and is wired into the canonical role body so it reaches all five tools' generated artifacts. |
| documentation-role-completion | 2026-09-23 | Amended PR-2 (`cheapest` → `mid` for `sdd-documentation`; other four roles unchanged; `cheapest` unoccupied, not removed) and PR-5 (archive verification now a completion precondition, not just a duty). Added PR-11 (conductor verifies the archive itself before declaring the pipeline complete, plus a presence-gated parity guard for the live per-tool conductor copy). Restored role-template↔skill parity for the hand-off tail (the role template previously named `harny-adr` zero times). Renumbered the role template's steps: hard rules are now Step 7 and the change summary is Step 8 (was Step 5/6). |
| test-tiers | 2026-09-24 | Added PR-12 (the shipped test-writer proposes unit/integration/e2e tests with a conditional, non-gate confirmation checkpoint) and PR-13 (the shipped auditor checks tier coverage and records `### Tier Results`). Shipped as the delivery layer only — reaches all five tools, `src/` unchanged; this repository's own dogfood test-writer and auditor intentionally keep the pre-tier flow (reservation TT-R3). Approved with reservations: two HIGH text defects in the shipped prompts (a wrong step cross-reference; four missing Error Handling Contract rows) and partial manual-walkthrough coverage on Claude Code, carried forward rather than blocking. |

## Hard-rule inventory

| Rule | Role | Scope |
|---|---|---|
| Never commit or push | `sdd-documentation` | Forbids `git commit`, `git push`, and `--no-verify` flags. Directs the role to leave changes in the working tree and report them in the role's Step 8 change summary. Carves out `git mv` (permitted during archive moves). |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| 0006 | Coding standards — single source of truth in AGENTS.md | Accepted |
| 0013 | Template roles remain full-body, not thinned; no thin pointer layer in `templates/` | Accepted |
| 0036 | Raise `sdd-documentation` to `mid`; leave `cheapest` unoccupied rather than reassigning another role to it | Accepted |
| 0037 | Guard the untracked live conductor with a presence-gated parity test rather than tracking the file or leaving it unguarded | Accepted |
| 0046 | Any setup requires confirmation, even for a unit-only plan | Accepted |
| 0047 | The Test Plan is recorded only inside audit.md § Test Coverage | Accepted |
| 0048 | The tier-confirmation checkpoint is conditional, not a fourth human gate | Accepted |
| 0049 | Tier findings map onto the auditor's existing severity buckets | Accepted |
