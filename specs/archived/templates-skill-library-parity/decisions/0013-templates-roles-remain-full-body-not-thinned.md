# ADR 0013: Template roles retain full bodies; no thinned pointer layer in `templates/`

- **Status**: Accepted
- **Date**: 2026-09-13
- **Feature**: templates-skill-library-parity
- **Capability**: pipeline-roles
- **Source**: contract.md § G6 (Goals), intent.md § Problem Statement item 2
- **Trigger**: (a) explicit choice between two design options; (b) constrains architecture for scaffolded repos

## Context

The live harny pipeline uses thin agents (≤ 25 lines each) that delegate to reusable skills for instruction bodies. When this feature scaffolds skills to a target repository, the question arose: should `templates/roles/sdd-*.md` remain full bodies (as they are today), or should the templates gain a thinned-role layer mirroring `.claude/agents/sdd-*.md`'s pointer shape?

A thinned-role layer would reduce duplication in scaffolded output (one instruction copy per tool instead of two: the role file and the invoked skill). However, it would also require maintaining two versions of each role body in the repo (`templates/roles/` full and `templates/` thinned), creating the exact drift surface this feature's G2 is designed to prevent.

## Decision

`templates/roles/sdd-*.md` continue to ship unchanged, retaining full instruction bodies. No thinned pointer layer is added to `templates/`. Scaffolded repositories receive both the full role file and the invoked skill, accepting the redundancy in service of instruction durability.

## Alternatives considered

| Option | Why not |
|---|---|
| Add thinned `templates/roles/` and `templates/skills/` pairs | Creates a second drift surface: the full role bodies and their thin-pointer mirrors could diverge without detection. The `canonical-role-templates` AL-2 failure shows the cost of duplicate instruction copies. Guarding both layers would double the fidelity-test burden. |
| Thin the live pipeline's role bodies in `.claude/agents/` to match a new `templates/` thinned layer | Out of scope for this feature; `templates/` is meant to be a copy of today's portable content, not a redesign target. Future thinning is a separate decision. |

## Consequences

**Positive**:
- No new drift surface: `templates/roles/` stays as-is, single-sourced and stable.
- Scaffolded repos have full instructions in every role file, so missing-skill degradation (per `skill-library.md` SL-5) still leaves the instructions readable and complete.
- Simpler tooling: no need to maintain or test two parallel role bodies in `templates/`.
- Aligns with non-goal G6: "no thinned layer in `templates/`".

**Accepted costs**:
- Redundancy: a scaffolded repo receives both the full role body and the invoked skill's body (two copies of the same instructions).
- The repository's own code maintainers must update both places if they customize a role (the role file and the skill), or coordinate via the skill only.
- Higher storage footprint in scaffolded repos (multiple copies of the same instructions).

## Follow-ups

**Follow-up feature `templates-thin-roles`**: A future, gated redesign of the portable `templates/` layer could introduce thin pointers and thinned instruction bodies, with explicit migration guidance for existing scaffolded repos. That redesign is deferred pending resolution of open reservations AL-30 and CG-1/O4 (live Cursor/Kiro/Copilot verification).

**For now, the `skill-library.md` SL-5 degradation mode**: if a skill fails to load or is policy-disabled, the scaffolded repo still has the full instructions in the role file, so the workflow degrades to redundancy, not instruction loss.
