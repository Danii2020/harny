# ADR 0003: Amendment A2 — track all of specs/ in version control

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: spec-workflow
- **Source**: contract.md § Amendment A2 + roadmap.md Phase 1 step 9
- **Trigger**: (c) & (d) — diverges from original approach; deliberately accepts the cost of tracking in-flight work

## Context

The original contract (intent.md problem statement, roadmap Phase 1) proposed a split git-tracking strategy:

- Track: `specs/current/` (knowledge base) and `specs/archived/` (historical record)
- Ignore: `specs/<feature>/` (in-flight feature specs, until moved to archived)

The rationale was: in-flight feature specs are transient; they live in the repo directory only during work; once archived, they become durable. Why track transient files?

During Phase 3 (building the knowledge base), auditor observation and working through `harny-sync` semantics revealed a problem: the split creates a subtle inconsistency. When a new feature is proposed, its `specs/<feature>/contract.md` is not tracked, but `harny-sync` lookup reads it during the propose step. This means a repo on a branch with uncommitted specs might be in a state where the current knowledge base and the current working specs disagree.

Amendment A2 changed the decision: **track all of `specs/`**, including in-flight feature work. The working assumption shifted from "in-flight specs are transient and unimportant" to "specs are artifacts of development and valuable to track alongside code."

## Decision

The `.gitignore` now includes all of `specs/` — both the knowledge base (`current/`, `archived/`) and in-flight feature directories (`specs/<feature-name>/`). This means a fresh clone contains the full knowledge base plus any branches' feature work. The `.claude/agents/` directory remains local and untracked (gitignored), and `.claude/settings.local.json` remains local.

## Alternatives considered

| Option | Why not |
|---|---|
| Original split (track current+archived only) | Creates a git state where in-flight specs are not tracked but `harny-sync` reads them; future `harny-propose` lookups can see stale in-flight work; subtle inconsistency between what git knows and what the feature process sees |
| Track nothing in specs/ | Loses all history; every clone is a restart; loses the audit trail and decision log |
| Track only in-flight specs | Doesn't protect the knowledge base; defeats the purpose of a durable record |

## Consequences

**Positive**:
- Consistency: git state and active specs state are in sync
- All feature work (including specs) is versioned alongside code
- A feature branch carries its complete spec history
- No hidden state: everything the develop process reads is tracked
- Enables future tools to analyze feature specs without reconstruction

**Accepted costs**:
- In-flight specs take up disk space even after a feature is shelved (mitigated by: specs are small; branches can be deleted)
- Shallow clones become less valuable, since the full spec history is now part of the main tree
- The working repository is "noisier" (contains not just code but also planning artifacts)

## Follow-ups

**Related**: ADR 0001 (symlink bridge) and ADR 0002 (specs taxonomy) both depend on this decision. If specs were not tracked, the symlink bridge would point at nothing on a fresh clone, and the archived copy would become stale.

**Open reservation**: AL-S14 — the knowledge base statement `SL-10` in `specs/current/skill-library/capability.md` still describes the superseded split behavior as current truth. Must be corrected in place during the `harny-sync` index regeneration (Task 5.9 step 4).
