# Tasks: ci-workflow-root

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

Every task cites the `roadmap.md` phase it belongs to and the `contract.md` item(s) it
delivers. Paths are the real files in this repository (TypeScript ESM under `src/`,
vitest specs under `tests/`, canonical templates under `templates/`).

## Phase 1: The declared write root and repository discovery

- [x] Task 1.1: Add `root?: 'repo'` to `GeneratedFile`, with the doc comment explaining
      why it is `'repo' | undefined` rather than a defaulted enum (WR-1) —
      `src/generators/types.ts`
- [x] Task 1.2: Create the module with its header comment stating its two jobs and its
      position in the import order (CLI-11) — `src/repo.ts`
- [x] Task 1.3: Implement `InstallLocation`, `GIT_ENTRY_NAME`, and `findRepoRoot`: an
      upward `fs.lstat` walk that accepts a `.git` entry of any type, treats a stat
      failure as absent, and terminates at the filesystem root (CW-2, CW-3) —
      `src/repo.ts`
- [x] Task 1.4: Implement `resolveInstallLocation`: resolve `targetDir`, call
      `findRepoRoot`, derive `prefix` with `path.relative` normalized to POSIX, and
      return the degenerate root (`repoRoot === targetDir`, `prefix === ''`,
      `insideRepo: false`) when no repository is found (CW-1, CW-3) — `src/repo.ts`
- [x] Task 1.5: Implement `componentSlug` as the five-step pure rule, with the rule
      restated in its doc comment (CW-5) — `src/repo.ts`
- [x] Task 1.6: Implement `ciWorkflowPathFor` and `ciWorkflowPathFromInstallDir`,
      deriving directory, base name, and extension from the imported
      `CI_WORKFLOW_PATH` — never re-typing any of the three (CW-4, `AGENTS.md` S5) —
      `src/repo.ts`
- [x] Task 1.7: Add `repoRoot` to `WritePlan` and implement `resolveWriteRoot` and
      `displayPath` (WR-3, WR-7) — `src/writer.ts`
- [x] Task 1.8: Implement the private `assertRepoRootPermitted`, throwing a plain
      `Error` naming both directories when `repoRoot` is neither `targetDir` nor a
      proper ancestor of it (WR-4, `AGENTS.md` S2) — `src/writer.ts`
- [x] Task 1.9: Give `planWrites` its defaulted `repoRoot` parameter and rewrite its
      per-file loop in the contracted order — resolve root, permit-check, the
      **unchanged** `assertContained`, `merge` skip, conflict probe at that root
      (WR-2, WR-6) — `src/writer.ts`
- [x] Task 1.10: Point `applyWrites` at `resolveWriteRoot` for the write target and at
      `displayPath` for the returned and disclosed paths (WR-7, WR-9) — `src/writer.ts`
- [x] Task 1.11: Confirm `assertContained`'s body is byte-unchanged by `git diff`, and
      record the confirmation in the phase note (SC5, WR-2) — `src/writer.ts`. Confirmed:
      `git diff src/writer.ts` shows the function body untouched — only its call sites
      moved from `targetDir` to the resolved `root`; re-confirmed by the auditor's own
      byte-diff against `HEAD` (audit.md, M3).
- [x] Task 1.12: Run `npm run build && npm run typecheck && npm test`; confirm the
      suite is at baseline and a scratch `harny init` tree is byte-identical to one
      produced before this phase (Phase 1 exit condition). Byte-identity was proven at
      the end of Phase 3 (Task 3.10) against the final generator rather than re-verified
      mid-phase; the outcome — every non-workflow path unchanged, and the workflow's
      non-header region unchanged — holds for Phase 1's own output too, since Phase 1
      added no caller of the new `root: 'repo'` capability.

## Phase 2: Placement-aware rendering

- [x] Task 2.1: Add `CiPlacement` and `ROOT_PLACEMENT`, with the doc comment stating
      why it is a struct rather than a bare string (XC-6) — `src/engine.ts`
- [x] Task 2.2: Give `buildFeedbackFiles` its defaulted `placement` parameter and
      forward it to `renderCiWorkflow` (CR-1) — `src/engine.ts`
- [x] Task 2.3: Give `renderCiWorkflow` its fourth parameter and emit
      `working-directory: <yamlQuote(prefix)>` after the `run:` line of every step it
      produces — install step, runner step, and unresolved-stack notice step — only
      when the prefix is non-empty (CR-2) — `src/engine.ts`
- [x] Task 2.4: Implement the private `renameCanonicalWorkflow`, applied only for a
      non-empty prefix, replacing the first `/^name:\s/` line with
      `name: <yamlQuote(\`harny feedback (<prefix>)\`)>` (CR-3) — `src/engine.ts`
- [x] Task 2.5: Add `renameCanonicalWorkflow`'s `HarnessError('TEMPLATE')` guard for a
      template with no `name:` line, worded like the missing-marker guard (CR-8) —
      `src/engine.ts`
- [x] Task 2.6: Set the workflow entry's `path` to `ciWorkflowPathFor(placement.prefix)`
      and add `root: 'repo'` unconditionally — the single assignment site in `src/`
      (WR-5, CW-8) — `src/engine.ts`
- [x] Task 2.7: Verify by inspection that `spliceGeneratedYamlBlock`,
      `renderInstallGateChain`, and `renderRunnerInvocation` are unedited, and that no
      component prefix reaches the runner path or any gate file (CR-2, C6) —
      `src/engine.ts`
- [x] Task 2.8: Revise the header comment to state the two placements, the narrowed
      canonical claim, and the `name:` exception, preserving the existing paragraphs on
      the two triggers, the `main` literal, and the runner invocation (CR-7) —
      `templates/ci/harny-feedback.yml`. Worded to avoid the literal substring
      "working-directory" (hyphenated) in the header prose, since T14's root-placement
      test asserts that token never appears anywhere in a root-placement file's bytes;
      the header instead says generated steps "declare that subdirectory as the
      directory they run from".
- [x] Task 2.9: Run the suite; confirm root-placement rendering is byte-equal to
      pre-Phase-2 output and that the only repo-wide generated diff so far is the
      template header (Phase 2 exit condition)

## Phase 3: Wiring, announcement, readiness, and dogfood regeneration

- [x] Task 3.1: Call `resolveInstallLocation(targetDir)` once at the top of step 11,
      before both builders, adding no fourteenth step (CW-10) — `src/init.ts`
- [x] Task 3.2: Emit the subdirectory-install warning naming the resolved repository
      root, the workflow destination, and the reason (CW-9) — `src/init.ts`
- [x] Task 3.3: Emit the not-in-a-repository warning naming the situation and its
      consequence; emit neither warning for a root install (CW-9) — `src/init.ts`
- [x] Task 3.4: Pass `{ prefix: location.prefix }` to `buildFeedbackFiles` and
      `buildDoctorFiles` (CW-7) — `src/init.ts`
- [x] Task 3.5: Pass `location.repoRoot` to `planWrites` in step 12 (WR-3) —
      `src/init.ts`
- [x] Task 3.6: Give `buildDoctorChecks` and `buildDoctorFiles` their defaulted
      `placement` parameter (DR-1) — `src/doctor.ts`
- [x] Task 3.7: Rewrite the `ci-workflow` entry's `anyOf`, `description`, and
      `remediation` to use `ciWorkflowPathFromInstallDir(placement.prefix)`, leaving
      every other check untouched (DR-1, DR-2) — `src/doctor.ts`
- [x] Task 3.8: Have `runDoctor` await `resolveInstallLocation(targetDir)` and forward
      the prefix to `buildDoctorChecks`, preserving RD-7 (DR-3) — `src/doctor.ts`
- [x] Task 3.9: Run `npx harny init <scratch> --yes --tools claude-code --stack
      typescript` and copy the produced workflow into this repo; verify the diff is
      header-only (XC-1) — `.github/workflows/harny-feedback.yml`. Scratch install was
      itself a fresh `git init` so the run took the root-install path; diff against the
      previously committed workflow was header-only, exactly the shape CR-1/CR-7 predict.
- [x] Task 3.10: Diff all eight FC-13 paths against the same scratch output; confirm
      seven are byte-unchanged from their committed form and only the workflow header
      differs (XC-1). All eight matched byte-for-byte once `--skills all` was added to
      the scratch invocation to match this repo's own optional-skill selection
      (`harny-adr`, `harny-standards`) recorded in `.sdd/harness.json` — an install-time
      configuration difference, not a regression in this feature.
- [x] Task 3.11: Manually verify the Phase 3 exit condition against a temporary git
      repository: `harny init <tmp>/apps/web` writes
      `<tmp>/.github/workflows/harny-feedback-apps-web.yml`, writes nothing named
      `harny-feedback*.yml` under `apps/web`, and `npx harny doctor <tmp>/apps/web`
      reports `OK` for `ci-workflow` (SC1, SC7, SC11). Verified directly in a scratch
      `git init` repo at `/tmp/harny-t311`; also covered continuously by
      `tests/e2e-init.test.ts` T24.

## Phase 4: Testing, validation, and the archived-contract correction

- [x] Task 4.1: Unit-test every export of the new module: the upward walk, `.git` as a
      directory, `.git` as a file, no repository above, prefix derivation, the slug
      table, `ciWorkflowPathFor('') === CI_WORKFLOW_PATH`, and the install-relative
      form (CW-1–CW-6) — `tests/repo.test.ts`. Written red by `sdd-test-writer`; all 21
      cases pass against the Phase 1 implementation.
- [x] Task 4.2: Test root resolution, the upward-only escape guard (sibling,
      descendant, and unrelated `repoRoot` all throw), conflict detection at the
      repository root, display paths, and that an absolute or escaping path still
      throws unchanged (WR-2, WR-4, WR-6, WR-7) — `tests/writer.test.ts`. Written red;
      all cases pass.
- [x] Task 4.3: Golden-test root-placement rendering against the pre-change output for
      the same template, profile, and stack (CR-1, SC2) — `tests/engine.test.ts`.
      Written red (declared exception: passed already at red time since nothing had
      changed the root-placement path yet); stayed green as the live regression guard
      through Phase 2/3.
- [x] Task 4.4: Test subdirectory rendering: `working-directory` on every generated
      step, the rewritten `name:` line, the runner path left unprefixed, and the gate
      files left unprefixed (CR-2, CR-3) — `tests/engine.test.ts`
- [x] Task 4.5: Byte-compare the canonical region (`on:` block, job, checkout step,
      markers, header) against `templates/ci/harny-feedback.yml` in **both**
      placements, asserting the `name:` line is the only difference in the
      subdirectory case (CR-3) — `tests/engine.test.ts`
- [x] Task 4.6: Extend the existing no-trigger-in-the-generated-block guard to the
      subdirectory placement, and assert no `defaults:` key is ever emitted (CR-5,
      CR-6) — `tests/engine.test.ts`
- [x] Task 4.7: Test the `ci-workflow` check entry for both placements and assert the
      root-placement `checks.json` is byte-identical to today's (DR-1, DR-2) —
      `tests/doctor.test.ts`
- [x] Task 4.8: Test the two `io.warn` messages, the write-plan contents for a
      subdirectory install, and `--dry-run` listing the `../`-prefixed display path
      (CW-9, WR-7, WR-8) — `tests/init.test.ts`
- [x] Task 4.9: Add the git fixtures — a temporary repository with a `.git` directory,
      one with a `.git` **file**, and a directory that asserts its own precondition of
      having no repository above it (CW-2, CW-3, `roadmap.md` risk row) —
      `tests/helpers/`. `tests/helpers/git.ts` was already present at red time
      (`makeGitRepoDir`, `makeGitFileRepoDir`, `assertNoRepoAbove`); no change needed.
- [x] Task 4.10: End-to-end: a subdirectory install inside a real temporary git
      repository writes the workflow at the root under the derived name, writes nothing
      named `harny-feedback*.yml` inside the install directory, and leaves every other
      artifact path unchanged (SC1, CW-6, CW-7) — `tests/e2e-init.test.ts`
- [x] Task 4.11: End-to-end: a second install at a different subdirectory produces a
      second, differently named workflow and does not disturb the first (SC8) —
      `tests/e2e-init.test.ts`
- [x] Task 4.12: End-to-end: an install that resolves to an existing workflow name
      exits 3 and writes nothing at either root without `--force` (SC9, WR-6, WR-9) —
      `tests/e2e-init.test.ts`. Covers the same-directory re-install; the auditor's AL-6
      notes the *distinct-directory, same-slug* variant has no automated case yet (LOW,
      left open per the human's scope decision) — verified by hand instead, per audit.md.
- [x] Task 4.13: End-to-end: an install with no repository above it writes the workflow
      inside the install directory, exits 0, and warns (SC3, CW-3, CW-9) —
      `tests/e2e-init.test.ts`
- [x] Task 4.14: End-to-end: `node <install>/.sdd/doctor/run-doctor.mjs` in a
      subdirectory install reports `OK` for `ci-workflow` when the root file exists and
      `FAIL` when it is removed (SC11, DR-1) — `tests/e2e-init.test.ts`
- [x] Task 4.15: Add the grep gate asserting exactly one `root: 'repo'` assignment in
      `src/`, beside the existing command-literal gate (WR-5, SC6) —
      `tests/feedback.test.ts`. The auditor's AL-3 notes the gate's regex matches only
      single-quoted assignments (`/\broot:\s*'repo'/g`); LOW, left open per the human's
      scope decision — today's repo style is single-quotes-only throughout, so this is
      currently theoretical, not a live gap.
- [x] Task 4.16: Assert `templates/doctor/run-doctor.mjs`, `templates/shared/probes.mjs`
      and `templates/hooks/run-feedback.mjs` are byte-unchanged by this feature
      (DR-4, SC13) — `tests/canonical-fidelity.test.ts`
- [x] Task 4.17: Append the dated correction note after the existing bullet at line 808,
      following the `feedback-path-hygiene:17` pattern, naming `@v4`→`@v5`, the date,
      this feature, and that no guarantee or finding changes (AC-1, AC-3) —
      `specs/archived/agent-feedback-controls/contract.md`
- [x] Task 4.18: Verify by `git diff --stat` and `git diff` that the archived edit is
      exactly one file, one added hunk, zero modified lines (AC-2, SC15). Confirmed:
      `git diff --stat` shows `1 file changed, 6 insertions(+)`; `git diff` shows a
      single appended hunk with no existing line touched.
- [x] Task 4.19: Give every new and modified test file a `Spec:` / `Covers:` header
      naming this feature and the ids it covers, with no contract id in any test name
      (`AGENTS.md` S6). All eight touched test files (`tests/repo.test.ts`,
      `tests/writer.test.ts`, `tests/engine.test.ts`, `tests/doctor.test.ts`,
      `tests/init.test.ts`, `tests/e2e-init.test.ts`, `tests/feedback.test.ts`,
      `tests/canonical-fidelity.test.ts`) carry this header, added by `sdd-test-writer`
      at red time.
- [x] Task 4.20: Run `npm run build && npm run typecheck && npm test`; confirm
      **633 passing / 1 failing** plus this feature's new passing tests, the single
      failure still being `tests/packaging.test.ts`'s vitest pin, and confirm
      `package.json` and `tests/packaging.test.ts` are untouched (XC-3, SC16). Final
      count: **704 passing / 1 failing** (the vitest-pin failure, unchanged); `git diff`
      confirms neither `package.json` nor `tests/packaging.test.ts` was touched.

## Blocked Items

[None yet]

## Notes

**For the executor.**

- **Do not edit `assertContained`.** Not its signature, not its body, not its message
  strings. The whole design depends on that function being the same one it was, called
  with a different directory. If a task seems to require editing it, the task is wrong —
  stop and say so.
- **`root: 'repo'` is assigned exactly once** (Task 2.6). If a second site seems to need
  it, that is a contract question, not an implementation choice.
- **Working directory, not path prefix** (Task 2.3, Task 2.7). Never prefix the runner
  path, the install gate files, or any probe gate file with the component path. If both
  were applied the paths would double-prefix and every probe would silently fail —
  which is a green CI that checked nothing, the exact failure class this feature exists
  to remove.
- **Order matters for the dogfood step.** Task 3.9 regenerates this repo's own workflow
  and must run *after* Task 2.8 revises the template and after Phase 3's wiring is
  final. Regenerating earlier bakes in an intermediate header.
- **Determinism check while implementing**: nothing in `src/repo.ts` may read the
  clock, the environment, the network, or spawn a process. It reads the filesystem and
  manipulates strings. That is the whole budget.
- **`--force` semantics are unchanged.** This feature does not add a force-adjacent
  flag, and `--force` overwriting a repository-root workflow is the user's deliberate
  choice, exactly as it is for any other path.

**For the test-writer.**

- Phase 1 and Phase 2 must be provable with **no git fixture at all**: `src/repo.ts`'s
  path helpers are pure, `renderCiWorkflow` is pure, and `planWrites` takes `repoRoot`
  as a parameter. Only Phase 3/4's e2e tests need a real repository on disk.
- The "no repository above" fixture must assert its own precondition before asserting
  behavior; a temp directory whose ancestors happen to contain a `.git` would make that
  test pass for the wrong reason.
- `tests/packaging.test.ts` is off limits (XC-3). Its single failure is expected and
  pre-existing.

**For the documentation role.** Four ADRs are queued in `contract.md` § "Decisions to
record as ADRs" (0031–0034); ADR 0033 must explicitly distinguish itself from ADR 0030
rather than appear to reverse it. The `specs/current/` amendments are tabulated in
`contract.md` § "Proposed amendments to `specs/current/`", including the `AGENTS.md`
§ Coding standards **S3** row added post-audit (AL-7).

**Post-audit status (2026-09-23).** `audit.md` verdict: **APPROVED WITH RESERVATIONS**.
Of its eleven findings, the human selected exactly two for pre-documentation cleanup:
**AL-1** (this checklist itself — resolved by the checkoff above) and **AL-7**
(`AGENTS.md` S3's containment clause — resolved by amending S3 in place and adding the
row to `contract.md`'s proposed-amendments table). The remaining LOW findings —
**AL-2** (a doc-comment wording imprecision in `assertRepoRootPermitted`), **AL-3** (the
WR-5 grep gate matches single-quoted assignments only), **AL-4** (the no-repository
warning's tense), **AL-5** (the CLI's post-write report does not list the `../`-prefixed
path), **AL-6** (no automated case for a distinct-directory same-slug collision), and
**AL-8** (a repo-wide, pre-existing S6 naming-convention inconsistency, not introduced by
this feature) — are deliberately left open per the human's explicit scope decision. AL-9
(CI re-verification on push) and AL-10 (the ADRs) are informational/queued, not
outstanding work for this role. AL-11 records the auditor's own falsifiability probes,
reverted cleanly.

## Completion

Implementation phases 1–4 complete: **2026-09-23**. Suite at **704 passing / 1 failing**
(the pre-existing, out-of-scope `tests/packaging.test.ts` vitest-pin failure); `npm run
build` and `npm run typecheck` exit 0. Post-audit cleanup (AL-1, AL-7 only, per the
human's explicit selection): **2026-09-23**.
