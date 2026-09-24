# Tasks: Permissions Baseline

## Legend
- [x] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: Canonical policy and guard runner
- [x] Task 1.1: Red tests for the guard (reads, patterns, git branches, errors, payload shapes) — `tests/permissions/run-guard.test.ts`
- [x] Task 1.2: Write the baseline — `templates/permissions/policy.json`
- [x] Task 1.3: Implement the guard — `templates/permissions/run-guard.mjs`
- [x] Task 1.4: Tool-neutral README with attributed examples — `templates/permissions/README.md`

## Phase 2: Generation plumbing
- [x] Task 2.1: Red tests for `src/permissions.ts` — `tests/permissions.test.ts`
- [x] Task 2.2: Implement `src/permissions.ts`
- [x] Task 2.3: Load resources, extend payloads — `src/templates.ts`, `src/engine.ts`
- [x] Task 2.4: Wire into the render step — `src/init.ts`

## Phase 3: Five generators
- [x] Task 3.1: Red tests driving each generated guard command as a subprocess — landed as one
      cross-generator file, `tests/generators/permissions-guard.test.ts`, rather than five edits,
      so the five tools' channels sit side by side and share one fixture repo builder
- [x] Task 3.2: Claude Code — `src/generators/claude-code.ts`
- [x] Task 3.3: Cursor — `src/generators/cursor.ts`
- [x] Task 3.4: GitHub Copilot — `src/generators/github-copilot.ts`
- [x] Task 3.5: Codex — `src/generators/codex.ts`
- [x] Task 3.6: Kiro — `src/generators/kiro.ts`

## Phase 4: Dogfood, docs, validation
- [x] Task 4.1: Regenerate dogfood artifacts; update goldens and counts
- [x] Task 4.2: README section
- [x] Task 4.3: Full suite, typecheck, doctor green

## Blocked Items
[None yet]

## Notes
Implementation note: the five wrappers share one builder, `src/generators/guard.ts`
(`guardCommand` + `emitJson`), so each generator supplies only its three output
snippets. This is a module-private helper, not a `Generator` member (TG-1 unchanged).
Implementation completed 2026-09-24.

Gates waived by the human for this run (see intent.md). Do not edit Kiro/Copilot
existing registrations; only add the guard entry beside them.
