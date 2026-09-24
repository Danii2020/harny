# ADR 0045: Claude Code's wrapper takes the event name as a parameter; Cursor and Codex share one argv-forwarding wrapper

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: subagent-feedback-hooks
- **Capability**: tool-generators
- **Source**: contract.md § Interfaces, § Behavior Guarantees (SF-2, SF-6); roadmap.md Phase 2
- **Trigger**: (a) records a choice between a per-event script and a shared script; (b) constrains future generators — the emitted event name must never be a shared literal where a tool pins it per event

## Context

Each stop-family registration's command is an inline `node -e` wrapper that turns the
runner's exit 2 into the tool's findings channel. Claude Code's channel,
`hookSpecificOutput`, is a union that pins `hookEventName` per event, and a mismatch
is silently dropped rather than reported as an error. So a `SubagentStop` registration
reusing the `Stop` wrapper as-is would deliver nothing. Cursor's `followup_message`
and Codex's `systemMessage` name no event.

## Decision

On Claude Code, the wrapper is rendered per event (`stopWrapperScript(event)` over
`'Stop' | 'SubagentStop'`). The event name is both the emitted `hookEventName` and the
trigger for adding `--keep-turn`. On Cursor and Codex, one shared wrapper serves both
registrations and forwards any trailing argv to the runner
(`.concat(process.argv.slice(3))`). The two generated commands differ by exactly the
trailing `--keep-turn`.

## Alternatives considered

| Option | Why not |
|---|---|
| One shared Claude Code wrapper with a hard-coded `"Stop"` | Claude Code silently drops `SubagentStop` findings. |
| Leave the Cursor/Codex wrappers literally unchanged and append `--keep-turn` to the command | The wrapper would swallow the flag: the command string passes every assertion while the turn file is still deleted (tasks.md Notes). |
| Separate per-event wrapper scripts for Cursor and Codex | Duplicates a script whose only difference is one argument; no channel field needs the event name. |

## Consequences

**Positive**: The emitted event name matches the registration by construction on
Claude Code. Cursor and Codex keep a single wrapper constant.

**Accepted costs**: The Cursor/Codex argv forwarding has no regression test that runs
the wrapper (audit F1, HIGH). Removing it would leave the suite green while silently
reintroducing turn-file consumption on those two tools.

## Follow-ups

Add one subprocess test per tool (Cursor, Codex) that drives the generated sub-agent
command against the real runner and asserts the turn file survives (audit F1).
