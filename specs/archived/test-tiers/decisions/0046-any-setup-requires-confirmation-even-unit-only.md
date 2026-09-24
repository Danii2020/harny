# ADR 0046: Any setup requires confirmation, even for a unit-only plan

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: test-tiers
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees TT-9
- **Trigger**: (a) a choice between two named viable options; (b) constrains future
  features (a rule others must obey)

## Context

The test-writer needed an exact rule for when the new tier-confirmation checkpoint
fires. The obvious option was "confirm only when the plan proposes a tier beyond
`unit`" — treating a unit-only plan as always safe to proceed without a pause. But a
unit-only plan can still need to bootstrap a test framework, add a dev dependency, a
config file, or a script, none of which the test-writer should install unconfirmed.
The architect brought this question to the human explicitly at the post-specs gate
(Q1) rather than assuming an answer.

## Decision

Confirmation is required if and only if the plan contains a tier other than `unit`,
**or** any row's "Setup needed" is not `none` — so a unit-only plan that would still
bootstrap a framework or add setup also asks. Only a plan that is both unit-only and
needs zero setup skips the checkpoint, recorded as
`**Plan status**: NOT REQUIRED (unit-only, no setup)`.

## Alternatives considered

| Option | Why not |
|---|---|
| Confirm only when a non-`unit` tier is proposed | Leaves a unit-only plan free to install a dev dependency, a config file, or a script with no human awareness — the exact silent-install failure mode the feature exists to close |
| Never ask for setup, only for tier | Would let the test-writer bootstrap arbitrary tooling as long as it stayed in `unit`, undermining G3 ("propose, then confirm, then write") |

## Consequences

**Positive**: nothing is ever installed into a downstream project without an explicit
human decision, regardless of which tier proposed it. The rule is a single sentence
the skill, the role and the conductor can all state identically (TT-17 token parity).

**Accepted costs**: a unit-only feature that merely needs its first test framework
bootstrapped now pauses once, even though no integration or e2e risk is present. This
was the human's explicit tradeoff (Q1, "ask the user as well"), not an oversight.

## Follow-ups

None.
