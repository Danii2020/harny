# ADR 0053: The tier-confirmation checkpoint becomes a stop rule for gaps in § Validation (amends ADR 0048)

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees SA-7; § Error Handling Contract
- **Trigger**: (c) diverges from a previously shipped decision (ADR 0048, PR-12)

## Context

ADR 0048 made the tier checkpoint a conditional step inside the test-writer stage, not a
fourth gate, via conductor hard rule 6. With the plan approved at the spec gate
(ADR 0052), a routine confirmation after the fact is redundant.

## Decision

Conductor hard rule 6 and the checkpoint are removed. The test-writer stops only when it
needs a tier or setup that § Validation does not name: it writes nothing more and
reports first line `TEST PLAN AWAITING CONFIRMATION`, naming the gap. The conductor asks
the human and relays the answer. The three-gate count and order are unchanged, and the
stop is still not a gate. The auditor flags a test at an unnamed tier, a named tier with
no tests, and unnamed setup, using the existing severity buckets (ADR 0049 stands).

## Alternatives considered

| Option | Why not |
|---|---|
| Keep the checkpoint for every run | Re-asks what the human approved at the spec gate |
| Let the test-writer add tiers silently | Reopens the silent-install failure `test-tiers` closed |

## Consequences

**Positive**: no routine pause; the pause survives only where the approved plan is
silent. **Accepted costs**: PR-12's checkpoint requirements are retired and replaced; the
`TEST PLAN AWAITING CONFIRMATION` token is kept for the stop rule.

## Follow-ups

ADR 0048 is marked Amended by this ADR.
