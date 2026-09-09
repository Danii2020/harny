# ADR 0007: ADR storage and global monotonic numbering

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: spec-workflow
- **Source**: contract.md § harny-adr (guarantees 17, 24) + intent.md G5, problem statement item 4
- **Trigger**: (b) & (d) — constrains future ADR numbering and storage; records the decision to forbid backfill

## Context

This repo has four shipped features, each generating valuable design decisions. Before this feature, that rationale lived only in archived audit logs — findings like AL-9 (no single tool's mechanic may be sole in portable content) were durable but stranded in a table row. A future reader exploring the codebase would not discover them.

The obvious solution is Architecture Decision Records: one file per significant decision, stored with the feature that made it, numbered to prevent collisions. But:

1. Where should ADRs live — with the feature, or in a centralized decisions/ directory?
2. Should ADR numbers be global (0001, 0002, ...) or per-feature (feature-0001, feature-0002)?
3. Should backfill be allowed for the four already-shipped features?

## Decision

ADRs are stored at `specs/archived/<feature>/decisions/NNNN-<slug>.md`, where `NNNN` is a zero-padded 4-digit number, globally monotonic across the entire repo. Numbering starts at 0001 for this feature (the first to generate ADRs); each subsequent feature continues the sequence.

Backfill is forbidden: the four features shipped before this mechanism existed get no ADRs retroactively. Their rationale already exists in archived contracts and audits; reconstructing it risks inventing it. New features going forward generate ADRs per the four significance criteria.

The `harny-adr` skill encodes:
- The four significance criteria (a)-(d)
- The 7-per-feature cap
- Global monotonic numbering by scanning `specs/archived/*/decisions/*.md`
- Registry update (each ADR is added to `specs/current/_index.md`'s § Decisions table)
- The no-backfill rule

## Alternatives considered

| Option | Why not |
|---|---|
| Centralized `decisions/` directory at repo root | Loses the connection between an ADR and the feature that generated it; harder to find related decisions; makes it hard to enforce "never edit an archived artifact" (the ADRs would not be with the feature) |
| Per-feature numbering (feature-0001, feature-0002) | Requires a mapping to prevent collisions across features; global numbering is simpler and makes it easier to cite ("ADR 0042") without context |
| Allow backfill for the four existing features | Risk of reconstructing rather than recording actual rationale; the original decision-making context is lost; the audit logs and contracts already capture the reasoning |

## Consequences

**Positive**:
- Decisions are discoverable co-located with the features that made them
- Global numbering is simple (one sequence, no mapping needed)
- Monotonic numbering means a reader can cite "ADR 0042" without ambiguity
- Forbidding backfill protects against retroactive rationalization; rationale is captured when decisions are made, not reconstructed later
- The registry in `_index.md` makes all ADRs discoverable and queryable

**Accepted costs**:
- The first four features have no ADRs, even though they have valuable decisions (recorded in contracts and audits, not as ADRs)
- ADRs are scattered across multiple feature directories, not in one place; discovery requires reading the index or scanning `specs/archived/*/decisions/`
- A race condition is theoretically possible if two features are archived simultaneously with ADRs needing the same number (mitigated by: in practice, features are archived one at a time; the `harny-adr` skill rescans before numbering if it detects a collision)

**Design constraints**:
- ADR numbers are never reused or renumbered; if an ADR is superseded, its status changes but the number stays (per template constraint)
- ADR status can be: Accepted, Superseded by ADR <NNNN>, or Deprecated (recorded in the Status header)

## Follow-ups

**Stability check**: if this numbering scheme holds through 10+ features, we will have confirmed that global monotonic numbering works and the ADR registry scales.

**Named successor**: future features will continue this pattern, with each feature's architect and auditor identifying significant decisions and the `harny-adr` skill generating the records.

**Related ADRs**: ADR 0002 (knowledge base taxonomy) explains how the ADR registry fits into the knowledge base structure; ADR 0001 and the others in this feature are the first ADRs generated under this decision.
