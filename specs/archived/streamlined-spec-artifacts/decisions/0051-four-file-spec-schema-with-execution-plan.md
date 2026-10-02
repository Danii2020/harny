# ADR 0051: The spec schema is four files; execution-plan.md replaces contract.md and roadmap.md

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: spec-workflow
- **Source**: contract.md § Interfaces SA-1, SA-2, SA-14; § Behavior Guarantees SA-5, SA-6
- **Trigger**: (a) a choice between named options; (c) supersedes the five-file schema (`spec-workflow` SW-1 to SW-3)

## Context

The architect wrote five files per feature. Together they were too long for one person
to review at the spec gate, which weakens the human control the gates exist for.
`contract.md` and `roadmap.md` overlapped in content and restated each other.

## Decision

The schema is `intent.md`, `execution-plan.md`, `tasks.md`, `audit.md`. The architect
writes the first three and never `audit.md`. `execution-plan.md` carries Ownership,
Binding constraints (each with a source), a revisable Proposed approach, Consumers and
migration, Risks and Validation. `intent.md` states outcomes and ACs; internal names and
signatures stay out of it. `SPEC_SCHEMA_NAMES` lists the four names, `harny init` deploys
exactly those, and no role, skill or conductor text names `contract.md` / `roadmap.md`
except one legacy-shape note. A directory holding either old file is a legacy feature,
read in place of `execution-plan.md` (see ADR 0054 for the doctor rule).

## Alternatives considered

| Option | Why not |
|---|---|
| Keep five files and shorten each | Leaves the contract/roadmap overlap and still asks for two documents where one binds and one is revisable |
| Migrate archived and in-flight specs to the new shape | Archived specs are never edited (`spec-workflow` Invariant 2); in-flight legacy specs must keep passing |

## Consequences

**Positive**: one binding-versus-revisable document to review; fewer cross-file
traceability rules. **Accepted costs**: two shapes coexist indefinitely, so every
reader (doctor, archive, roles) carries a legacy branch.

## Follow-ups

None.
