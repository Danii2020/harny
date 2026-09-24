# Roadmap: Permissions Baseline

> Test-first (`AGENTS.md` § Working conventions): Phase 1–3 tests are written red
> before the code that satisfies them.

## Implementation Phases

### Phase 1: Canonical policy and guard runner
**Goal**: PB-1, PB-3–PB-7, PB-10 — the tool-neutral enforcement engine.
**Dependencies**: None
**Estimated complexity**: High

1. `templates/permissions/policy.json` — the baseline data.
2. `templates/permissions/run-guard.mjs` — normalize input, split/unwrap shell,
   evaluate reads, patterns and git branch rules, exit 0/2/3.
3. `templates/permissions/README.md` — tool-neutral behavior, then attributed examples.

### Phase 2: Generation plumbing
**Goal**: PB-2, PB-9, PB-11, PB-12.
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. `src/permissions.ts` — paths, `parsePermissionPolicy`, `claudeCodePermissions`,
   `buildPermissionsFiles`.
2. `src/templates.ts` / `src/engine.ts` — load and carry the two resources;
   `HookPayload.permissions`.
3. `src/init.ts` — pass `permissions` into the hook payload; add the files to the same
   render step.

### Phase 3: Five generators
**Goal**: PB-8, PB-9, PB-12.
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. Claude Code: `PreToolUse` registration + static `permissions`.
2. Cursor: `beforeShellExecution` + `beforeReadFile`.
3. GitHub Copilot: `preToolUse`.
4. Codex: `PreToolUse` with the `Stop` timeout.
5. Kiro: `preToolUse` array entry.

### Phase 4: Dogfood, docs, validation
**Goal**: PB-13, PB-14, SC6, SC8.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Regenerate this repo's `.claude/settings.json` and `.sdd/permissions/*` via the real
   generator path; update goldens and artifact counts.
2. README section.
3. Full suite, typecheck, doctor.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Guard blocks legitimate work (false positive) | Med | Med | Conservative ask-not-deny for everything but the plan's hard denies; policy is editable data |
| Guard misses a spelling (false negative) | High | Med | Documented as best-effort (non-goal); static Claude rules + `commit-checks` + server-side protection are the later layers |
| Cursor blocks every call if wrapper prints invalid JSON | Low | High | Wrapper always prints valid JSON; subprocess test per outcome |
| Kiro/Copilot payload field names differ from verified shapes | Med | Med | Normalizer accepts every documented variant; reservation recorded |
| Dogfood guard blocks this repo's own agent pushing to `main` | High | Low | Intended; documented |
| Golden/count churn hides an unintended byte change | Med | High | Goldens regenerated from real installs and reviewed as a diff |

## File Change Map

- `templates/permissions/policy.json` — CREATE
- `templates/permissions/run-guard.mjs` — CREATE
- `templates/permissions/README.md` — CREATE
- `src/permissions.ts` — CREATE
- `src/templates.ts` — MODIFY — load two optional resources
- `src/engine.ts` — MODIFY — `HookPayload.permissions`, `HarnessPayload` resources
- `src/init.ts` — MODIFY — wire payload and files
- `src/generators/{claude-code,cursor,github-copilot,codex,kiro}.ts` — MODIFY
- `tests/permissions.test.ts`, `tests/permissions/run-guard.test.ts` — CREATE
- `tests/generators/*.test.ts`, `tests/e2e-init.test.ts`, `tests/canonical-fidelity.test.ts`, `tests/fixtures/golden/**` — MODIFY
- `.claude/settings.json`, `.sdd/permissions/*` — MODIFY/CREATE (dogfood)
- `README.md` — MODIFY
