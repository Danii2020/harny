# ADR 0044: Wire a sub-agent completion event only where first-party documentation confirms it

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: subagent-feedback-hooks
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (SF-5, SF-7), § Verified per-tool facts, § Open questions
- **Trigger**: (b) constrains future features — a sixth tool, or a later Kiro/Copilot change, must meet the same evidence bar; (d) accepts four unverified per-tool questions as open reservations rather than guesses

## Context

Three of the five tools (Claude Code, Cursor, Codex CLI) document a sub-agent
completion event with the same shape and findings channel as their turn-completion
event. Kiro documents none. GitHub Copilot's reachable first-party docs never mention
`subagentStop`, and they describe a hooks shape that disagrees with what harny
already ships. Even on the three documented tools, two behaviors are unconfirmed:
whether Cursor's `afterFileEdit` fires inside a sub-agent, and whether a Codex
sub-agent's edits and its stop resolve the same `turn_id`.

## Decision

Register `SubagentStop` (Claude Code), `subagentStop` (Cursor) and `SubagentStop`
(Codex CLI), each in the hook file that tool already generates, in its already-shipped
entry shape. Leave Kiro's and GitHub Copilot's generated hook files byte-identical.
Record every unconfirmed behavior as an open question paired with a single stated
probe (list `.sdd/feedback/.turns/` before and after a sub-agent writes one file),
never as a claim. `resolveTurnKey`'s precedence is not changed.

## Alternatives considered

| Option | Why not |
|---|---|
| Wire all five tools by analogy | Kiro and Copilot events would be guesses. Copilot's shipped hook shape is itself in question (AL-30/R5 class). |
| Change `resolveTurnKey` to prefer `session_id` over `turn_id` | Alters main-agent behavior on every tool to fix a Codex case that is not yet known to exist. Wiring the sub-agent's own stop makes the question moot where it matters. |
| Wait until all four open questions are probed live | Blocks a verified improvement on Claude Code on questions that cannot make the new registration wrong, only inert. |

## Consequences

**Positive**: Every wired registration rests on documented behavior. A registration
whose event never fires, or fires under another key, is inert rather than wrong: the
parent's turn-completion run still covers those paths, and CI still catches them.

**Accepted costs**: On Cursor and Codex the new registration may be inert until the
probe runs. Kiro and Copilot users get no sub-agent-time feedback.

## Follow-ups

Run the `.turns/` probe live on Codex (open question 1) and Cursor (open question 2).
Revisit Copilot's hook shape (open question 3) and Kiro (open question 4) when
first-party documentation appears.
