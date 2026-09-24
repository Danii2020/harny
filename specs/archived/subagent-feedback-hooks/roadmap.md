# Roadmap: Subagent Feedback Hooks

> Test-first throughout (`AGENTS.md` § Working conventions); phase 4 is whole-system
> validation, not the first appearance of tests.

## Implementation Phases

### Phase 1: The `--keep-turn` flag
**Goal**: SF-3 — `run` can leave the turn file in place.
**Dependencies**: None
**Estimated complexity**: Low

1. Add `keepTurn` to `parseRunArgs` alongside `wholeProject`.
2. Guard the single `fs.rmSync(file, { force: true })` call in `runRunMode` on it.
3. Extend the header comment's `run` description to cover the flag, in the same
   voice as the `--whole-project` paragraph above it.

### Phase 2: The three wired registrations
**Goal**: SF-1, SF-2, SF-5, SF-6 — Claude Code, Cursor and Codex each register their
subagent-completion event.
**Dependencies**: Phase 1 (the flag must exist before a hook config names it)
**Estimated complexity**: Medium

1. `claude-code.ts`: turn `STOP_WRAPPER_SCRIPT` into `stopWrapperScript(event)`,
   thread the event through `stopCommand`, add the `SubagentStop` registration.
2. `cursor.ts`: add `keepTurn` to `stopCommand`, add the `subagentStop` registration
   reusing the existing wrapper and timeout.
3. `codex.ts`: same, for `SubagentStop`, with the existing `timeout`.
4. Leave `kiro.ts` and `github-copilot.ts` untouched (SF-7).

### Phase 3: Documentation and dogfood
**Goal**: SF-9, SF-10 — canonical prose updated, this repo's artifacts regenerated.
**Dependencies**: Phase 2
**Estimated complexity**: Low

1. `templates/hooks/README.md`: eighth tool-neutral property, then three dated
   attributed examples.
2. Regenerate `.claude/settings.json` and `.sdd/feedback/run-feedback.mjs` from a
   fresh `npx harny init --tools claude-code --stack typescript`.
3. Regenerate `tests/fixtures/golden/`, reviewed as a diff.

### Phase 4: Validation
**Goal**: prove SF-4, SF-7, SF-8 end to end.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Drive the real runner twice over one turn file, with and without `--keep-turn`;
   assert it survives the first and is gone after the second.
2. Assert Kiro's and Copilot's rendered hook bytes are unchanged.
3. Run `contract.md`'s probe live on Claude Code; record what `.turns/` showed.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Codex subagent uses a different `turn_id`, so the orphan persists | Med | Med | No regression versus today; recorded as open question 1 with a probe |
| Cursor `afterFileEdit` never fires in a subagent | Med | Med | Registration is inert, not wrong; open question 2 |
| Wrong `hookEventName` silently drops findings on Claude Code | Low | High | SF-6 makes it a parameter; asserted per registration |
| Duplicate lint runs per conductor turn | High | Low | Accepted by SF-4; dedup keeps the answer correct |
| Golden churn hides an unintended byte change | Low | High | Goldens regenerated in their own commit and read as a diff |

## File Change Map

- `templates/hooks/run-feedback.mjs` — MODIFY — `--keep-turn` flag, guarded delete, header comment
- `src/generators/claude-code.ts` — MODIFY — parameterized wrapper, `SubagentStop` registration
- `src/generators/cursor.ts` — MODIFY — `subagentStop` registration
- `src/generators/codex.ts` — MODIFY — `SubagentStop` registration
- `templates/hooks/README.md` — MODIFY — eighth property, attributed examples
- `.sdd/feedback/run-feedback.mjs` — MODIFY — regenerated (FC-13)
- `.claude/settings.json` — MODIFY — regenerated (FC-13)
- `tests/hooks/run-feedback.test.ts` — MODIFY — `--keep-turn` behavior
- `tests/generators/{claude-code,cursor,codex}.test.ts` — MODIFY — new registration
- `tests/generators/{kiro,github-copilot}.test.ts` — MODIFY — unchanged-bytes assertion
- `tests/fixtures/golden/**` — MODIFY — regenerated hook bytes
