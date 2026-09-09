# ADR 0002: Knowledge base taxonomy — specs/current/ and specs/archived/

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: spec-workflow
- **Source**: contract.md § "The capability taxonomy, and why this one" + intent.md G7
- **Trigger**: (a) & (b) — chose this taxonomy over other viable structures; constrains future features to use it

## Context

Harny accumulates durable knowledge: every shipped feature is a 5-file spec, and rationale for significant decisions should be captured as Architecture Decision Records. The repo now has four shipped features (5,000+ lines across 20 files) plus a new knowledge-base feature. Every new feature's architect must learn what is currently true; every reader must know what is a historical record vs. active truth.

Three viable structures existed:

1. **Current + Archived** (chosen): `specs/current/` holds the live picture (five capability docs + index); `specs/archived/` holds byte-identical historical records of each shipped feature, never edited afterwards
2. **Monolithic index**: one large `specs/index.md` that catalogs all behavior from all shipped features; updated on each merge
3. **Feature specs only**: keep `specs/<feature>/` in place forever, add nothing else; architects read the codebase and the four feature specs

## Decision

Knowledge base is partitioned into two directories:

- `specs/current/` — the fast-lookup picture of current behavior. Five capability docs (spec-workflow, pipeline-roles, skill-library, cli-init, tool-generators) state the live implementation. Each doc lists current-behavior statements with provenance, invariants, open reservations, contributing features, and related ADRs. `_index.md` routes questions by keyword and registers all ADRs.
- `specs/archived/` — historical record. Every shipped feature gets a directory that is never edited after archival. Contains the original 5 files plus a `decisions/` subdirectory holding ADRs for that feature's significant choices.

## Alternatives considered

| Option | Why not |
|---|---|
| One monolithic index doc | Becomes a bottleneck as the repo grows; every merge modifies it; turns the decision log into a shared conflict point; harder to answer "what changed with feature X" without tracing through the whole index |
| Feature specs in place forever | Four architects already navigated 5,000 lines across four features to extract facts that should be stated once; makes it hard to enforce "never edit a shipped artifact" |
| Wiki or external tool | Dependencies and maintenance burden; loses traceability (contract/audit citations would break); requires context switching |

## Consequences

**Positive**:
- Architects can run `harny-sync` lookup to get binding context for new work
- Historical record is immutable by design
- Grow-ability — the index stays bounded (keyword lookup is at most 4 file reads)
- Rationale decisions are captured in ADRs, near the artifacts they govern
- Clear distinction: current truth is `specs/current/`, history is `specs/archived/`

**Accepted costs**:
- Maintenance overhead: each feature's archive requires updating the capability docs that it touches (the `harny-sync` archive mode does this)
- Knowledge can drift if a capability doc is not updated when a new feature ships
- ADRs cannot be backfilled for features shipped before this mechanism existed (the `harny-adr` skill forbids it)

## Follow-ups

**Named successor**: `templates-skill-library-parity` — propagate this taxonomy into `templates/` so generated pipelines also have `specs/current/` and `specs/archived/` structure.

**Standing pattern**: Every feature shipped going forward creates ADRs for significant decisions, with candidates evaluated against the four significance criteria in `harny-adr/SKILL.md` § "Judge significance".
