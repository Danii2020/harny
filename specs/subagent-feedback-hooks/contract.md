# Contract: Subagent Feedback Hooks

## Interfaces

### Public API

No exported TypeScript signature changes; `renderHook` keeps its shape on all five
generators. Three module-private builders widen:

```ts
// src/generators/claude-code.ts — the event name becomes a parameter, because
// Claude Code's hookSpecificOutput union pins hookEventName per event.
type ClaudeStopEvent = 'Stop' | 'SubagentStop';
function stopWrapperScript(event: ClaudeStopEvent): string;
function stopCommand(runner: string, commands: unknown, event: ClaudeStopEvent): string;

// src/generators/cursor.ts, src/generators/codex.ts — wrappers unchanged; only
// the extra `--keep-turn` argument differs.
function stopCommand(runner: string, commands: unknown, keepTurn: boolean): string;
```

### Data Models

```js
// templates/hooks/run-feedback.mjs — one more boolean, exactly as `--whole-project`
// was added.
/** @returns {{ commandsPath?: string, wholeProject: boolean, keepTurn: boolean }} */
function parseRunArgs(argv) { /* ... */ }
```

### State Changes

`.sdd/feedback/.turns/<turn-key>` is read and its commands run exactly as today.
Under `--keep-turn` the file is not deleted; the next run without the flag deletes
it as before. No other state is read or written.

## Behavior Guarantees

1. **SF-1 — Same file, same shape, nothing new.** Each wired generator registers its
   tool's subagent-completion event inside the hook file it already writes, in that
   file's already-shipped registration shape. No new path, artifact, `hooksPath` or
   `Generator` member.

2. **SF-2 — The subagent registration is the same runner call plus one flag.** Same
   `.sdd/feedback/run-feedback.mjs`, same `run` mode, same inline `--commands`
   payload as that tool's turn-completion registration, plus `--keep-turn`. It never
   passes `--whole-project`; the README's two-way rule stands.

3. **SF-3 — `--keep-turn` is a boolean on `run`, never a third mode.** Identical in
   every respect except that the turn file is not deleted. Inert under
   `--whole-project`, which reads no turn state at all.

4. **SF-4 — At-least-once, never consumed-and-dropped.** The turn file survives a
   subagent-stop run, so every path it held is still there for the parent's own run.
   A finding may be reported twice — to the subagent, then to the conductor — and is
   never reported zero times because an earlier run consumed it.

5. **SF-5 — Three tools are wired, each on its own documented event and channel.**

   | Tool | Event registered | Findings channel (unchanged from that tool's turn-completion wrapper) |
   |---|---|---|
   | Claude Code | `hooks.SubagentStop` | `hookSpecificOutput.additionalContext`, non-blocking |
   | Cursor | `hooks.subagentStop` | `followup_message`, suppressed at or above `loop_count` limit |
   | Codex CLI | `hooks.SubagentStop` | `systemMessage`, with the same registration `timeout` as `Stop` |

6. **SF-6 — Claude Code's emitted `hookEventName` matches its registration.** The
   `SubagentStop` wrapper emits `"SubagentStop"`, the existing `Stop` wrapper still
   emits `"Stop"`. A mismatch is a silent drop, so the name is a wrapper parameter,
   never a shared literal.

7. **SF-7 — Kiro and GitHub Copilot are deliberately not wired.** Their generated
   hook files stay byte-identical. See § Open questions.

8. **SF-8 — A subagent-stop run is an ordinary run.** Per-component dispatch (FC-25),
   the extension and existence filters (FC-22, FC-23), probe skip (I3), the
   `stop_hook_active` guard (I6) and the exit-0/exit-2 convention all apply through
   the identical code path. Nothing branches on "this was a subagent".

9. **SF-9 — Inherited byte-identity guarantees hold.** This repo's
   `.claude/settings.json` and `.sdd/feedback/run-feedback.mjs` are regenerated, so
   FC-13 still holds. CLI-14 is unaffected in substance: the new registration is
   component-independent, so a `components`-free install's bytes still do not depend
   on components and a multi-component install still writes the same path set.
   Regenerating `tests/fixtures/golden/` is the only sanctioned golden change.

10. **SF-10 — The canonical README is tool-neutral first.** § "The behavior" gains an
    eighth property covering subagent completion, naming no tool; per-tool event
    names appear only under § "Attributed examples", dated (`AGENTS.md` S7).

## Verified per-tool facts (2026-09-23, first-party docs)

- **Claude Code** — every hook input carries `session_id`, `cwd`, `hook_event_name`,
  plus `agent_id`/`agent_type` inside a subagent; `SubagentStop` input carries
  `stop_hook_active`; its `hookSpecificOutput` union admits
  `{ hookEventName: "SubagentStop", additionalContext?: string }`; `settings.json`
  registers it in the same nested shape as `Stop`. Confirmed live this session: a
  subagent's `Write` fired `accumulate` under the parent session's turn key.
- **Cursor** — `subagentStop` fires on subagent completion, error or abort; its
  output field is `followup_message`, under the same `loop_limit` as `stop`; the
  common input schema carries `conversation_id`, the key `resolveTurnKey` resolves
  for Cursor, so a subagent's edits and its stop resolve the same key.
- **Codex CLI** — subagent hooks use the parent session id; `SubagentStop` exists,
  same shape as `Stop`. What `turn_id` does across a subagent boundary is not
  documented — see § Open questions.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| Subagent stop fires with no turn file | Runner exits 0 silently (FC/BG-4, unchanged) | Nothing printed |
| Subagent's accumulate used a different turn key than its stop | That file is never read and is never deleted | No per-turn feedback for those paths; CI still catches them |
| A wired event never fires on a given install | Registration is inert; turn-completion behavior unchanged | Exactly today's behavior |
| `--keep-turn` passed with `--whole-project` | Ignored; no turn state is touched | None |
| Findings channel not honored on a subagent-stop event | Findings are not delivered there, but the turn file survives, so the parent's run reports them | Delayed, not lost (SF-4) |

## Dependencies

- Internal: `templates/hooks/run-feedback.mjs`, `src/generators/{claude-code,cursor,codex}.ts`.
- External: none added (`AGENTS.md` S4).

## Integration Points

- `templates/hooks/README.md` — eighth behavior property, three attributed examples.
- `specs/current/feedback-controls.md` — R8 amended at archive time: the Claude Code
  half confirmed, the Codex half narrowed to open question 1, a new reservation for
  the two unwired tools.
- `tests/generators/*.test.ts`, `tests/hooks/run-feedback.test.ts`,
  `tests/fixtures/golden/` — existing homes for these guarantees.

## Open questions

One probe answers all four: have a subagent write exactly one file, then list
`.sdd/feedback/.turns/` before the subagent hands back and again after the parent's
turn ends. The file names are the turn keys; what appears, and when it is deleted,
is the answer.

1. **Codex** — do a subagent's `PostToolUse` and its `SubagentStop` resolve the same
   `turn_id`? If not, its edits stay orphaned and `resolveTurnKey` must be revisited.
2. **Cursor** — does `afterFileEdit` fire inside a subagent? If not, Cursor subagent
   edits are invisible on both events, and closing that needs `modified_files` as a
   second runner input — a non-goal here.
3. **GitHub Copilot** — the first-party docs reachable this session describe a hooks
   shape disagreeing with what harny already ships (`{"command","shell"}` entries,
   camelCase `sessionId`/`stopHookActive`) and never mention `subagentStop`. `AL-30`
   /`R5` class, and it questions the shipped `agentStop` artifact, not just this
   feature. Flagged for the human, not resolved here.
4. **Kiro** — no subagent hook documentation found. Unknown, unwired.
