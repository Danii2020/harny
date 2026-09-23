# Intent: ci-workflow-root

**Shipped: 2026-09-23**

## Problem Statement

`npx harny init apps/web --stack typescript` writes the GitHub Actions workflow to
`apps/web/.github/workflows/harny-feedback.yml`. GitHub only ever reads
`.github/workflows/` at the **repository root**, so that file is dead on arrival: the
scaffolded computational-feedback CI gate — one half of the feedback row in
`AGENTS.md` § "Feedforward vs. feedback" — silently never runs. Nothing fails, nothing
warns, and `npx harny doctor` reports the workflow present, because its `ci-workflow`
check looks for exactly the path `init` wrote.

Every other artifact harny writes (`.sdd/`, `.claude/`, `.cursor/`, `.kiro/`,
`.github/hooks/`, agents, skills, conductor, MCP config) is correctly
subdirectory-local: a second harness alongside a first is a second, independent
install. The CI workflow is the **one artifact whose correct location is a property of
the repository, not of the install directory**. harny has never modelled that
distinction, because until now every install was assumed to be at a repository root —
which is exactly the assumption `src/writer.ts:19`'s `assertContained` encodes and
enforces.

Who is affected: anyone running `harny init` into a subdirectory. That is not a corner
case — it is the monorepo shape. The bug was found by dogfooding
(`plan.md` § "Monorepo dogfooding", `project-agentcore-app`, 2026-09-20): a second
install for a Next.js frontend alongside a root Python install produced a workflow
GitHub never read. It was repaired by hand — the file was moved to the repository root
and renamed `harny-feedback-web.yml`, then given `on.pull_request.paths: [apps/web/**]`
and `defaults.run.working-directory: apps/web`. That hand-fix is **evidence of the
shape of the problem, not a specification to copy**; this feature re-derives the
answer under harny's own constraints and departs from the hand-fix on two of its three
points (see § Prior Art).

The silence is the severe part. A CI gate that is absent is a known gap; a CI gate that
is present, committed, named, and inert is a false green.

## Goals

1. **G1 — Land the workflow where GitHub reads it.** `harny init <subdir>` writes the
   CI workflow at the enclosing git repository's root, not inside the install
   directory, and degrades gracefully (today's behavior, plus a named warning) when
   the install directory is not inside a git repository at all.
2. **G2 — Make "may write above the install directory" explicit, narrow, and
   auditable.** `assertContained` is not weakened, bypassed, or made conditional. A
   generated file declares which root its path is relative to; exactly one artifact in
   all of `src/` declares the non-default root, and a reader can grep for it. Every
   write that lands outside the install directory is announced.
3. **G3 — Scope a subdirectory install's workflow to its component, and never let a
   second install clobber a first.** The workflow runs its component's lint/type-check
   commands against that component, and its file name is derived deterministically
   from the install path so two installs in one repository do not contend for one
   name. If two installs ever do resolve to the same name, the existing conflict rule
   (`cli-init.md` CLI-5) refuses loudly rather than overwriting silently.
4. **G4 — Keep the git-root install byte-identical.** For an install whose directory
   *is* the git root (harny's own case, and the overwhelmingly common downstream
   case), the generated workflow's **generated block, triggers, job, and checkout step
   are byte-identical to what harny produces today**, so `feedback-controls.md` FC-13's
   dogfood guarantee is preserved and provable. (The template's header comment does
   change — see § Constraints C4 — and harny's own committed workflow is regenerated
   in lockstep in the same feature.)
5. **G5 — Keep readiness truthful.** `npx harny doctor`'s `ci-workflow` check points at
   wherever the workflow actually landed, for a subdirectory install as well as a
   root install, and the verb and the direct `run-doctor.mjs` invocation still agree
   (`readiness-checks.md` RD-7).
6. **G6 — Reconcile the canonical-CI-region claim deliberately, and correct the one
   stale sentence that already contradicts reality.** `templates/ci/harny-feedback.yml`'s
   header and `agent-feedback-controls`' contract both claim the structure outside the
   generated-block markers is canonical and copied verbatim by every run. This feature
   states precisely how far that claim still holds and records the reasoning as an ADR.
   Separately, `specs/archived/agent-feedback-controls/contract.md:808` still reads
   "including `actions/checkout@v4`", which became false on 2026-09-22 when the pin
   moved to `@v5`; it gets a dated correction note in the same pattern
   `dogfood-quick-fixes` used for its AL-11 correction.
7. **G7 — Leave `monorepo-mode` room to extend, not to undo.** The next spec adds
   `components: [{path, stack}]` to a single install, with a CI shape already decided
   by the human: **one job at the git root making one runner call**, the runner
   resolving each touched path to its component — explicitly not a per-component job
   matrix. Every structural choice here is made so that shape is the natural
   continuation of it.

## Success Criteria

- [ ] **SC1** — `npx harny init <subdir>` inside a git repository writes the CI
      workflow under the repository root's `.github/workflows/`, and writes no file
      named `harny-feedback*.yml` anywhere inside `<subdir>`.
- [ ] **SC2** — `npx harny init <dir>` where `<dir>` *is* the git root writes
      `.github/workflows/harny-feedback.yml` whose bytes are identical to the file
      produced by the pre-change code for the same config, template, and stack, except
      for the template header comment revised under C4 — proven by a golden-content
      test over the non-header region, not by inspection.
- [ ] **SC3** — `npx harny init <dir>` where `<dir>` is not inside any git repository
      writes the workflow exactly where it writes it today (`<dir>/.github/workflows/
      harny-feedback.yml`), exits 0, and emits one `io.warn` naming the situation and
      the consequence.
- [ ] **SC4** — A git worktree or submodule checkout, where `.git` is a **file** rather
      than a directory, is detected as a repository root; the run does not crash and
      does not fall through to the "no repository" branch.
- [ ] **SC5** — `assertContained` is called for **every** generated file, with the same
      body it has today (no new parameter, no new escape branch, no call-site
      suppression); a `git diff` of `src/writer.ts`'s `assertContained` function shows
      no change to its logic.
- [ ] **SC6** — Exactly one location in `src/` assigns the non-default write root, and
      a test asserts that count by grep, in the same style as
      `agent-feedback-controls` BG-7's command-literal gate.
- [ ] **SC7** — A subdirectory install's workflow runs its component's commands against
      the component, not the whole repository: the generated install step and the
      generated runner step both execute with the component directory as their working
      directory, and the runner path inside the step is **not** additionally prefixed
      with the component path.
- [ ] **SC8** — Two installs at two different subdirectories of one repository produce
      two workflow files with two different names, and neither overwrites the other.
- [ ] **SC9** — A second install that resolves to a name already on disk is reported as
      a `CONFLICT` (exit 3) with the path named, and **nothing at all is written** —
      including nothing inside the install directory — unless `--force` is given.
- [ ] **SC10** — Every planned or written path that lands outside the install directory
      is displayed relative to the install directory with a leading `../`, in both the
      `--dry-run` listing and the post-write report, so an out-of-target write is never
      indistinguishable from an in-target one.
- [ ] **SC11** — `.sdd/doctor/checks.json`'s `ci-workflow` entry names the workflow's
      real location for both placements; running `node .sdd/doctor/run-doctor.mjs`
      from a subdirectory install reports `OK` for `ci-workflow` when the file exists
      at the repository root and `FAIL` when it does not.
- [ ] **SC12** — `npx harny doctor <subdir>` and the direct runner invocation in the
      same directory reach the same ready/not-ready result (RD-7 preserved) —
      i.e. the verb resolves the repository root the same way `init` did.
- [ ] **SC13** — `templates/doctor/run-doctor.mjs` and `templates/shared/probes.mjs`
      are byte-unchanged by this feature, so two of FC-13's eight paths are preserved
      by construction rather than by re-verification.
- [ ] **SC14** — All eight FC-13 dogfood paths are re-proven byte-identical to a fresh
      `npx harny init --tools claude-code --stack typescript` run after this feature
      lands, with harny's own `.github/workflows/harny-feedback.yml` regenerated and
      committed in the same change.
- [ ] **SC15** — `specs/archived/agent-feedback-controls/contract.md` carries a dated
      correction note about the `actions/checkout@v4` sentence, placed after the
      existing text, with the original sentence left byte-unchanged.
- [ ] **SC16** — The test suite's baseline is preserved: **633 passing, 1 failing**,
      where the 1 failure is the pre-existing `tests/packaging.test.ts` vitest-version
      pin, plus whatever this feature's own new tests add to the passing count. No
      previously passing test is made to fail, and the known failure is not "fixed".

## Non-Goals

- **`components: [{path, stack}]` and multi-stack resolution.** That is `monorepo-mode`,
  the next spec. This feature resolves exactly one stack for exactly one install
  directory, as today. It only guarantees it does not foreclose the component shape.
- **Per-component job matrices in CI.** Explicitly rejected by the human for
  `monorepo-mode`; nothing here introduces one, and the structure chosen here is the
  one that makes the single-job shape the natural extension.
- **Any change to `package.json`** — no new dependency, no new script, no version
  bump — and no change to `tests/packaging.test.ts`. That file has one **known,
  pre-existing failure** (it pins `vitest: '4.1.10'` while `package.json` carries
  `^4.1.11`). It stays failing. Fixing it is a different feature's business.
- **Deduplicating two installs' harness artifacts.** The duplicated `.sdd/`, duplicated
  skills, and duplicated ADR registries that `plan.md` § "Monorepo dogfooding" also
  records are `monorepo-mode`'s problem, not this one.
- **Any change to `HarnessConfig` or `.sdd/harness.json`'s schema.** The install's
  placement is a fact about where the directory sits, re-derivable at any time from
  the filesystem; persisting it would create a second source of truth that can go
  stale after a directory move.
- **Teaching the CI workflow about more than one component.** One install, one
  component, one runner call.
- **Changing `actions/checkout@v5`, the `pull_request` trigger, the `push`-to-`main`
  trigger, `runs-on`, or the job id.** ADR 0030's hardcoded `main` stands untouched.
- **Detecting or composing with a repository's pre-existing non-harny workflows.**
  harny writes its own file and, per CLI-5, refuses to overwrite anything it did not
  plan to write.

## Constraints

- **C1 — `assertContained` is load-bearing and stays intact.** `src/writer.ts:19`
  throws if a generated path is absolute or resolves outside `targetDir`, and
  `planWrites` calls it for every file. It is a deliberate safety invariant
  (`AGENTS.md` S3, `cli-init.md` CLI-4) and it is the central obstacle here, because a
  subdirectory install's correct workflow destination is *above* `targetDir`. The
  capability to write above the install directory must be added **beside** this guard —
  as a declared, greppable property of the one artifact that needs it — never by
  loosening the guard itself.
- **C2 — FC-13 dogfood byte-identity is the safety net.** `feedback-controls.md` FC-13
  enumerates eight paths in this repository that must stay byte-identical to fresh
  `npx harny init --tools claude-code --stack typescript` output. harny installs at its
  own git root, so the git-root path through the new code must be the unchanged path.
  This is the strongest available regression detector for this feature and is promoted
  to an explicit contract guarantee with its own test.
- **C3 — No git-root detection exists anywhere in `src/` today.** `grep` for
  `git rev-parse|gitRoot|\.git` returns only unrelated matches. This feature introduces
  the first. It must handle: `.git` as a **directory** (normal clone), `.git` as a
  **file** (worktrees, submodules), and **no repository at all** (a directory that is
  simply not in git — `init` may legitimately target one, and it must degrade, not
  crash). It must also not be so eager that it silently walks past the user's intent —
  a resolved root that is not the install directory is always announced.
- **C4 — The canonical CI region.** `templates/ci/harny-feedback.yml`'s header states
  that the structure outside the generated-block markers (triggers, checkout) is
  canonical and copied verbatim by every run;
  `specs/archived/agent-feedback-controls/contract.md` says the same. Subdirectory
  scoping touches that region unless it is deliberately placed elsewhere. This feature
  must state, in `contract.md`, exactly which part of that claim survives unchanged and
  which is narrowed, and record the reasoning as an ADR. A consequence of any header
  revision: harny's own committed workflow is regenerated in the same change and C2's
  byte-identity is re-proven against the revised template, not the old one.
- **C5 — `CI_WORKFLOW_PATH` has one home and three consumers.** It is declared once at
  `src/feedback.ts:258` and consumed at `src/engine.ts:314` (the write-plan entry) and
  `src/doctor.ts:207–209` (the readiness check). `AGENTS.md` S5 forbids re-literalling
  it at a call site; any derived name must be *derived from* that constant, not typed
  again beside it.
- **C6 — Working directory and path prefix are not the same answer.** The runner path
  `.sdd/feedback/run-feedback.mjs` in `renderRunnerInvocation` is relative to the
  install directory; from the git root the same file is
  `apps/web/.sdd/feedback/run-feedback.mjs`. So are every probe gate file
  (`package-lock.json`, `tsconfig.json`, the eslint config candidates) and the
  `--whole-project` `.` sentinel. Exactly one of the two mechanisms — change the step's
  working directory, or prefix the paths — may be used, and it must be the one that
  moves *all* of those relative resolutions together.
- **C7 — Forward compatibility with `monorepo-mode`.** That spec's CI shape is already
  decided: one job at the git root making one runner call, the runner resolving each
  path to its component. The mechanism chosen here must make that a *narrowing of use*,
  not a reversal — a root-level install with no per-step scoping is already the shape
  `monorepo-mode` wants, so `monorepo-mode` should need to delete nothing this feature
  adds.
- **C8 — Repo coding standards.** `AGENTS.md` S1 (TypeScript, ESM, `nodenext`, `.js`
  specifiers on relative imports, `node:` prefix for builtins), S2 (`HarnessError` is
  the only deliberate throw; a containment violation stays a plain `Error`, because it
  is a generator bug, not a user error), S3 (determinism, containment, trailing
  newline), S4 (no new dependency without an explicit contract line — this feature
  declares **none**), S5 (import a shared constant, never re-literal it), S6 (vitest;
  `tests/` mirrors `src/`; `Spec:`/`Covers:` header; contract ids never in test names;
  offline by default), S7 (tool-neutral content never names one tool's mechanic as the
  only possibility).
- **C9 — `cli-init.md` CLI-1's thirteen-step `runInit` sequence.** Resolving the
  repository root is new work inside `runInit`. It must be folded into an existing
  step — as `context7-mcp` folded MCP config building into step 11 — never added as a
  fourteenth step.
- **C10 — `cli-init.md` CLI-11: no import cycles; `src/vocabulary.ts` imports nothing.**
  Any new module takes its place in the existing strictly-downward import order
  (`cli.ts` → `init.ts` → `doctor.ts` → `engine.ts` / `feedback.ts` / `templates.ts` →
  `vocabulary.ts`).
- **C11 — Determinism (`cli-init.md` CLI-4 / `AGENTS.md` S3) gains an input.** Generated
  output now depends on the install directory's position inside its repository. Two
  runs at the same location with the same config and templates must still be
  byte-identical; the contract must state the widened input set rather than let CLI-4
  quietly become false.

## Prior Art

- **`specs/archived/agent-feedback-controls/`** — the origin of `templates/ci/
  harny-feedback.yml`, `CI_WORKFLOW_PATH`, `renderCiWorkflow`,
  `spliceGeneratedYamlBlock`, `renderRunnerInvocation`, the `--whole-project` CI mode,
  and FC-13's dogfood guarantee. Post-audit amendment A1 is the precedent for changing
  the CI surface only, leaving the hook surface untouched; this feature does the same.
- **`specs/archived/context7-mcp/`** — the precedent for an artifact family that
  **reads from `targetDir` while building** (`buildMcpFiles(generators, { targetDir,
  force })`), for a new optional member on `GeneratedFile` typed `true | undefined` so
  no existing call site opts out (`merge?: true`), for a corresponding change in
  `planWrites`' treatment of those files, and for widening `runInit` step 11 rather
  than adding a fourteenth step. This feature follows all four precedents deliberately;
  `root?: 'repo'` is the structural sibling of `merge?: true`.
- **`specs/archived/dogfood-quick-fixes/` ADR 0030** — rejected deriving the default
  branch from git (`git symbolic-ref refs/remotes/origin/HEAD`) because it is
  non-deterministic across repository states and violates S3. That reasoning is about
  **remote** state and about workflow *content*; this feature derives placement from
  **local filesystem** state. The distinction is real but must be argued, not assumed,
  and is recorded as an ADR — otherwise this feature looks like a reversal of 0030.
  That feature's **AL-11 dated correction note**
  (`specs/archived/feedback-path-hygiene/contract.md:17–23`) is the exact pattern G6's
  correction follows: a dated blockquote placed after the existing text, naming the
  finding it closes, with the original sentence untouched.
- **`specs/archived/readiness-doctor/` and `ai-sdlc-readiness/`** — `buildDoctorChecks`
  is the single implementation shared by the `doctor` verb and the generated
  `checks.json` (RD-7); every path in a check is data, derived from the module that
  owns it, never a literal in `run-doctor.mjs`. The runner resolves each `anyOf` entry
  with `path.join(cwd, p)`, which already tolerates a `../`-prefixed entry — which is
  why G5 costs no runner change (SC13).
- **`plan.md` § "Monorepo dogfooding"** (`project-agentcore-app`, 2026-09-20) — the
  real-world provenance. Its hand-fix moved the file to the root as
  `harny-feedback-web.yml`, added `on.pull_request.paths: [apps/web/**]`, and added
  `defaults.run.working-directory: apps/web`. This feature adopts the *move* and a
  deterministic form of the *rename*, adopts the working-directory idea but at a
  different level of the YAML, and **declines the `paths:` filter** — GitHub's own
  documentation states that a workflow skipped by path filtering leaves its checks in a
  `Pending` state, which blocks pull requests that require those checks. The
  contract and an ADR record that departure.
- **GitHub Actions facts, verified 2026-09-22 via Context7 against
  `docs.github.com/en/actions`**: workflow files are read only from
  `.github/workflows/` at the repository root; `jobs.<job_id>.steps[*].working-directory`
  is valid on a `run` step and sets that one step's working directory;
  `defaults.run.working-directory` sets it for every `run` step at job or workflow
  level; a workflow skipped by path or branch filtering leaves associated checks
  `Pending`, blocking merges that require them.
