# ADR 0043: A sub-agent's stop runs the ordinary runner with `--keep-turn`, giving at-least-once delivery

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: subagent-feedback-hooks
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (SF-2, SF-3, SF-4, SF-8); roadmap.md Phase 1
- **Trigger**: (b) constrains future features — `run` gains a second boolean flag that every later runner change must honor; (d) deliberately accepts duplicate lint runs and duplicate findings per conductor turn

## Context

Before this feature, the runner fired only at the main agent's turn completion. In a
conductor-driven pipeline, every real edit happens inside a sub-agent, so findings
reached only the conductor, after the sub-agent had already handed back. Wiring the
sub-agent's own completion event to the runner raises one question: what happens to
the turn file? `run` deletes it at the end. If a sub-agent's stop consumed it, the
parent's own run would see nothing, and any finding the sub-agent ignored would never
reach the conductor.

## Decision

The sub-agent registration invokes the same runner, in the same `run` mode, with the
same inline `--commands` payload as the turn-completion registration, plus one new
boolean flag, `--keep-turn`. That flag changes exactly one thing: the turn file is
not deleted. The parent's later run without the flag reads the same paths and
deletes the file as before. The flag has no effect under `--whole-project`, which
reads no turn state. Nothing in the runner branches on "this was a sub-agent".

## Alternatives considered

| Option | Why not |
|---|---|
| Sub-agent run consumes the turn file (plain `run`) | A finding the sub-agent ignores is never reported to the conductor: consumed and dropped. That breaks intent.md G3. |
| A third runner mode (e.g. `run-subagent`) | Breaks the `accumulate \| run` vocabulary. The `--whole-project` precedent (agent-feedback-controls A1) already set "boolean flag on `run`, never a third mode". |
| Consume Cursor's `subagentStop` `modified_files` as a second path source | Two sources of touched paths for one runner. Explicitly a non-goal in intent.md. |
| Sub-agent run deletes only the paths it checked | Needs per-path bookkeeping and makes the runner stateful across events, for no gain over at-least-once delivery. |

## Consequences

**Positive**: The sub-agent sees findings on its own work while it can still fix them.
No finding the conductor saw before is lost. The whole mechanism is one boolean and
one guarded `rmSync`.

**Accepted costs**: Each conductor turn may lint the same files twice, and a finding
may be reported twice (to the sub-agent, then to the conductor). The error-handling
table states it: delayed or duplicated, never lost.

## Follow-ups

None required. Reaping turn files orphaned by an earlier run remains a stated non-goal.
