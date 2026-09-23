# Roadmap: ci-workflow-root

Four phases, ordered so that the safety mechanism exists before anything uses it, the
renderer is proven pure before it is wired to the filesystem, and the dogfood
regeneration happens only after the generator is final.

**Red phase first.** Per `AGENTS.md` § Working conventions, `sdd-test-writer` writes
failing tests for each phase's contract items before `sdd-executor` implements it. The
phase boundaries below are drawn so each one has a testable surface that does not
require the next.

**A deliberate ordering property:** after Phase 1 and after Phase 2, the full suite must
be green at the current baseline **without any output change at all** — Phase 1 adds a
mechanism nothing uses, and Phase 2's new behavior is reachable only through a
non-default argument no caller passes yet. The first byte of generated output changes in
Phase 3. That makes a Phase-3 regression unambiguous: if FC-13 byte-identity breaks, it
broke in the wiring, not in the renderer.

## Implementation Phases

### Phase 1: The declared write root and repository discovery
**Goal**: The capability to write above the install directory exists, is narrow, is
guarded, and is used by nothing. `src/repo.ts` can answer where the repository root is.
No generated output changes.
**Dependencies**: None
**Estimated complexity**: Medium

1. Add `root?: 'repo'` to `GeneratedFile` in `src/generators/types.ts`, with the doc
   comment WR-1 specifies (explicitly modelled on `merge?: true`).
2. Create `src/repo.ts` with `InstallLocation`, `GIT_ENTRY_NAME`, `findRepoRoot`,
   `resolveInstallLocation`, `componentSlug`, `ciWorkflowPathFor`, and
   `ciWorkflowPathFromInstallDir`. `findRepoRoot` walks upward with `fs.lstat`,
   accepts a `.git` entry of any type (CW-2), treats a stat failure as absent, and
   stops at the filesystem root. `ciWorkflowPathFor`/`ciWorkflowPathFromInstallDir`
   derive every path component from `CI_WORKFLOW_PATH` rather than re-typing it (CW-4,
   S5).
3. Add `repoRoot` to `WritePlan`, plus `resolveWriteRoot`, `displayPath`, and the
   private `assertRepoRootPermitted` in `src/writer.ts`. Give `planWrites` its
   defaulted third parameter.
4. Rewrite `planWrites`' per-file loop to resolve each file's root, apply
   `assertRepoRootPermitted` for `root: 'repo'` files, call the **unchanged**
   `assertContained` against that root, and probe for conflicts at that root.
   `WritePlan.conflicts` now carries display paths.
5. Point `applyWrites` at `resolveWriteRoot` and have it report display paths.
6. Confirm by inspection and by `git diff` that `assertContained`'s own body is
   byte-unchanged (SC5).

**Exit condition**: `npm run build`, `npm run typecheck`, and the full suite are green
at the baseline; a fresh `npx harny init` into a scratch directory produces a
byte-identical tree to one produced before this phase.

### Phase 2: Placement-aware rendering
**Goal**: `buildFeedbackFiles` and `renderCiWorkflow` can render either placement
correctly, as pure functions, with no filesystem access and no caller yet passing a
non-default placement.
**Dependencies**: Phase 1
**Estimated complexity**: Medium

1. Add `CiPlacement` and `ROOT_PLACEMENT` to `src/engine.ts`; give `buildFeedbackFiles`
   its defaulted second parameter.
2. Give `renderCiWorkflow` its fourth parameter. For a non-empty prefix, emit
   `working-directory: <yamlQuote(prefix)>` after the `run:` line of **every** step the
   generated block produces — the install step, the runner step, and the
   unresolved-stack notice step (CR-2, and the FC-2 row of the Error Handling
   Contract). Leave `spliceGeneratedYamlBlock`, `renderInstallGateChain`, and
   `renderRunnerInvocation` untouched.
3. Add the private `renameCanonicalWorkflow`, applied only when the prefix is non-empty
   (CR-3), with its `HarnessError('TEMPLATE')` guard (CR-8).
4. Set `path: ciWorkflowPathFor(placement.prefix)` and `root: 'repo'` on the workflow
   entry in `buildFeedbackFiles` — the one and only assignment of the non-default root
   (WR-5), unconditional (CW-8).
5. Revise `templates/ci/harny-feedback.yml`'s header comment per CR-7. Do **not**
   regenerate this repo's own workflow yet — that is Phase 3, after the generator is
   final.

**Exit condition**: `renderCiWorkflow` with `prefix: ''` produces output byte-identical
to the pre-Phase-2 function for the same inputs, proven by a golden test; the suite is
green at the baseline. The only diff in generated output across the whole repo so far is
the template header.

### Phase 3: Wiring, announcement, readiness, and dogfood regeneration
**Goal**: A real `npx harny init <subdir>` lands the workflow at the repository root,
says so, and the readiness check agrees. harny's own scaffolded files are back in sync.
**Dependencies**: Phase 2
**Estimated complexity**: Medium

1. In `src/init.ts` step 11, call `resolveInstallLocation(targetDir)` once, before the
   feedback and doctor builders. Do not add a step (CW-10).
2. Emit the two `io.warn` messages of CW-9 — one for a subdirectory install (naming the
   resolved repository root, the destination, and the reason), one for a directory not
   inside any repository. Emit neither for a root install.
3. Pass `{ prefix: location.prefix }` to `buildFeedbackFiles` and `buildDoctorFiles`;
   pass `location.repoRoot` to `planWrites` in step 12.
4. Give `buildDoctorChecks` and `buildDoctorFiles` their defaulted `placement`
   parameter; rewrite the `ci-workflow` entry's `anyOf`, `description`, and
   `remediation` to use `ciWorkflowPathFromInstallDir` (DR-1, DR-2).
5. Have `runDoctor` `await resolveInstallLocation(targetDir)` and forward the prefix, so
   the verb and the generated `checks.json` come from the same function (DR-3, RD-7).
6. Regenerate this repository's own `.github/workflows/harny-feedback.yml` by running
   `harny init` against a scratch directory with
   `--yes --tools claude-code --stack typescript` and copying the produced file in.
   Verify the diff is header-only.
7. Re-prove FC-13: diff all eight enumerated paths against the same scratch output
   (XC-1). Seven must be byte-unchanged from their committed form; only the workflow
   header differs.

**Exit condition**: `npx harny init <tmp-repo>/apps/web --yes --tools claude-code
--stack typescript` writes `<tmp-repo>/.github/workflows/harny-feedback-apps-web.yml`
and nothing named `harny-feedback*.yml` under `apps/web`; `npx harny doctor
<tmp-repo>/apps/web` reports `OK` for `ci-workflow`; FC-13 is re-proven.

### Phase 4: Testing, validation, and the archived-contract correction
**Goal**: Every contract item has a test or a stated reason it cannot have one; the
stale `actions/checkout@v4` sentence is corrected; the suite baseline is intact.
**Dependencies**: Phase 3
**Estimated complexity**: Medium

1. Complete the test set across `tests/repo.test.ts` (new), `tests/writer.test.ts`,
   `tests/engine.test.ts`, `tests/doctor.test.ts`, `tests/init.test.ts`, and
   `tests/e2e-init.test.ts`, per `audit.md`'s Test Coverage table.
2. Add the WR-5 grep gate (exactly one `root: 'repo'` assignment in `src/`), modelled
   on the existing BG-7 command-literal gate in `tests/feedback.test.ts`.
3. Add the git-fixture helpers the e2e tests need: a temporary repository with a `.git`
   **directory**, one with a `.git` **file** (CW-2), and a directory with no repository
   above it. The last one requires care on macOS, where a temp directory's ancestors may
   or may not contain a `.git`; the fixture must assert its own precondition rather than
   assume it.
4. Append the dated correction note to
   `specs/archived/agent-feedback-controls/contract.md` after line 808 (AC-1–AC-3).
   Verify by `git diff --stat` that exactly one file and one hunk changed, and that no
   existing line was modified.
5. Run `npm run build && npm run typecheck && npm test`; confirm the baseline is
   **633 passing / 1 failing** plus this feature's new passing tests, with the single
   failure still `tests/packaging.test.ts`'s vitest pin (XC-3).
6. Record the four decisions of `contract.md` § "Decisions to record as ADRs" so
   `harny-adr` can write ADRs 0031–0034 at documentation time.

**Exit condition**: suite at baseline + new tests; `git diff` on
`specs/archived/**` limited to the single correction hunk;
`tests/packaging.test.ts` and `package.json` untouched.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FC-13 byte-identity silently breaks for the root install | Medium | High — the dogfood guarantee is the repo's main regression detector | Phase 2's golden test compares root-placement rendering against pre-change output before any wiring exists; Phase 3 step 7 re-proves all eight paths against a live scratch install; SC2 compares the non-header region explicitly |
| Weakening containment by accident while adding the second root | Low | Critical — the guard is the reason a generator cannot write anywhere it likes | `assertContained` is not edited at all (SC5, WR-2); the escape is a separate, narrower assertion (`assertRepoRootPermitted`) that only ever permits upward movement along the install directory's own ancestry; a grep test bounds the declaration to one site (WR-5) |
| The upward walk finds an unexpected ancestor repository (e.g. `$HOME/.git` from a dotfiles repo) and writes a workflow into the user's home directory | Medium | High — a surprising write outside the project | Never silent: CW-9 warns with the resolved root and the destination on every subdirectory install; `--dry-run` shows the `../`-prefixed path (WR-7); conflict detection refuses to overwrite anything already there (WR-6) |
| A subdirectory install's workflow runs the wrong commands against the wrong tree | Medium | High — a green CI that checked nothing, the same failure class this feature exists to remove | CR-2 makes the step's working directory the single mechanism, so the runner path, install gate files, probe gate files and the `.` sentinel all move together; an e2e test asserts the generated step's `working-directory` and asserts the runner path is **not** additionally prefixed |
| Two installs contend for one workflow file name | Low | Medium — one install's gate silently replaced | Deterministic slug (CW-5) plus conflict detection at the repository root (WR-6); a collision is exit 3 with the path named, never an overwrite (ADR 0034) |
| `monorepo-mode` has to undo something this feature adds | Medium | Medium — churn and a contradicted ADR | XC-6 states the extension path concretely; scoping is placed inside the generated block and never in the canonical region (CR-5); no per-component job or workflow is introduced; `CiPlacement` is a struct so a component list is an added field |
| The canonical-region narrowing is read as licence to render more of it later | Low | Medium — erosion of a useful invariant | CR-3 enumerates the canonical region item by item and names the `name:` line as the *only* exception, in both the contract and the template header; ADR 0032 records the boundary |
| The `.git`-as-a-file case is missed, so worktrees and submodules fall through to the no-repository branch | Medium | Medium — the original bug recurs in a narrower shape | CW-2 is a guarantee with its own fixture (Phase 4 step 3); detection is by entry presence, not `isDirectory()` |
| Determinism is quietly violated because output now depends on location | Low | High — S3 is a standing repo invariant | CW-11 states the widened input set explicitly and CLI-4 is amended rather than left to rot; every new input is a pure function of the checkout on disk — no clock, no network, no remote git state, no subprocess |
| The archived-contract edit drifts beyond the one correction | Low | Medium — archived specs are immutable by rule (`AGENTS.md`) | AC-2 bounds it to one appended blockquote; Phase 4 step 4 verifies by `git diff --stat` that no existing line changed |
| A test fixture's own ancestry contains a `.git`, making the "no repository" test pass or fail for the wrong reason | Medium | Low — a false-green test | The fixture asserts its own precondition before exercising the behavior (Phase 4 step 3) |

## File Change Map

**Created**
- `src/repo.ts` — CREATE — repository-root discovery (`findRepoRoot`,
  `resolveInstallLocation`), the slug rule (`componentSlug`), and the two derived
  workflow paths (`ciWorkflowPathFor`, `ciWorkflowPathFromInstallDir`).
- `tests/repo.test.ts` — CREATE — unit coverage for every export of `src/repo.ts`:
  the upward walk, `.git` as directory and as file, the no-repository case, the slug
  table, `ciWorkflowPathFor('') === CI_WORKFLOW_PATH`, and the install-relative form.

**Modified — source**
- `src/generators/types.ts` — MODIFY — one optional member on `GeneratedFile`:
  `root?: 'repo'`. No `Generator` change.
- `src/writer.ts` — MODIFY — `WritePlan.repoRoot`; `resolveWriteRoot`; `displayPath`;
  private `assertRepoRootPermitted`; `planWrites`' defaulted third parameter and
  per-file root resolution; `applyWrites` resolving and reporting per root.
  **`assertContained` itself is not edited.**
- `src/engine.ts` — MODIFY — `CiPlacement`, `ROOT_PLACEMENT`, `buildFeedbackFiles`'
  defaulted placement parameter, `renderCiWorkflow`'s fourth parameter, the new private
  `renameCanonicalWorkflow`, and the `root: 'repo'` + derived-path workflow entry.
- `src/doctor.ts` — MODIFY — defaulted `placement` on `buildDoctorChecks` and
  `buildDoctorFiles`; the `ci-workflow` entry's three placement-derived strings;
  `runDoctor` resolving the install location before building checks.
- `src/init.ts` — MODIFY — step 11 resolves the install location, emits the two
  placement warnings, and forwards the prefix to both builders; step 12 passes
  `repoRoot` to `planWrites`.

**Modified — canonical templates and dogfood artifacts**
- `templates/ci/harny-feedback.yml` — MODIFY — header comment only (CR-7). The YAML
  below it is byte-unchanged.
- `.github/workflows/harny-feedback.yml` — MODIFY — regenerated; header-only diff
  (XC-1).

**Modified — tests**
- `tests/writer.test.ts` — MODIFY — root resolution, the upward-only escape guard,
  conflict detection at the repository root, display paths, and an explicit assertion
  that an absolute or escaping path still throws.
- `tests/engine.test.ts` — MODIFY — root-placement golden equality; subdirectory
  rendering (`working-directory` on every generated step, renamed `name:`, unprefixed
  runner path); the canonical region byte-compared against the template in both
  placements; the extended no-trigger-in-the-block guard.
- `tests/doctor.test.ts` — MODIFY — the `ci-workflow` entry for both placements;
  byte-identity of the root-placement `checks.json`.
- `tests/init.test.ts` — MODIFY — the two warnings, the write-plan contents for a
  subdirectory install, and `--dry-run` listing the `../`-prefixed path.
- `tests/e2e-init.test.ts` — MODIFY — end-to-end subdirectory install inside a real
  temporary git repository; `.git`-as-a-file fixture; no-repository fixture; the
  second-install conflict; the artifact list for a subdirectory install.
- `tests/feedback.test.ts` — MODIFY — the WR-5 grep gate beside the existing BG-7 gate.

**Modified — specs**
- `specs/archived/agent-feedback-controls/contract.md` — MODIFY — one appended dated
  blockquote after the existing bullet at line 808 (AC-1–AC-3). No existing line edited.

**Explicitly not touched**
- `package.json`, `package-lock.json`, `tests/packaging.test.ts` (XC-3).
- `templates/hooks/run-feedback.mjs`, `templates/shared/probes.mjs`,
  `templates/doctor/run-doctor.mjs` and their three scaffolded `.sdd/` copies (DR-4).
- All five files in `src/generators/` other than `types.ts`; `src/mcp.ts`;
  `src/config.ts`; `src/vocabulary.ts`; `src/templates.ts`; `src/prompts.ts`;
  `src/cli.ts`; `src/errors.ts`.
- Every `templates/roles/`, `templates/skills/`, `.agents/skills/`, and
  `.claude/` file.
