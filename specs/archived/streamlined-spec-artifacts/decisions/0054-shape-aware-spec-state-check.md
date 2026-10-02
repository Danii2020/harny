# ADR 0054: The doctor's spec-state check is shape-aware, keyed off checks.json

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: readiness-checks
- **Source**: contract.md § Interfaces SA-3; § Behavior Guarantees SA-8 to SA-11
- **Trigger**: (b) constrains future features; (a) a choice between named options

## Context

The spec-state family required five named files per feature dir. The new shape has
four, and `audit.md` does not exist until the audit runs. In-flight legacy dirs must keep
passing, and a runner shipped to a repo may meet an older `checks.json`.

## Decision

`checks.json` `specs` gains `legacySchemaFiles`, and `schemaFiles` lists only what the
architect writes (`intent`, `execution-plan`, `tasks`). A dir holding `contract.md` or
`roadmap.md` is legacy (including a dir that also holds `execution-plan.md`) and is
checked against `legacySchemaFiles`. Any other dir is checked against `schemaFiles`. If
`legacySchemaFiles` is absent (old `checks.json`), every dir uses `schemaFiles`, as
before. Shipped-but-unarchived detection is unchanged and needs `audit.md`.

## Alternatives considered

| Option | Why not |
|---|---|
| One fixed file list | Fails either every in-flight legacy dir or every new-shape dir |
| Detect shape by `execution-plan.md` alone | A both-shapes dir would be judged new and its legacy files unchecked |

## Consequences

**Positive**: both shapes pass, old configs behave as today. **Accepted costs**: the
runner keeps a legacy branch, and the shape rule is duplicated between `src/doctor.ts`
(emits the lists) and the runner (applies them).

## Follow-ups

None.
