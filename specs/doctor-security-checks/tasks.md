# Tasks: Doctor Security Checks

## Legend
- [x] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: Runner
- [x] Task 1.1: Red runner tests — `tests/doctor/run-doctor-security.test.ts`
- [x] Task 1.2: Implement — `templates/doctor/run-doctor.mjs`

## Phase 2: Generation
- [x] Task 2.1: Red generation tests — `tests/doctor-security.test.ts`
- [x] Task 2.2: Implement — `src/doctor.ts`, `src/git-hooks.ts`

## Phase 3: Docs, dogfood, validation
- [x] Task 3.1: Docs (doctor README, both SKILL.md roots, root README)
- [x] Task 3.2: Regenerate dogfood and goldens; suite; doctor

## Blocked Items
[None yet]

## Notes
Implementation completed 2026-09-24. The dogfood run's `security:env-ignored` warning
was a real gap in this repository; its remediation (`.env*` rules in `.gitignore`) was
applied as part of the dogfood task. Golden `harny-doctor/SKILL.md` copies were
regenerated for the SKILL text change.

Gates waived for this run (intent.md). Stacked on commit-checks.
