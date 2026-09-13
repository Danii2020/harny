# ADR 0010: GitHub Copilot skills route to `.agents/skills/` unconditionally

- **Status**: Accepted
- **Date**: 2026-09-13
- **Feature**: templates-skill-library-parity
- **Capability**: tool-generators
- **Source**: contract.md § D2 (Resolved design decisions)
- **Trigger**: (a) choice between three named, documented options; (b) constrains future tool integrations

## Context

GitHub Copilot documents three valid skill-discovery roots: `.github/skills`, `.claude/skills`, and `.agents/skills` (https://docs.github.com/en/copilot/concepts/agents/about-agent-skills, verified 2026-09-09). A choice among these three was forced by the design principle that each tool's `skillsDir` is a fixed per-generator constant (not context-dependent), which is the natural generalization of how `agentsDir` and `conductorPath` already work.

Selecting `.agents/skills/` means one written copy serves three tools (Cursor, Codex, and Copilot), which maximizes the dedup benefit that makes per-tool placement worthwhile.

## Decision

`githubCopilotGenerator.skillsDir` is the constant `.agents/skills/`. It is never `.claude/skills`, and it never varies with which other tools are selected (`config.tools` is not consulted).

## Alternatives considered

| Option | Why not |
|---|---|
| `.claude/skills` | Breaks per-tool composability: `--tools github-copilot` alone would write to `.claude/`, a namespace belonging to a tool the user did not request. Also creates false conflicts with later `--tools claude-code` runs. |
| Context-dependent (`.claude/skills` if Claude Code is selected, `.agents/skills` otherwise) | Violates the principle that each generator's constants are self-contained. Output would remain deterministic, but the write plan would become unexplainable per tool and every test would need the full selection context. Matches the rejected non-goal of context-dependent `skillsDir`. |
| `.github/skills` only | Loses the dedup opportunity: Cursor, Codex, and Copilot would each get their own copy, tripling the written skill files unnecessarily. |

## Consequences

**Positive**:
- Maximizes dedup: `.agents/skills/` is read by three of five tools, so one copy serves the majority.
- Per-tool composability: `--tools github-copilot` produces the same paths as `--tools claude-code,github-copilot`, making output per-tool-explainable.
- No cross-namespace writes: Copilot does not write to namespaces of unselected tools.
- Fixed per-generator constant: Matches the design of `agentsDir` and `conductorPath`.

**Accepted costs**:
- Copilot shares the `.agents/` namespace with two other tools, so the skills are not Copilot-exclusive.
- The choice is documented, not self-evident from the discovery roots.

## Follow-ups

None; the decision is closed.
