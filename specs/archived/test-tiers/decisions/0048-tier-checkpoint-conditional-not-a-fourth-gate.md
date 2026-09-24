# ADR 0048: The tier-confirmation checkpoint is conditional, not a fourth human gate

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: test-tiers
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees TT-15, TT-16
- **Trigger**: (b) constrains future features (an invariant others must respect); (c)
  extends, without superseding, the existing three-gate invariant (`pipeline-roles`
  PR-6)

## Context

`pipeline-roles` PR-6 fixes the pipeline at exactly three human gates
(post-specs, post-red-tests, post-audit), and its Invariant 2 states that adding,
removing, or relocating a gate is a pipeline-behavior change. This feature adds a
point where the pipeline must pause for a human decision (tier and setup
confirmation), which risks being read as a fourth gate if modeled the same way as
the existing three.

## Decision

The checkpoint is modeled as a conditional step inside the test-writer stage, not a
`[HUMAN GATE ...]` entry in the conductor's diagram. It is described as an instance
of the conductor's pre-existing pause category "any decision only the human can
make" (scope), which already covered ad hoc scope questions before this feature. The
conductor's pipeline diagram keeps exactly three `[HUMAN GATE` entries in the same
order, and the summary sentence "Five roles, three human gates, one automatic
post-audit handoff" is extended, never replaced, to note the checkpoint is
conditional and not a gate.

## Alternatives considered

| Option | Why not |
|---|---|
| A fourth named gate ("post-tier-proposal") | Directly reopens `pipeline-roles` PR-6 Invariant 2 — a gate count/order change is explicitly out of scope for this feature (`intent.md` Non-Goals: "A fourth human gate") |
| Silently confirm on the test-writer's own judgment | Defeats G3's entire purpose (propose, then confirm, then write) and reintroduces the silent-install failure this feature exists to close |

## Consequences

**Positive**: the pipeline keeps its fixed, well-understood three-gate shape; no
downstream tooling or documentation that counts on "exactly three gates" needs to
change. The checkpoint still gets a first-class instruction (hard rule #6 in the
conductor) without inventing a new pause category.

**Accepted costs**: a human reading the pipeline diagram must notice the conditional
checkpoint line inside the test-writer stage rather than seeing it as a standalone
gate — slightly less visually prominent than a true gate, by design.

## Follow-ups

None.
