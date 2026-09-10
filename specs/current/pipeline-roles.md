# Pipeline Roles Specification

> Last synced: 2026-09-08. Owned artifacts: `templates/roles/*.md`,
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
test-writer and executor → `mid`; documentation → `cheapest`.

**Source:** canonical-role-templates · contract.md § "Per-role content contract"; audit.md C3

#### Scenario: A role's cost_tier is resolved
- **WHEN** a role's `cost_tier` is resolved
- **THEN** architect and auditor resolve to `most-capable`, test-writer and
  executor resolve to `mid`, and documentation resolves to `cheapest`

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
then stamps `Shipped: <date>` on `intent.md`.

**Source:** canonical-role-templates · contract.md § "sdd-documentation content contract — fixed design"

#### Scenario: A human approves the auditor's verdict
- **WHEN** a human approves the auditor's `APPROVED` or
  `APPROVED WITH RESERVATIONS` verdict
- **THEN** `sdd-documentation` runs automatically, updates `README.md`,
  `CHANGELOG.md`, and `ARCHITECTURE.md`/`AGENTS.md`, and stamps
  `Shipped: <date>` on `intent.md`

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

## Invariants

1. `cost_tier` and `capabilities` stay abstract vocabulary — a per-tool generator maps them to that tool's real model ids and permission names; no canonical role file may hardcode a tool-specific value as its only source of truth (breaking this reopens `canonical-role-templates` AL-9's regression class).
2. The three human gates' count and order are fixed; adding, removing, or relocating one is a pipeline-behavior change, not a content change.
3. A role's `name:` value is load-bearing — the conductor addresses subagents by name, so renaming one silently breaks orchestration.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-7 | Scoped write access (e.g. the auditor's `write-files (audit.md only)`) is expressed as a free-text parenthetical inside an otherwise pure capability token list, rather than a structured field a strict parser could rely on | LOW | canonical-role-templates · audit.md AL-7 |
| ask-human-token | The `capabilities` vocabulary has no token backing the conductor's most important behavior — pausing for a human at the three gates — while `docs-lookup` does have a token for its own concern | LOW | canonical-role-templates · audit.md Final Verdict "Recommendations" |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| canonical-role-templates | 2026-07-26 | The five roles' portable content contract, the cost-tier/capability vocabularies, the conductor's content contract |
| sdd-skill-library | 2026-09-09 | Extraction of each role's instructions into a `harny-*` skill; the thinned agent-file shape |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| 0006 | Coding standards — single source of truth in AGENTS.md | Accepted |
