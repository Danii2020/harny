# Intent: Subagent Feedback Hooks

## Problem Statement

harny's per-turn feedback loop pairs a per-edit accumulator with a turn-completion
runner. Only the *main agent's* turn-completion event is wired, on all five tools.
In a conductor-orchestrated pipeline every real edit happens inside a subagent.

On Claude Code the loop still closes — a subagent's `Write` was observed live this
session firing `accumulate` under the **parent session's** turn key, so the
conductor's `Stop` sweeps it up. What is lost is timing: the subagent never sees a
finding while it can still fix it.

On Codex CLI the loop may not close at all. `resolveTurnKey` prefers `turn_id` over
`session_id`, and Codex payloads carry `turn_id`. If a subagent runs under its own
`turn_id`, its edits land in a turn file the parent's `Stop` never reads: a silent
orphan, no output, exit 0. Codex documents only that "subagent hooks use the parent
session id", not what `turn_id` does. That silent orphaning is why this feature
exists; the timing gap is why it is worth more than a one-line fix.

`specs/current/feedback-controls.md` R8 records both halves as unexamined.

## Goals

1. Every path a subagent touches reaches a check, on every tool this feature wires —
   no turn file is ever written that nothing reads.
2. Findings reach the subagent at its own stop, through that tool's existing
   findings channel, not only the conductor at the end of its turn.
3. No finding the conductor sees today is lost by checking earlier.
4. Wire only events confirmed by first-party documentation; leave the rest as
   written-down unknowns with a stated probe, never as a guess.

## Success Criteria

- [ ] Claude Code, Cursor and Codex hook configs each register that tool's
      subagent-completion event alongside the turn-completion event they already carry.
- [ ] A subagent-stop run reports findings and leaves the turn file in place, so the
      parent's own turn-completion run still sees the same paths.
- [ ] Kiro's and GitHub Copilot's generated hook files are byte-identical to before.
- [ ] No new generated artifact, no new path, no new `Generator` member.
- [ ] `templates/hooks/README.md` states the new behavior tool-neutrally before
      naming any tool.
- [ ] R8 is updated with this session's live Claude Code evidence and narrowed to
      what remains unknown.

## Non-Goals

- Consuming Cursor's `subagentStop` `modified_files` (or any per-event file list) as
  a second runner input. The runner keeps one source of touched paths.
- Wiring Kiro or GitHub Copilot. See `contract.md` § Open questions.
- Changing `resolveTurnKey`'s precedence. Wiring the subagent's own stop event makes
  the key question moot without altering main-agent behavior on any tool.
- Reaping orphaned turn files left by earlier runs.

## Constraints

- `harny-sync` lookup returned FC-1–FC-26 and R8 as current truth. Nothing here
  contradicts them; R8 is amended with evidence, not overruled.
- No component vocabulary enters `src/feedback.ts` (FC-1); this feature does not
  touch it.
- No new `Generator` member — `renderHook` is already a method (ADR 0014).
- FC-13 and CLI-14 hold, with regenerated goldens (`contract.md` SF-9).
- The runner is copied byte-for-byte into every install (I5), so a runner change
  reaches all five tools, including the two left unwired.

## Prior Art

- `--whole-project` (agent-feedback-controls A1): a boolean flag on `run`, never a
  third mode. `--keep-turn` follows that precedent exactly.
- `templates/hooks/README.md` § "The behavior" — tool-neutral first, tools named
  afterward as attributed examples (`AGENTS.md` S7).
- Claude Code `SubagentStop` and Cursor `subagentStop`, verified against first-party
  docs 2026-09-23 (`contract.md` § Verified per-tool facts).
