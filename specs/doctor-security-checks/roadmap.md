# Roadmap: Doctor Security Checks

## Implementation Phases

### Phase 1: Runner
**Goal**: DS-1–DS-5, DS-7, DS-8. **Dependencies**: None. **Complexity**: Medium.
1. `FAMILY_TOKENS` + the family block; `evaluateEntry` gains `assert`.

### Phase 2: Generation
**Goal**: DS-6, DS-9. **Dependencies**: Phase 1. **Complexity**: Low.
1. `DoctorAssertion`, `buildSecurityChecks`, `security`/`securityLabel` in `buildDoctorChecks`.
2. `CI_SECRET_SCAN_STEP_NAME` in `src/git-hooks.ts`.

### Phase 3: Docs, dogfood, validation
**Goal**: DS-10, DS-11. **Dependencies**: Phase 2. **Complexity**: Low.
1. Doctor README, both SKILL.md roots, root README.
2. Regenerate this repo's `.sdd/doctor/*`, goldens; full suite; doctor; PR.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| New warnings are noise in every repo without gitleaks | High | Low | Recommended tier; one line; remediation names the install |
| Hook manager makes `git-hooks-active` warn | Med | Low | Remediation names the manager case |
| Output change breaks existing doctor tests | Med | Med | Family only emitted when `security` present; old fixtures unaffected |

## File Change Map

- `templates/doctor/run-doctor.mjs`, `templates/doctor/README.md` — MODIFY
- `src/doctor.ts`, `src/git-hooks.ts` — MODIFY
- `templates/skills/harny-doctor/SKILL.md`, `.agents/skills/harny-doctor/SKILL.md` — MODIFY
- `tests/doctor-security.test.ts`, `tests/doctor/run-doctor-security.test.ts` — CREATE
- goldens, `.sdd/doctor/*`, `README.md` — MODIFY
