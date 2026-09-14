# ADR 0016: harny-feedback as core-tier skill

- **Status**: Accepted
- **Date**: 2026-09-14
- **Feature**: agent-feedback-controls
- **Capability**: skill-library
- **Source**: contract.md § SC9, SC9a
- **Trigger**: (b) — constraint on future skill tiering (core always scaffolded, optional via `--skills`); (d) — accepts the design decision that feedback is non-optional

## Context

The `harny-feedback` skill provides the mapping from `config.stack` to feedback commands, the per-tool hook wiring, and the CI gate configuration. Before this feature, `harny-adr` and `harny-standards` were the only optional skills, and all others (propose/test/implement/audit/document/sync) were core (always scaffolded). The question was whether feedback should be optional (selectable via `--skills`) or core (always scaffolded regardless of flags).

## Decision

`harny-feedback` is placed in the core tier (`CORE_SKILL_IDS`), making it the seventh core skill. Every scaffolded repository receives it, even with `--skills none`. The rationale is that feedback (per-turn hooks and CI gates) is a first-class part of the SDD harness: it closes the loop on agent self-correction, the same way auditing does. Just as `harny-audit` is core (always present), feedback is non-optional infrastructure.

## Alternatives considered

| Option | Why not |
|---|---|
| Make `harny-feedback` optional, like `harny-adr` and `harny-standards` | Feedback (hooks + CI) is as fundamental to the harness as auditing; an agent harness without feedback is crippled. Optional skills are for extensions (ADRs, coding standards) that add depth to standard workflows; feedback is not an extension. |
| Split feedback into two skills: hooks (core) and CI (optional) | Would complicate the mapping from stack to commands; the stack is used by both surfaces, so it belongs in one skill |

## Consequences

**Positive**: 
- Every scaffolded repo has feedback infrastructure (per-tool hooks + CI) without extra flags
- The seven-core/two-optional split reflects the SDD pipeline roles (five roles + audit/feedback feedback loop + two optional extensions)
- Stack profile configuration is always available, even to repos that haven't enabled a specific tool yet

**Accepted costs**: 
- A downstream repo that doesn't want feedback must explicitly delete the skill, rather than not scaffolding it
- Feedback mapping code is imported even by downstream projects that may not use it yet (low cost: the module has zero runtime dependencies)

## Follow-ups

None.

