# ADR 0036: Raise `sdd-documentation` to `mid`; leave `cheapest` unoccupied rather than reassigning another role to it

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: documentation-role-completion
- **Capability**: pipeline-roles
- **Source**: contract.md § Interfaces item 2; § Behavior Guarantees RC-7, RC-8; § Amendments A-PR2, A-PR2b
- **Trigger**: (a) a choice between two or more named viable options; (c) supersedes/diverges from a previously shipped decision (`pipeline-roles` PR-2)

## Context

`pipeline-roles` PR-2 mapped `sdd-documentation` to `cost_tier: cheapest`, on the
rationale that the role does "no design and no independent verification of its own,
so it is pure synthesis/writing work." That premise was already inaccurate before
this feature (the role orchestrates a three-call knowledge-base hand-off) and became
plainly false once the role must additionally verify the archive landed before
reporting completion (`RC-9`). All three recorded tail-drop reproductions occurred on
the only role at `cheapest` — the only tier below `mid`.

## Decision

Raise `templates/roles/sdd-documentation.md`'s `cost_tier` from `cheapest` to `mid`,
with a corrected `cost_rationale` naming the verification duty as the reason. This
propagates to all five tools through each generator's existing tier→model map with
no generator source change. `COST_TIERS` at `src/vocabulary.ts:22` is untouched, and
the `cheapest` tier is not removed — it becomes unoccupied by the five default roles
and stays reachable via a `--model` override or a custom user-authored role. `pipeline-roles`
PR-2 is amended, not repealed: only the documentation clause changes; architect,
auditor, test-writer, and executor keep their existing tiers unchanged.

## Alternatives considered

| Option | Why not |
|---|---|
| Reassign a different role to `cheapest` to keep the tier occupied | No other role's rationale supports the cheapest tier's premise (pure synthesis, no verification); forcing occupancy for its own sake would misdescribe that role's actual work. |
| Remove `cheapest` from `COST_TIERS` entirely | Would break every generator's tier→model map and any existing `--model` override targeting it; an unoccupied tier is not a removed tier. |
| Leave `sdd-documentation` at `cheapest` and rely on L1 (the completion precondition) alone | L1's invocation is still an agent instruction; a cheaper, more failure-prone model is exactly where a dropped hand-off is more likely to also drop its own verification step. Tier and precondition are complementary, not substitutes — the contract states L2 explicitly as "reduces failure probability and explicitly not a bound." |

## Consequences

**Positive**: Failure probability at the source is reduced without touching any
generator; `pipeline-roles` PR-2's cost_rationale now accurately describes the role's
actual work; the amendment is declared explicitly rather than silently overwriting
PR-2 as if it were new.

**Accepted costs**: A `mid`-tier model can still drop a step — this is explicitly not
a bound on the failure rate (`RC-7`). Whether the probability reduction is
measurable is unverifiable from inside this one feature and needs several post-ship
runs (reservation `RC-R3`, human-gated).

## Follow-ups

None named beyond `RC-R3` (measuring L2's real-world effect over subsequent ships),
which is human-gated and outside this feature's own audit.
