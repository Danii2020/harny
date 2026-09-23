# ADR 0031: A declared write root on `GeneratedFile`, never a weakened `assertContained`

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: ci-workflow-root
- **Capability**: cli-init
- **Source**: contract.md § Interfaces, § Behavior Guarantees (WR-1–WR-5)
- **Trigger**: (b) constrains future features — a rule and invariant others must obey

## Context

The feature must write one artifact (the CI workflow) to the repository root, not the install directory, because GitHub Actions reads workflow files only from `.github/workflows/` at the repository root. Every other artifact belongs in the install directory.

`src/writer.ts:19` implements `assertContained`, a guard that throws if a generated path is absolute or resolves outside `targetDir`. This guard is load-bearing — it is the reason a buggy generator cannot write arbitrary files. Weakening it to permit an exception would make that exception silent and invitation to future abuse.

The alternative to weakening the guard is to declare which files escape, and declare it within the file description itself — the `GeneratedFile` interface.

## Decision

The system declares an optional `root?: 'repo'` member on `GeneratedFile`. Absent (the default for every artifact written before this feature and for every artifact except one) means the install directory. `'repo'` means the enclosing git repository's root. `assertContained` is never edited; instead, it is called against the root each file declares.

## Alternatives considered

| Option | Why not |
|---|---|
| Weaken `assertContained` to a conditional guard | Silences the escape; invitation to future abuse; violates `AGENTS.md` S2 (a containment violation is a generator bug, not a user error) |
| Hard-code the workflow path in the renderer without a declaration | Still escapes without a named marker; grep cannot prove only one artifact does so |
| Persist the install's position to `.sdd/harness.json` as a second source of truth | Staleness after a directory move; the placement is a pure function of the filesystem, re-derivable in microseconds with no clock or network dependency |
| Make the declaration a method/function on `Generator` (tool-specific) | Placement is not a per-tool fact — it is the same for all five tools in one install — so it has no business in the interface `ADRs 0011/0025/0027` reserve for per-tool facts |

## Consequences

**Positive**: 
- Exactly one artifact in all of `src/` declares the non-default root, and a grep test bounds that count.
- `assertContained` stays intact and universal — every file still validates against its declared root.
- The escape is auditable: a reader can find `root: 'repo'` and understand the intent.
- Forward-compatible: a future feature can add fields to `CiPlacement` (e.g., `components: [{path, stack}]`) without changing the `root` declaration mechanism.

**Accepted costs**: 
- Adds one optional member to `GeneratedFile`, widening the interface slightly.
- Every consumer that builds a `WritePlan` must supply the repository root (though it defaults to `targetDir`, reproducing pre-feature behavior).

## Follow-ups

None. The mechanism is complete.
