# Intent: Streamlined Spec Artifacts

**Shipped: 2026-10-02**

> **Bootstrap caveat.** This feature is written in the current 5-file shape because the
> schema it replaces is still the one in force: the spec-schema templates, the doctor's
> `schemaFiles`, and every dogfood skill expect five files. Once shipped, the doctor
> treats this directory as legacy shape (SC6).
>
> **Revision 2** (2026-10-01): applies the human's answers to the revision 1 open
> questions. The Test Plan moves into the execution plan, stale schema files are
> removed, `harny update` is added, and a dir with both shapes is judged legacy.
>
> **Revision 3** (2026-10-01): `update`'s git safety check ignores untracked files.
> `init --force` removes legacy files without a dirty check. The approval stamp is
> recorded by the human, not the architect.

## Problem Statement

The architect writes five files per feature (`intent`, `contract`, `roadmap`, `tasks`,
`audit`). Together they are too long for one person to review at the spec gate, and
that weakens the human control the gates exist to provide. `contract.md` and
`roadmap.md` overlap, and the architect writes an `audit.md` stub that no one reviews.
Separately, an already-initialised repo has no supported way to pick up a new harness
version. Re-running `init --force` cannot remove files that a newer version no longer
ships.

## Goals

1. **G1 — Three architect artifacts.** The architect writes only `intent.md`,
   `execution-plan.md` and `tasks.md`.
2. **G2 — `audit.md` belongs to the auditor.** Only the auditor creates and writes it.
3. **G3 — One reviewed plan, including tests.** Test scope (per-AC tests, tiers,
   frameworks, setup) lives in `execution-plan.md` § Validation. Approving the specs
   also approves test scope. The test-writer works from the intent ACs and that
   section. The executor works from the execution plan and `tasks.md`, and answers
   audit findings in `tasks.md`.
4. **G4 — Full replacement.** `contract.md` and `roadmap.md` are removed everywhere the
   harness defines or deploys them: templates, deployed schema, skills (both trees),
   roles, conductor, doctor, generators, golden fixtures, tests and docs.
5. **G5 — Legacy specs keep working.** Existing 5-file specs in `specs/` and
   `specs/archived/` are untouched, and the tooling accepts both shapes.
6. **G6 — Terse by design.** Each schema asks for less prose and favors short sections.
7. **G7 — `harny update`.** A new command that brings an initialised repo up to the
   installed harny version. It regenerates the harness files from the repo's own
   `.sdd/harness.json` and removes known stale legacy files. It never touches `specs/`.

## Success Criteria

- [ ] **SC1** `templates/spec-schema/` and a fresh `.sdd/spec-schema/` contain exactly
  `intent.md`, `execution-plan.md`, `tasks.md`, `audit.md`, with no `contract.md` or
  `roadmap.md`.
- [ ] **SC2** The architect role and `harny-propose` (both trees) tell the architect to
  write exactly three files and never `audit.md`.
- [ ] **SC3** The test-writer, executor, auditor, documentation and conductor content
  (templates, dogfood skills, live agents and the conductor) cites `execution-plan.md`
  and `tasks.md`, never `contract.md` or `roadmap.md`, except for the legacy-shape note.
- [ ] **SC4** No separate Test Plan or `**Plan status**` line exists anywhere, and no
  conductor checkpoint for one. The test-writer stops for the human only if it needs a
  tier or setup that the approved § Validation does not name.
- [ ] **SC5** Doctor spec-state: a feature dir holding `intent.md`, `execution-plan.md`
  and `tasks.md` passes, with or without `audit.md`. If one of those three is missing,
  the dir fails, and the failure line names the missing files.
- [ ] **SC6** Doctor spec-state: a dir holding `contract.md` or `roadmap.md` is judged
  against the legacy five files, including a dir that also holds `execution-plan.md`.
  Every current in-flight spec in this repo still passes.
- [ ] **SC7** A `checks.json` written before this feature, which has no
  `legacySchemaFiles`, gives the same spec-state result as it does today.
- [ ] **SC8** `harny-sync` archive accepts both shapes. In the new shape it requires
  `intent.md`, `execution-plan.md`, `tasks.md` and `audit.md`.
- [ ] **SC9** The generated role pointer block lists the deployed scaffolds, not five
  names.
- [ ] **SC10** The golden fixtures and this repo's own `.sdd/` match a fresh
  `harny init` output. `npm test` and `npm run typecheck` show no failures beyond
  the baseline.
- [ ] **SC11** `AGENTS.md` and `README.md` describe the new shape, its traceability
  rule, the retargeted S4 and "law during implementation" conventions, and
  `harny update`.
- [ ] **SC12** `init --force` over a legacy install removes
  `.sdd/spec-schema/contract.md` and `roadmap.md` and reports the removal. The writer
  deletes only paths on an explicit known-legacy list.
- [ ] **SC13** `harny update` on a legacy install produces the same harness files as a
  fresh `init` with the same `.sdd/harness.json`, plus the legacy removals. It reports
  each path as created, updated, unchanged or removed.
- [ ] **SC14** A second `harny update` reports nothing created, updated or removed
  (idempotent).
- [ ] **SC15** `harny update --dry-run` prints the same report and changes nothing.
- [ ] **SC16** `harny update` refuses with a non-zero exit and changes nothing when:
  `.sdd/harness.json` is missing or invalid; or a tracked path it would modify or
  remove has staged or unstaged changes and `--force` is not given; or the target is
  not in a git repo and `--force` is not given. Untracked files never block, and are
  overwritten. `init --force` has no dirty check, and that is accepted.
- [ ] **SC17** `harny update` never creates, modifies or deletes anything under
  `specs/`, and never changes `core.hooksPath`.

## Non-Goals

- Editing any existing spec under `specs/` or `specs/archived/`.
- Changing the three human gates, the verdict enum, or the severity ratings.
- Hand-editing `specs/current/`. `harny-sync` archive updates it at ship time.
- Jira/Story fields and the "Workflow: streamlined" header from the reference templates.
- For `update`: recording a package version, migrating `harness.json` itself,
  interactive prompts, three-way merging of user edits in generated files, and
  deleting anything not on the known-legacy list.

## Constraints

- Approval is still explicit per gate. The new `intent.md` header carries
  `Revision` and `Approval: Pending | Approved revision N by <person> on <date>`.
- Byte-identity (S3) and the golden-fixture regeneration rule: goldens are regenerated
  from the built CLI, never hand-edited.
- No new dependencies (S4). `update` reuses `runInit`, the config loader and the
  writer, and adds no second rendering path.
- This is the writer's first delete behavior. Every delete is contained to the install
  root (S3), and the delete list is explicit and constant.
- Tool-neutral wording in `templates/` (S7).
- **Deliberate contradictions with current truth** (from the `harny-sync` lookup):
  - SW-1, SW-2, SW-3 (spec-workflow): five files and contract/roadmap traceability
    are replaced by three architect files plus an auditor-only `audit.md`.
  - RD-4 (readiness-checks): "missing any of the five" becomes shape-aware (SC5–SC7).
  - **PR-12 and ADR 0047/0048 (pipeline-roles)** are superseded. The separate Test
    Plan in `audit.md` (0047) and the plan-status checkpoint (PR-12, 0048) are
    removed. Test scope is approved at gate 1 as part of § Validation. The PR-12 rule
    "stop when a non-unit tier or any setup is needed" survives in narrower form: the
    test-writer stops only when it needs one that the approved § Validation does not
    already name. PR-6 still holds: three gates, and no fourth gate is added.
  - PR-13 (pipeline-roles): the auditor's `### Tier Results` now checks against
    § Validation instead of a Test Plan.
  - CLI (cli-init): `init --force` gains removal of known legacy paths, and a new
    `update` verb is added. "The writer never deletes" no longer holds, but only for
    the explicit list.

## Prior Art

- `src/templates.ts` `SPEC_SCHEMA_NAMES`, `src/doctor.ts` (harness + `specs` config),
  `templates/doctor/run-doctor.mjs` family 5, `src/generators/markdown-yaml.ts`
  `renderSpecSchemaPointerBlock`.
- `src/init.ts` `runInit` (`configFile`, `dryRun`, `force`, `gitHooks`), `src/config.ts`
  `loadConfigFile` (round-trips `.sdd/harness.json`), `src/writer.ts`
  `planWrites`/`applyWrites`, `src/cli.ts` command wiring, `src/repo.ts`.
- `specs/archived/test-tiers` (tiers, golden regeneration procedure).
