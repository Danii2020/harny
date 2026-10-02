# Roadmap: Streamlined Spec Artifacts

Revision 3.

## Implementation Phases

### Phase 1: Schema and loader
**Goal**: New spec-schema set and constants (SA-1, SA-2, SA-14).
**Dependencies**: None
**Estimated complexity**: Low

1. Add `templates/spec-schema/execution-plan.md` (with § Validation as the test plan),
   rewrite `intent.md`, `tasks.md` and `audit.md` per SA-2, and delete `contract.md`
   and `roadmap.md`.
2. Update `SPEC_SCHEMA_NAMES` and migrate the `tests/fixtures/templates/*/spec-schema/`
   trees.

### Phase 2: Doctor
**Goal**: Shape-aware spec-state check (SA-3, SA-8 to SA-11).
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Make `src/doctor.ts` emit `schemaFiles` (architect files) and `legacySchemaFiles`.
2. Make family 5 in `templates/doctor/run-doctor.mjs` pick the legacy list when it is
   present and the dir holds `contract.md` or `roadmap.md`. Update
   `templates/doctor/README.md`.

### Phase 3: Prompt content
**Goal**: Roles, conductor and skills cite the new files and ownership, and the test
plan moves into § Validation (SA-4 to SA-7, SA-12).
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Update `templates/roles/*`, `templates/conductor/sdd-conductor.md` (drop hard rule
   6 and the checkpoint), and
   `templates/skills/harny-{propose,test,implement,audit,document,sync,adr}`.
2. Mirror the changes in `.agents/skills/*`, `.claude/agents/sdd-*.md`,
   `.claude/skills/sdd-conductor/SKILL.md` and `.claude/skills/high-value-tests/`.
   Keep the declared divergences truthful.

### Phase 4: Writer removals and `harny update`
**Goal**: Known-legacy removal and the update verb (SA-18 to SA-25).
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Add `LEGACY_HARNESS_PATHS`. Make the writer plan removals and unchanged-detection,
   and apply removals after writes, contained to the install root.
2. Add `update`: load `.sdd/harness.json` and render through `runInit` (non-interactive,
   no git-hooks activation, no CONFLICT refusal). Apply the SA-22 git safety check,
   then report. Wire the verb in `src/cli.ts`.
   *(suggestion: an `update` flag on `InitOptions` instead of a second pipeline.)*

### Phase 5: Generators, goldens, dogfood `.sdd/`
**Goal**: Deployed output is consistent (SA-13, SA-15).
**Dependencies**: Phases 1–4
**Estimated complexity**: Low

1. Update `renderSpecSchemaPointerBlock`.
2. Build and regenerate `tests/fixtures/golden/monorepo-mode/` from the built CLI.
   Then run the built `harny update` on this repo, which also dogfoods SC13.

### Phase 6: Docs and validation
**Goal**: Conventions and suite green (SA-16, SA-17).
**Dependencies**: Phases 1–5
**Estimated complexity**: Low

1. Update `AGENTS.md` and `README.md`.
2. Run the full suite and typecheck and compare against the baseline. Then run
   `--only spec-state` and confirm that `git status` shows no change under
   `specs/<other>/` or `specs/archived/`.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A missed `contract.md`/`roadmap.md` or Test Plan mention in prompt text | Med | Med | SA-6/SA-7 grep tests over the four content trees |
| Doctor shape detection marks an in-flight legacy spec as broken | Low | High | SA-9 test plus a real `--only spec-state` run on this repo |
| `update` overwrites a user's edits to a generated file | Med | Med | SA-22 refusal on tracked-file changes; dry-run report; `--force` is explicit. Untracked edits are overwritten (accepted) |
| The first delete removes something it shouldn't | Low | High | Constant list only, regular files only, containment check, never `specs/` (SA-19, SA-23) |
| `update` drifts from `init` output | Low | Med | Same render path (SA-21) and a byte-compare test against fresh init |
| Goldens hand-edited or drifting | Low | Med | Regenerate from the built CLI only (test-tiers procedure) |
| Dogfood pipeline running this feature uses old skills mid-flight | High | Low | Bootstrap caveat in `intent.md`. This dir stays 5-file and is judged legacy afterwards |

## File Change Map
- `templates/spec-schema/execution-plan.md` — CREATE
- `templates/spec-schema/{contract,roadmap}.md` — DELETE
- `templates/spec-schema/{intent,tasks,audit}.md` — MODIFY
- `src/templates.ts`, `src/doctor.ts`, `src/generators/markdown-yaml.ts` — MODIFY
- `src/writer.ts`, `src/init.ts`, `src/cli.ts` — MODIFY (removals, update)
- `templates/doctor/run-doctor.mjs`, `templates/doctor/README.md` — MODIFY
- `templates/roles/*.md`, `templates/conductor/sdd-conductor.md`, `templates/skills/harny-*/SKILL.md` — MODIFY
- `.agents/skills/harny-*/SKILL.md`, `.claude/agents/sdd-*.md`, `.claude/skills/{sdd-conductor,high-value-tests}/SKILL.md` — MODIFY
- `.sdd/**` — refreshed by `harny update` (legacy schema files removed)
- `tests/update.test.ts` — CREATE; `tests/**` (Integration Points list), `tests/fixtures/templates/*/spec-schema/`, `tests/fixtures/golden/monorepo-mode/**` — MODIFY / regenerate
- `AGENTS.md`, `README.md` — MODIFY
