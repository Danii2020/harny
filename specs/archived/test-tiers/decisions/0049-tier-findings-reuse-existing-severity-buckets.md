# ADR 0049: Tier findings map onto the auditor's existing severity buckets

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: test-tiers
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees TT-28; intent.md G7
- **Trigger**: (b) constrains future features (the severity vocabulary stays closed);
  (c) extends, without superseding, the auditor's existing verdict model

## Context

Giving the auditor tier awareness (G7, added at the post-specs gate) meant deciding
how a tier-related problem — an unconfirmed e2e test, a confirmed tier with no
tests, unnamed setup, a plan stuck at `PROPOSED` — should be rated. A new,
tier-specific severity scale was one option; reusing the shipped auditor's existing
CRITICAL/HIGH/MEDIUM/LOW buckets and their existing definitions was the other.

## Decision

Every tier finding is mapped onto one of the four existing buckets, using their
existing definitions verbatim (for example, "a confirmed tier with no tests" reuses
the existing "missing test coverage for a contract item" HIGH definition). No tier
finding is CRITICAL on its own. The verdict enum (`APPROVED` /
`APPROVED WITH RESERVATIONS` / `REJECTED`) and its rules are unchanged; a HIGH tier
finding influences the verdict the same way any other HIGH finding already did.

## Alternatives considered

| Option | Why not |
|---|---|
| A fifth, tier-specific severity scale | Would fork the auditor's verdict model in two, forcing every future consumer of `audit.md` findings to understand two rating systems; `intent.md` Non-Goals explicitly rules out "changing the auditor's verdict model" |
| Leave tier problems unrated (informational only) | Findings would not feed the verdict at all, silently weakening the auditor's post-audit gate for exactly the risk this feature exists to catch |

## Consequences

**Positive**: one severity vocabulary for the whole auditor, so a human reading a
verdict does not need to learn a second rating scale. The mapping table (TT-28) is a
single pinned artifact, shared byte-for-byte between the skill and the role, with a
parity test.

**Accepted costs**: the four existing bucket definitions were not written with test
tiers in mind, so some mappings (for example, rating an unrunnable tier LOW rather
than a dedicated "unverified" status) are a best fit rather than a purpose-built
category.

## Follow-ups

None.
