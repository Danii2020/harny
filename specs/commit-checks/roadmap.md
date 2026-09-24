# Roadmap: Commit Checks

> Test-first; every phase's tests are written red before its code.

## Implementation Phases

### Phase 1: `run --staged`
**Goal**: CC-2. **Dependencies**: None. **Complexity**: Medium.
1. Refactor the turn path of `run-feedback.mjs` into a shared dispatch.
2. Add `--staged` path collection; whole-project commands skipped.

### Phase 2: Hook runner and shims
**Goal**: CC-1, CC-3, CC-4, CC-5. **Dependencies**: Phase 1. **Complexity**: High.
1. `templates/git-hooks/run-git-hook.mjs`, `pre-commit`, `pre-push`, `README.md`.

### Phase 3: Generation and activation
**Goal**: CC-1, CC-6, CC-8. **Dependencies**: Phase 2. **Complexity**: Medium.
1. `GeneratedFile.executable` + writer chmod.
2. `src/git-hooks.ts`; templates loading; `runInit` wiring; `--no-git-hooks`; prompt.

### Phase 4: CI, dogfood, docs, validation
**Goal**: CC-7, CC-9, CC-10. **Dependencies**: Phase 3. **Complexity**: Medium.
1. CI template: `fetch-depth: 0`, gitleaks step.
2. Regenerate dogfood artifacts and goldens; activate hooks in this checkout.
3. README; full suite; doctor; open PR and confirm the CI secret-scan step runs green.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Hooks slow commits so people bypass them | Med | High | Per-file only, staged only; whole-project in CI |
| Clobbering a team's husky/lefthook setup | Med | High | Detect and refuse; print the line to add |
| gitleaks release asset name changes | Low | Med | Pinned version; checksum step fails loudly |
| gitleaks false positive blocks CI | Med | Med | Standard `.gitleaksignore` / `gitleaks:allow`; documented |
| Protected-branch block surprises a human committing to `main` | High | Low | Intended; `--no-verify` is the human escape hatch |

## File Change Map

- `templates/git-hooks/{pre-commit,pre-push,run-git-hook.mjs,README.md}` — CREATE
- `templates/hooks/run-feedback.mjs` — MODIFY (`--staged`)
- `templates/ci/harny-feedback.yml` — MODIFY (fetch-depth, gitleaks step)
- `src/git-hooks.ts` — CREATE
- `src/generators/types.ts`, `src/writer.ts` — MODIFY (`executable`)
- `src/templates.ts`, `src/engine.ts`, `src/init.ts`, `src/cli.ts`, `src/prompts.ts` — MODIFY
- `tests/git-hooks.test.ts`, `tests/git-hooks/run-git-hook.test.ts` — CREATE
- `tests/hooks/run-feedback.test.ts`, `tests/e2e-init.test.ts`, `tests/canonical-fidelity.test.ts`, `tests/fixtures/golden/**`, CI tests — MODIFY
- `.sdd/git-hooks/*`, `.sdd/feedback/run-feedback.mjs`, `.github/workflows/harny-feedback.yml` — dogfood
- `README.md` — MODIFY
