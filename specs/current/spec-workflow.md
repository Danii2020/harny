# Spec Workflow Specification

> Last synced: 2026-09-08. Owned artifacts: `templates/spec-schema/*.md`,
> `.sdd/spec-schema/*.md` (deployed by `npx harny init`), the 5-file spec schema
> conventions themselves, the in-flight → archived lifecycle under `specs/`.

## Purpose

The document schema every SDD feature is authored against — five files
(`intent.md`, `contract.md`, `roadmap.md`, `tasks.md`, `audit.md`), their
traceability rules, task states, and audit verdict enum — plus, as of the
`sdd-skill-library` feature, the lifecycle a feature's spec directory follows
from in-flight to archived.

## Requirements

### Requirement: SW-1 — Five-file spec directory schema

The system SHALL give every feature a directory `specs/<feature-name>/`
containing exactly five files: `intent.md` (why), `contract.md` (what),
`roadmap.md` (how), `tasks.md` (a granular checklist with states
`[ ]`/`[x]`/`[~]`/`[!]`), and `audit.md` (compliance tracking plus a final
verdict).

**Source:** canonical-role-templates · contract.md § "Data Model — the canonical role-file document schema"

#### Scenario: A new feature is proposed
- **WHEN** a new feature is proposed
- **THEN** its spec directory `specs/<feature-name>/` is created with exactly
  these five files, each serving its designated purpose

### Requirement: SW-2 — Reflexive traceability across spec files

The system SHALL make traceability mandatory and reflexive: every
`contract.md` item cites an `intent.md` goal; every `tasks.md` item cites a
`roadmap.md` phase; every `audit.md` item cites `intent.md` or `contract.md`.

**Source:** canonical-role-templates · contract.md § Interfaces; audit.md R8

#### Scenario: A spec-file item is authored
- **WHEN** a `contract.md`, `tasks.md`, or `audit.md` item is authored
- **THEN** it cites the specific `intent.md` goal, `roadmap.md` phase, or
  `intent.md`/`contract.md` section it traces back to

### Requirement: SW-3 — Canonical spec-schema scaffolds

The system SHALL provide `templates/spec-schema/{intent,contract,roadmap,tasks,audit}.md`
as the canonical blank scaffolds the architect role emits, extracted
verbatim-in-shape from what was inlined in the architect prompt;
`intent.md`, `roadmap.md`, `tasks.md` are byte-identical to the architect's
inline blocks, `contract.md` differs only by neutralized prose, and
`audit.md` is a sanctioned superset carrying a trailing "Final Verdict"
section.

**Source:** canonical-role-templates · contract.md § "Spec-schema content contract"; audit.md C9, AL-2

#### Scenario: The architect role emits blank spec files
- **WHEN** the architect role emits a new feature's blank spec files
- **THEN** it emits exactly the content of `templates/spec-schema/*.md`,
  unchanged in shape

### Requirement: SW-4 — Per-tool spec-schema reachability

The system SHALL make each per-tool deployment of the architect role
responsible for keeping the spec-schema templates reachable (inlined,
bundled, or referenced by whatever path that tool's packaging uses) — a bare
relative path would dangle once the role body is emitted into a target repo.

**Source:** canonical-role-templates · audit.md AL-5 (closed)

#### Scenario: A generator emits an architect role artifact
- **WHEN** a generator emits an architect role artifact into a target repo
- **THEN** the spec-schema templates remain reachable from that artifact by
  an inlined, bundled, or correctly-referenced path

### Requirement: SW-5 — Single spec-schema deployment via CLI init

The system SHALL have `npx harny init` deploy `templates/spec-schema/*` to
`.sdd/spec-schema/` in the target repo exactly once even when several tools
are selected, byte-identical to the canonical source, closing AL-5 for every
generated pipeline.

**Source:** cli-skeleton · contract.md Behavior Guarantee 12; Integration Points "Closes prior audit finding AL-5"

#### Scenario: `npx harny init` runs with multiple tools selected
- **WHEN** `npx harny init` runs with multiple tools selected
- **THEN** `.sdd/spec-schema/` is written exactly once, byte-identical to
  `templates/spec-schema/*`

### Requirement: SW-6 — Single-source spec-schema path constant

The system SHALL have every generated role artifact's `harny:begin`/`harny:end`
block name `.sdd/spec-schema`, and that string SHALL be imported from
`src/engine.ts`'s `SPEC_SCHEMA_DIR` constant rather than re-literalled at each
generator call site.

**Source:** cli-skeleton · contract.md § Interfaces (`SPEC_SCHEMA_DIR`, :407); cursor-kiro-copilot-generators · contract.md Behavior Guarantee 8; codex-generator · contract.md Behavior Guarantee 9

#### Scenario: A generator renders a role artifact's harny:begin/harny:end block
- **WHEN** a generator renders a role artifact's `harny:begin`/`harny:end` block
- **THEN** it obtains the `.sdd/spec-schema` string via the shared
  `SPEC_SCHEMA_DIR` constant rather than a re-typed literal

### Requirement: SW-7 — Stamp-then-archive lifecycle

The system SHALL stamp a feature's spec directory `Shipped: <date>` in place
first, then move it via `harny-sync` archive mode to
`specs/archived/<feature>/`, byte-identical — superseding the prior "never
move" rule for the live Claude Code pipeline only.

**Source:** sdd-skill-library · contract.md § SUPERSEDES

#### Scenario: A feature's audit is approved and the human signs off
- **WHEN** a feature's audit is approved and the human signs off at the
  post-audit gate
- **THEN** its `intent.md` is stamped `Shipped: <date>` in place and
  `harny-sync` archive mode subsequently moves the directory to
  `specs/archived/<feature>/` unchanged

### Requirement: SW-8 — Reserved top-level feature names

The system SHALL treat `specs/current/` and `specs/archived/` as reserved
feature names; no feature directory may be named `current` or `archived`.

**Source:** sdd-skill-library · contract.md Behavior Guarantee 18

#### Scenario: A feature is proposed or archived under a reserved name
- **WHEN** a new feature is proposed, or a feature is archived, using the
  name `current` or `archived`
- **THEN** the operation is refused as a namespace collision

### Requirement: SW-9 — Flat current-state knowledge base layout

The system SHALL hold, under `specs/current/`, one flat `<capability>.md` file
per capability (in the OpenSpec-derived Requirement/Scenario format) plus a
fast-lookup `_index.md`; `specs/archived/<feature>/` SHALL hold an unedited
historical copy of a shipped feature's five spec files, plus a `decisions/`
subdirectory of ADRs.

**Source:** sdd-skill-library · contract.md § Amendment A3 (originally § Data Models; the earlier per-capability-subfolder shape was superseded by Amendment A3, human-authorized 2026-09-09 — see that section for the full history)

#### Scenario: An architect or `harny-sync` reads current-state truth
- **WHEN** `harny-sync` or an architect reads current-state truth for a
  capability
- **THEN** it reads a single flat file at `specs/current/<capability>.md`,
  with no per-capability subfolder involved

## Invariants

1. A spec file's document schema section headings must match `templates/spec-schema/*.md` (or `.sdd/spec-schema/*.md` in a scaffolded repo) exactly in shape; deviating without updating the schema is drift (the exact failure `canonical-role-templates` AL-2 found and reconciled).
2. Once a feature is archived, its five files are never edited again — only cited by their new `specs/archived/<feature>/` path (see the explicit, human-authorized exception in `sdd-skill-library/contract.md` § Amendment A3, which is a deliberate departure from this rule for that one artifact, not a repeal of it).
3. A feature directory named `current` or `archived` is a namespace collision and must be refused at propose time and at archive time.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-5-followup | A per-tool generator must keep `spec-schema/` reachable after deployment — resolved for `npx harny init` (SW-5) but not yet propagated to the `templates/` layer itself for a repo that doesn't scaffold via the CLI | LOW | canonical-role-templates · audit.md AL-5 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| canonical-role-templates | 2026-07-26 | The 5-file schema itself, extracted as `templates/spec-schema/*.md` |
| cli-skeleton | 2026-07-30 | Deployment of the schema into a scaffolded repo (`.sdd/spec-schema/`), the `SPEC_SCHEMA_DIR` single-source constant |
| sdd-skill-library | 2026-09-09 | The in-flight → archived lifecycle, `specs/current/` + `specs/archived/` layout, the SUPERSEDES decision |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| 0002 | Knowledge base taxonomy — specs/current/ and specs/archived/ | Accepted |
| 0003 | Amendment A2 — track all of specs/ | Accepted |
| 0004 | Non-mutation check — filtered absolute form | Accepted |
| 0007 | ADR storage and global monotonic numbering | Accepted |
| 0008 | Flat OpenSpec-derived capability format | Accepted |
