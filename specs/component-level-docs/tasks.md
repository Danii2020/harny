# Tasks: Component-Level Docs

## Legend
- [x] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

## Phase 1: Discovery module
- [x] Task 1.1: Red tests — `tests/shared/components.test.ts`
- [x] Task 1.2: Implement — `templates/shared/components.mjs`

## Phase 2: Generator member and init bridges
- [x] Task 2.1: Red tests — `tests/component-docs.test.ts`
- [x] Task 2.2: `componentBridge` on five generators; `src/component-docs.ts`; init wiring

## Phase 3: Doctor entries
- [x] Task 3.1: Red tests — `tests/doctor/run-doctor-components.test.ts`
- [x] Task 3.2: Runner + `checks.json` `componentDocs`

## Phase 4: Skill, docs, dogfood, validation
- [x] Task 4.1: harny-document step (both roots); doctor README; README
- [x] Task 4.2: Dogfood `src/generators/AGENTS.md` + bridge; regenerate `.sdd/*`, goldens, counts
- [x] Task 4.3: Suite, doctor, PR

## Blocked Items
[None yet]

## Notes
Implementation completed 2026-09-24, with contract Amendment A1: the `Generator` member
is `nestedGuidance` (MC-15's no-"component"-vocabulary gate on `src/generators/`) and
Kiro's bridge frontmatter goes through `renderFrontmatter` (TG-5). Dogfood also fixed
`.gitignore`, whose unanchored `CLAUDE.md` rule would have hidden every nested bridge.

Gates waived for this run (intent.md). Stacked on doctor-security-checks.
