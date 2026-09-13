# ADR 0009: Keep `allowed-tools` key uniformly across all skill roots

- **Status**: Accepted
- **Date**: 2026-09-13
- **Feature**: templates-skill-library-parity
- **Capability**: skill-library
- **Source**: contract.md § D1 (Resolved design decisions)
- **Trigger**: (b) constrains future features; (d) deliberately accepts a known cost (documentation-verified risk on Kiro)

## Context

This feature scaffolds eight `harny-*` skills to target repositories as real files written to each tool's native skill-discovery root. The portable Agent Skills specification (https://agentskills.io/specification) defines six frontmatter fields, including `allowed-tools` as an optional, experimental field. 

Kiro's documentation (https://kiro.dev/docs/skills/, verified 2026-09-09) publishes a subset of these fields (`name`, `description`, `license`, `compatibility`, `metadata`) and does not mention `allowed-tools`. The decision was forced: either every copy of a skill keeps `allowed-tools` (preserving whole-file identity across all roots), or Kiro's copy is stripped (forking content).

## Decision

Every `templates/skills/harny-*/SKILL.md` that declares `allowed-tools` keeps it in every copy, including the Kiro copy. All copies of a given skill remain byte-identical across all roots.

## Alternatives considered

| Option | Why not |
|---|---|
| Strip `allowed-tools` from Kiro copies only | Would fork skill content per destination, creating a second drift surface and losing the whole-file identity guarantee (`Gu 9`) that is the key load-bearing property of the fidelity contract. The `canonical-role-templates` AL-2 failure that this feature's G2 is designed to prevent shows the cost of duplication without fidelity checks. |
| Abandon `allowed-tools` entirely (remove from all roots) | Leaves the portable spec's six-key contract incompletely represented. `harny-standards` already ships without the key (proving it is optional), so removal is possible, but removal-only is a separate decision from this "keep uniformly" choice. |

## Consequences

**Positive**: 
- Whole-file identity to source is mechanically verifiable in a single `cmp` comparison, not a special case.
- Kiro documentation is silent on the key, not explicitly rejecting it, so the risk is documentation-verification uncertainty, not a known failure.
- All copies remain structurally identical, reducing the burden on future maintainers.

**Accepted costs**: 
- If `allowed-tools` is observed to break Kiro skill loading, the remedy requires coordinating a uniform removal across all roots.
- The risk is documentation-verified, not verified against a live Kiro install (standing, human-gated limitation `tool-generators.md` AL-30 already carries).
- Kiro's lack of explicit guidance on unrecognized keys means this carries an open reservation (recorded as SKP-1 / AL-P6 for comma-separated format issue).

## Follow-ups

- Close SKP-1 / AL-P6: re-verify `allowed-tools` format against the portable spec (space-separated, not comma-separated as currently shipped) and decide whether to convert uniformly or record the divergence explicitly.
- If Kiro support ever requires different key sets per root, revisit the fork-vs-uniform choice and record the new decision and its tradeoffs as a follow-up ADR.
