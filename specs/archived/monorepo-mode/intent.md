# Intent: monorepo-mode

**Shipped: 2026-09-23**

## Problem Statement

One `harny init` resolves exactly one `stack`. `HarnessConfig.stack` is a single
optional string (`src/config.ts:52`), it resolves to at most one `StackProfile`
(`resolveStackProfile`, `src/feedback.ts`), and every downstream surface —
`.sdd/feedback/run-feedback.mjs`'s command set, each tool's hook config, the CI
workflow's generated block, and `.sdd/doctor/checks.json`'s `commands` — is built
from that one profile.

A repository with a Python/FastAPI backend and a TypeScript/Next.js frontend
therefore cannot be served by one install. Dogfooding recorded this on 2026-09-20
in `project-agentcore-app` (`plan.md` line 240): a second harness was installed
with `harny init apps/web --stack typescript` alongside an existing root
`stack: python` install, and three gaps surfaced.

**Two of those three gaps have since shipped, which narrows this feature to the
first one.** Verified in `specs/archived/` during exploration:

- **Gap (2) — the workflow landed inside the subdirectory — is DONE.**
  `ci-workflow-root` (archived 2026-09-23) made `init` detect the git root via
  `src/repo.ts`'s `resolveInstallLocation` and write the workflow there, scoped
  with step-level `working-directory` (ADR 0032) and named from the install prefix
  (ADR 0034). It also left this feature deliberate groundwork: `CiPlacement`
  (`src/engine.ts:207`) is a struct rather than a bare string specifically "so
  `monorepo-mode` can add fields (a component list) without changing any signature
  here (XC-6)".
- **The TypeScript `extensions` list and the vanished-path filter are DONE.**
  `feedback-path-hygiene` (archived 2026-09-22) landed both in
  `templates/hooks/run-feedback.mjs` (`matchesExtensions`, `existingPaths`), and
  `JS_TS_SOURCE_EXTENSIONS` in `src/feedback.ts` carries the eight suffixes that
  had been added by hand downstream.
- **The `sdd-documentation` "never commit or push" rule is DONE.**
  `dogfood-quick-fixes` (archived 2026-09-22); the rule is at
  `templates/roles/sdd-documentation.md:66`.

What remains is **gap (1): no multi-stack support**. And because the only reason
the incident had two installs at all was gap (1), the rest of the incident's
findings are consequences of it rather than independent problems:

- **Gap (3) — "duplicated harness means duplicated local fixes" — dissolves as a
  consequence, and this was confirmed against the code, not assumed.** Every
  artifact family is written once per *install*, never once per component:
  `buildSharedFiles` writes `.sdd/spec-schema/*` and `.sdd/harness.json` once
  (`cli-init.md` CLI-8), `buildSkillFiles` writes one copy per distinct
  `Generator.skillsDir`, `buildFeedbackFiles`/`buildDoctorFiles`/
  `buildRuntimeSharedFiles` each write their runtime once, and every generator's
  `renderRole`/`renderConductor`/`renderHook` writes one file per role/tool. So one
  install covering N components produces exactly one `.sdd/`, one copy of every
  role and skill, one runner, one `probes.mjs`, one hook config per tool. A fix to
  `templates/hooks/run-feedback.mjs` then lands in exactly one scaffolded file.
- **ADR-registry ambiguity dissolves the same way.** `specs/` is install-relative
  (`SPECS_DIR` in `src/doctor.ts`), and `harny-sync`'s ADR registry is regenerated
  from `specs/archived/*/decisions/*.md` under that one `specs/`. One install ⇒ one
  `specs/current/_index.md` ⇒ one monotonic ADR sequence, so the hand-written
  "repo-wide monotonic, next is 0008" note in two registries becomes unnecessary.
- **The "do nested `.claude/skills` collide?" question dissolves too**, because a
  monorepo install at the repository root creates no nested skill directory.

These three dissolve **because one install replaces two**, not because this feature
forbids two installs. Two installs remain possible and remain supported
(`ci-workflow-root` exists for exactly that case); they simply stop being the only
way to cover two stacks. That distinction is stated here deliberately rather than
left implicit.

## Goals

1. **G1 — One install, many stacks.** A single `harny init` can declare
   `components: [{path, stack}]`, each component resolving its own `StackProfile`
   from the one existing `STACK_PROFILES` table, with no second install, no second
   `.sdd/`, no second `specs/`, and no second copy of any role or skill.
2. **G2 — Today's single-repo behavior is untouched, byte for byte.** A config that
   declares no `components` produces output identical to what it produces today,
   proven by golden-byte comparison rather than by inspection — including this
   repo's own dogfood artifacts, which `feedback-controls.md` FC-13 pins.
3. **G3 — The runner picks commands by which component a touched path belongs to.**
   `templates/hooks/run-feedback.mjs` resolves each accumulated path to exactly one
   component by longest-prefix match, runs that component's commands from that
   component's directory, and never hands a component's linter a file belonging to
   another component.
4. **G4 — One workflow, one job, one runner call.** The CI shape is the one already
   decided by the human and recorded in `ci-workflow-root`'s contract as XC-6: one
   job at the git root, one runner call, the runner doing the component resolution.
   Explicitly not a per-component job matrix and not one workflow file per
   component. Per-component *dependency install* steps are the one exception, since
   those are shell, not runner.
5. **G5 — Readiness stays truthful per component.** `npx harny doctor` runs each
   component's test command from that component's directory, and the verb and the
   direct `run-doctor.mjs` invocation still agree (`readiness-checks.md` RD-7).
6. **G6 — `init` asks the shape question.** The interactive flow asks single repo
   vs. monorepo before asking about stacks, and the non-interactive path gains a
   repeatable flag. Choosing "single repo" reproduces today's question flow exactly.
7. **G7 — A component is a repo fact, never a stack fact.** `STACK_PROFILES` stays a
   pure stack→commands table (`feedback-controls.md` FC-1): no `path`, no `dir`, and
   no component identity is ever added to `StackProfile`, `FeedbackCommand`, or
   `ReadinessCommand`. Component scoping travels as separate data alongside the
   commands, which is what keeps one profile reusable by many components.
8. **G8 — Extend `ci-workflow-root`, undo none of it.** ADR 0032's step-level
   `working-directory` (no `paths:` filter, no `defaults.run`) and ADR 0034's slug
   rule survive unchanged; `CiPlacement` gains a field, and no signature it
   introduced changes shape.

## Success Criteria

- [ ] **SC1** — `npx harny init --component .=python --component apps/web=typescript`
      writes exactly one `.sdd/`, one `specs/`-facing spec-schema set, one copy of
      every role and skill per distinct skill root, one `run-feedback.mjs`, one
      `probes.mjs`, one hook config per selected tool, and exactly one CI workflow.
- [ ] **SC2** — A config with no `components` produces a write plan whose paths and
      whose every file's bytes are identical to the pre-change build's, for the same
      config, templates, stack, and install position — asserted by a golden-content
      test over all generated artifacts, not by inspection.
- [ ] **SC3** — This repo's own committed `.sdd/**`, `.claude/settings.json`, and
      `.github/workflows/harny-feedback.yml` are still byte-identical to fresh
      `npx harny init --tools claude-code --stack typescript` output after this
      feature (`feedback-controls.md` FC-13 holds unchanged).
- [ ] **SC4** — An existing `.sdd/harness.json` carrying only `stack` loads,
      validates, merges, re-serializes, and round-trips byte-identically; it is
      never rewritten to a `components` form and never warned about.
- [ ] **SC5** — With components `.` (python) and `apps/web` (typescript), a turn
      touching `apps/web/page.tsx` and `api/main.py` runs `eslint` exactly once with
      only `apps/web/page.tsx` and cwd `apps/web`, and `ruff` exactly once with only
      `api/main.py` and cwd the install directory. Neither command ever receives the
      other component's file.
- [ ] **SC6** — With components `apps/web` and `apps/web-admin` declared, a touched
      path under `apps/web-admin/` resolves to `apps/web-admin`, never to
      `apps/web` — proven by a test, because segment-blind string prefixing gets
      this wrong.
- [ ] **SC7** — A touched path belonging to no declared component runs no command,
      and the runner prints exactly one notice line naming how many paths were
      unassigned. It is dropped, never silently, and never assigned to an arbitrary
      component.
- [ ] **SC8** — A `whole-project` command (e.g. `npx tsc --noEmit`) runs once per
      component that has at least one assigned touched path in the turn, from that
      component's directory, and not at all for components with none.
- [ ] **SC9** — The generated workflow for a two-component install contains exactly
      one job, exactly one runner-invocation step, and at most one dependency-install
      step per component whose profile declares `ciInstall` — no `strategy:`, no
      `matrix:`, no second workflow file, no `on.*.paths` filter, no
      `defaults.run.working-directory`.
- [ ] **SC10** — `npx harny doctor` on a two-component install runs `npm test` from
      `apps/web` and `pytest -q` from the install root, reports both, and the direct
      `node .sdd/doctor/run-doctor.mjs` invocation reports the same outcome.
- [ ] **SC11** — Declaring both `stack` and `components` (by flag, by `--config`
      file, or in `.sdd/harness.json`) is a `USAGE` error naming both fields; nothing
      is written.
- [ ] **SC12** — Two components with the same normalized path (`apps/web`,
      `./apps/web`, `apps/web/`) are a `USAGE` error naming the duplicate; a
      component path that is absolute or escapes the install directory is a `USAGE`
      error naming the path.
- [ ] **SC13** — An unrecognized component stack (e.g. `cobol`) is inert, not fatal:
      every artifact is still written, that component contributes no commands, and
      exactly one `io.warn` names both the component path and the unrecognized value
      — the per-component form of `feedback-controls.md` FC-2.
- [ ] **SC14** — The `Generator` interface gains no member, and no generator learns
      what a component *is*. A case-insensitive `grep` for `component` over
      `src/generators/**` finds occurrences in exactly one file,
      `src/generators/markdown-yaml.ts`, and within that file every occurrence lies
      inside `renderProjectConfigBlock` — between its `export function` line and the
      next top-level `export` — where the word is a rendered display string, not
      knowledge of components (MC-16). Every other file under `src/generators/**`,
      including `types.ts` and all five `renderHook` implementations
      (`claude-code.ts`, `cursor.ts`, `kiro.ts`, `github-copilot.ts`, `codex.ts`),
      contains no component vocabulary at all: none of them does component dispatch,
      resolution, or matching, and each `renderHook` reads the precomputed
      `payload.commands` (MC-15).
- [ ] **SC15** — Interactive `init` asks repo shape first; answering "single repo"
      produces exactly today's remaining question sequence, and a `--stack` or
      `--component` flag presets the shape question the way every other preset
      question already behaves (skipped and reported through `io.log`).
- [ ] **SC16** — `STACK_PROFILES` and both `CommandSpec` narrowings carry no
      component/path/dir field; a grep over `src/feedback.ts` for the component
      vocabulary finds nothing (G7).

## Non-Goals

- **Per-component `AGENTS.md` / component-level documentation.** That is spec-queue
  item 4, `component-level-docs` (`plan.md` line 247). This feature gives that one a
  component list to discover against; it writes no per-component document and adds
  no per-component readiness entry for one.
- **Per-component roles, skills, gates, tools, or model tiers.** A component carries
  a path and a stack, and nothing else. One install has one role set, one skill set,
  one gate set.
- **A per-component job matrix, or one workflow file per component.** Explicitly
  rejected by the human and recorded in `ci-workflow-root` intent.md § Non-Goals and
  contract.md XC-6. One job, one runner call.
- **`on.*.paths` filters to skip untouched components in CI.** ADR 0032 rejected
  these: a path-filtered workflow leaves required checks `Pending` and blocks merges.
  That reasoning is unchanged by adding components.
- **Removing or deprecating the subdirectory install.** `ci-workflow-root`'s
  subdirectory path, its slug rule, and ADR 0034's `CONFLICT` posture all stay.
  Components are an *alternative* to two installs, not a replacement of the
  mechanism that makes two installs work.
- **New stack profiles.** `STACK_PROFILES` keeps exactly `typescript` and `python`.
  Closing reservation R6 (`python` has no `ciInstall`) or R7 (npm-only install
  candidates) is still a separate feature; monorepo mode makes both *more* visible
  but does not fix them.
- **Auto-detecting components.** No manifest scanning, no directory heuristics. The
  human declares components. (Heuristic discovery is `component-level-docs`'
  explicitly stated mechanism, and duplicating it here would create two detectors.)
- **Per-component `specs/`, per-component ADR registries, or per-component
  `harny-sync` state.** One install, one knowledge base — that is the point.
- **Investigating Claude Code's nested `.claude/skills` discovery.** The question
  recorded in `plan.md` line 240 dissolves when there is one install at the root;
  this feature does not answer it for the two-install case.
- **A `pre-commit` / staged mode.** That is spec-queue item 5, `commit-checks`.

## Constraints

- **C1 — Backward compatibility is non-negotiable.** A `components`-free config must
  traverse every code path exactly as it does today and emit identical bytes. The
  acceptance test is this repo itself: `feedback-controls.md` FC-13 pins eight
  dogfood paths as byte-identical to fresh `init` output, and `.sdd/harness.json`
  here carries `"stack": "typescript"` with no `components` key.
- **C2 — `cli-init.md` CLI-4 (determinism), CLI-5 (conflict-before-write), CLI-8
  (single spec-schema/harness.json write), CLI-11 (no import cycles), and the
  path-containment, trailing-newline and exit-code conventions from
  `specs/archived/cli-skeleton/contract.md` are inherited by reference and
  restated nowhere.** Component paths are user-supplied, which makes containment
  (`assertContained`) and the `USAGE` exit path load-bearing here in a way they were
  not for any previous feature.
- **C3 — `feedback-controls.md` FC-1 holds.** No command string may gain a second
  home. Components reference profiles by stack string; `STACK_PROFILES` is the sole
  command table and gains nothing.
- **C4 — `feedback-controls.md` FC-7 holds.** Exactly one workflow per install, at
  the repository root. A monorepo install at the git root renders the canonical
  `harny-feedback.yml` with the canonical `name:`; ADR 0034's slug rule still governs
  a subdirectory install.
- **C5 — `feedback-controls.md` I7 holds.** Exactly one generated artifact
  (`root: 'repo'`) resolves against the repository root; `ci-workflow-root`'s WR-5
  single-declaration-site grep gate must still find exactly one assignment.
- **C6 — `readiness-checks.md` RD-1/I3 hold.** Still five check families, still in
  the same order. Components change what family 5 runs and from where, never how
  many families there are.
- **C7 — `readiness-checks.md` RD-2 holds.** `kind: 'test'` must remain a compile
  error in `StackProfile.commands`, and `extensions` must remain a compile error on
  `ReadinessCommand`. Any new field added for component scoping must not weaken
  either (which is why, per G7, it is added to the generated checks entry type in
  `src/doctor.ts`, never to `CommandSpec` in `src/feedback.ts`).
- **C8 — `AGENTS.md` S5.** The component-resolution rule must have exactly one home.
  The runner (`run-feedback.mjs`) and the doctor runner are copied verbatim into
  target repos and cannot import from `src/`, so where a rule must exist on both
  sides of that boundary, the generated side receives it as *data*, never as a
  re-implemented literal — the pattern `ci-workflow-root` used for the `ci-workflow`
  check's path.
- **C9 — `AGENTS.md` S7.** Any new prose in `templates/hooks/README.md` states the
  behavior tool-neutrally first; a tool may appear only under § Attributed examples.
  `feedback-controls.md` FC-4 currently pins that README at "exactly six
  properties", so adding component dispatch there requires FC-4 to be amended, not
  quietly broken.
- **C10 — No new runtime or dev dependency** (`AGENTS.md` S4; `cli-init.md`
  invariant 3). Path handling uses `node:path`'s POSIX helpers, already in use.
- **C11 — Nothing here contradicts a `harny-sync` current-truth statement.** The
  lookup run (`feedback-controls.md`, `cli-init.md`, `readiness-checks.md`) found no
  statement this feature must break. FC-2, FC-4, FC-7, RD-7 and CLI-1 are *widened*
  — each gains a per-component clause — and those widenings are proposed as
  amendments in `contract.md`, never applied silently.

## Prior Art

- **`specs/archived/ci-workflow-root/`** — the direct predecessor. Its `src/repo.ts`
  (`resolveInstallLocation`, `componentSlug`, `ciWorkflowPathFor`,
  `ciWorkflowPathFromInstallDir`), its `CiPlacement` struct, its `GeneratedFile.root`
  one-member union, and its `working-directory` rendering are all reused rather than
  re-derived. Its contract states this feature's shape in advance as XC-6, and ADR
  0032's follow-up section names it explicitly: "this opens the path for
  `monorepo-mode`, which will teach the runner to resolve each path to its component
  so one job at the root can make one runner call covering multiple installs."
- **`specs/archived/feedback-path-hygiene/`** — the nearest precedent for changing
  `run-feedback.mjs`'s per-command path handling without changing its shape. Its
  `extensions` gate (FC-23) is an optional field that means "no filter" when absent,
  keeping every existing hand-written commands JSON working; component scoping takes
  the same absent-means-today's-behavior posture.
- **`specs/archived/agent-feedback-controls/`** — established `STACK_PROFILES`,
  `pathMode`, probe-skip, the `--commands` inline-JSON channel, and ADR 0017's
  "reuse the shared runner rather than duplicate its logic in YAML", which is the
  reason per-component dispatch belongs in the runner and not in the workflow.
- **`specs/archived/ai-sdlc-readiness/`** — ADR 0023's optional-field-with-a-default
  pattern (`tier?: CheckTier`, absent means `must-have`) is the model for every
  optional field this feature adds: an older generated `checks.json` keeps working
  against the newer runner unchanged.
- **`specs/archived/context7-mcp/`** — precedent for widening `runInit` step 11
  rather than adding a fourteenth step (`cli-init.md` CLI-1), which is how the
  component list reaches the builders here.
- **`plan.md` lines 240, 245** — the dogfooding incident and the spec-queue entry
  this feature implements.
