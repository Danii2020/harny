# Capability: spec-workflow

> Last synced: 2026-09-08. Owned artifacts: `templates/spec-schema/*.md`,
> `.sdd/spec-schema/*.md` (deployed by `npx harny init`), the 5-file spec schema
> conventions themselves, the in-flight → archived lifecycle under `specs/`.

## Purpose

The document schema every SDD feature is authored against — five files
(`intent.md`, `contract.md`, `roadmap.md`, `tasks.md`, `audit.md`), their
traceability rules, task states, and audit verdict enum — plus, as of this
feature, the lifecycle a feature's spec directory follows from in-flight to
archived.

## Current behavior

> Present tense. Stable IDs — never renumbered; retired statements are struck,
> not deleted.

| ID | Statement | Provenance |
|---|---|---|
| SW-1 | Every feature gets a directory `specs/<feature-name>/` with exactly five files: `intent.md` (why), `contract.md` (what), `roadmap.md` (how), `tasks.md` (granular checklist, states `[ ]`/`[x]`/`[~]`/`[!]`), `audit.md` (compliance tracking + final verdict) | canonical-role-templates · contract.md § "Data Model — the canonical role-file document schema" |
| SW-2 | Traceability is mandatory and reflexive: every `contract.md` item cites an `intent.md` goal; every `tasks.md` item cites a `roadmap.md` phase; every `audit.md` item cites `intent.md` or `contract.md` | canonical-role-templates · contract.md § Interfaces; audit.md R8 |
| SW-3 | `templates/spec-schema/{intent,contract,roadmap,tasks,audit}.md` are the canonical blank scaffolds the architect role emits, extracted verbatim-in-shape from what was inlined in the architect prompt; `intent.md`, `roadmap.md`, `tasks.md` are byte-identical to the architect's inline blocks, `contract.md` differs only by neutralized prose, and `audit.md` is a sanctioned superset carrying a trailing "Final Verdict" section | canonical-role-templates · contract.md § "Spec-schema content contract"; audit.md C9, AL-2 |
| SW-4 | A per-tool deployment of the architect role is responsible for keeping the spec-schema templates reachable (inlined, bundled, or referenced by whatever path that tool's packaging uses) — a bare relative path would dangle once the role body is emitted into a target repo | canonical-role-templates · audit.md AL-5 (closed) |
| SW-5 | `npx harny init` deploys `templates/spec-schema/*` to `.sdd/spec-schema/` in the target repo exactly once even when several tools are selected, byte-identical to the canonical source, closing AL-5 for every generated pipeline | cli-skeleton · contract.md Behavior Guarantee 12; Integration Points "Closes prior audit finding AL-5" |
| SW-6 | Every generated role artifact's `harny:begin`/`harny:end` block names `.sdd/spec-schema`, and that string is imported from `src/engine.ts`'s `SPEC_SCHEMA_DIR` constant rather than re-literalled at each generator call site | cli-skeleton · contract.md § Interfaces (`SPEC_SCHEMA_DIR`, :407); cursor-kiro-copilot-generators · contract.md Behavior Guarantee 8; codex-generator · contract.md Behavior Guarantee 9 |
| SW-7 | **(this feature)** A feature's spec directory is stamped `Shipped: <date>` in place first, then moved by `harny-sync` archive mode to `specs/archived/<feature>/`, byte-identical — superseding the prior "never move" rule for the live Claude Code pipeline only | sdd-skill-library · contract.md § SUPERSEDES |
| SW-8 | **(this feature)** `specs/current/` and `specs/archived/` are reserved feature names; no feature directory may be named `current` or `archived` | sdd-skill-library · contract.md Behavior Guarantee 18 |
| SW-9 | **(this feature)** `specs/current/` holds one `capability.md` per capability plus a fast-lookup `_index.md`; `specs/archived/<feature>/` holds an unedited historical copy of a shipped feature's five spec files, plus (from this feature forward) a `decisions/` subdirectory of ADRs | sdd-skill-library · contract.md § Data Models |

## Invariants

1. A spec file's document schema section headings must match `templates/spec-schema/*.md` (or `.sdd/spec-schema/*.md` in a scaffolded repo) exactly in shape; deviating without updating the schema is drift (the exact failure `canonical-role-templates` AL-2 found and reconciled).
2. Once a feature is archived, its five files are never edited again — only cited by their new `specs/archived/<feature>/` path.
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
| sdd-skill-library | (this feature) | The in-flight → archived lifecycle, `specs/current/` + `specs/archived/` layout, the SUPERSEDES decision |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| (none yet — this feature is the first to earn ADRs; see `harny-adr`) | | |
