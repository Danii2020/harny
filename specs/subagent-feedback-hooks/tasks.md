# Tasks: Subagent Feedback Hooks

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: The `--keep-turn` flag
- [x] Task 1.1: Red tests T1–T3 for the flag — `tests/hooks/run-feedback.test.ts`
- [x] Task 1.2: Add `keepTurn` to `parseRunArgs` — `templates/hooks/run-feedback.mjs`
- [x] Task 1.3: Guard the turn-file delete on it — `templates/hooks/run-feedback.mjs`
- [x] Task 1.4: Extend the header comment's `run` description — `templates/hooks/run-feedback.mjs`

## Phase 2: The three wired registrations
- [x] Task 2.1: Red tests T4, T7 — `tests/generators/claude-code.test.ts`
- [x] Task 2.2: Parameterize the wrapper by event name; add `SubagentStop` — `src/generators/claude-code.ts`
- [x] Task 2.3: Red test T5, then add `subagentStop` — `src/generators/cursor.ts`
- [x] Task 2.4: Red test T6, then add `SubagentStop` — `src/generators/codex.ts`
- [x] Task 2.5: Red test T8 asserting unchanged bytes — landed in
      `tests/generators/registry.test.ts`'s five-tool wiring-topology table
      instead of per-file byte goldens (see audit.md T8); Kiro and Copilot
      generators untouched.

## Phase 3: Documentation and dogfood
- [!] Task 3.1: Eighth tool-neutral property plus three dated attributed examples —
      `templates/hooks/README.md`. Deferred to the documentation role: SF-10 is
      documentation-stage prose, and this implementation run was scoped to leave
      canonical prose untouched.
- [x] Task 3.2: Regenerate from a fresh init — `.sdd/feedback/run-feedback.mjs`,
      `.claude/settings.json` (rendered through the real `buildFeedbackFiles` /
      `claudeCodeGenerator.renderHook` path from the built `dist/`, against this
      repo's own `.sdd/harness.json`; `.sdd/harness.json`, `.sdd/doctor/*`,
      `.sdd/shared/probes.mjs` and the CI workflow verified still byte-identical)
- [x] Task 3.3: Regenerate and review as a diff — `tests/fixtures/golden/`
      (`monorepo-mode/ts-root/.claude/settings.json` and
      `monorepo-mode/py-sub/apps/api/.claude/settings.json` only, captured from
      two real built-CLI installs; no other golden file changed)

## Phase 4: Validation
- [x] Task 4.1: T9 golden/path-set run — `tests/e2e-init.test.ts`
- [x] Task 4.2: Full suite plus `npx harny doctor` green (841 passed / 33 files;
      doctor: 24 ok, 0 failed)
- [!] Task 4.3: Run the `.turns/` probe live on Claude Code; record the result —
      `specs/subagent-feedback-hooks/audit.md`. Not runnable from this role: it
      needs a live parent session driving a subagent, and `audit.md`'s log is the
      auditing role's to write.

## Blocked Items
[None yet]

## Notes
Kiro and GitHub Copilot are intentionally untouched (SF-7). If a task seems to
require editing either generator, stop — that is scope creep, and Copilot's shipped
hook shape is itself under question in `contract.md` § Open questions 3.

Implementation note on `contract.md` § Interfaces for Cursor and Codex ("wrappers
unchanged; only the extra `--keep-turn` argument differs"): both wrappers stayed a
single shared constant serving both registrations — never parameterized per event,
unlike Claude Code's — but each gained one-time argv forwarding
(`.concat(process.argv.slice(3))`) so the trailing flag actually reaches the runner.
A wrapper left literally untouched would have rendered a `--keep-turn` the wrapper
swallowed: the generated command string would satisfy every assertion while the turn
file was still deleted. The two rendered commands now differ by exactly that one
trailing argument, as the contract requires.

Implementation completed 2026-09-23.
