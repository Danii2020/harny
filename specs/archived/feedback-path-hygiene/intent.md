# Intent: feedback-path-hygiene

Shipped: 2026-09-22

## Problem Statement

The per-turn feedback runner (`templates/hooks/run-feedback.mjs`, copied byte-for-byte
into every scaffolded repo as `.sdd/feedback/run-feedback.mjs`, and into this repo's
own dogfood copy at the same path) reports **false-positive findings** on the
turn-completion hook. Dogfooding harny on a real Python repo (`project-agentcore-app`)
found two independent sources. Both come from the same code path: a `per-file`
command receives the turn's deduped touched paths *unfiltered*
(`templates/hooks/run-feedback.mjs:164–168`,
`command.pathMode === 'per-file' ? [...rest, ...touchedPaths] : [...rest]`).

1. **Vanished paths (a plain correctness gap).** `accumulate` mode records every file
   an Edit/Write touches as an absolute path (`run-feedback.mjs:91–107`). If a later
   shell step in the *same turn* moves or deletes that file (`git mv`, `mv`, `rm`, for
   example `harny-sync` archive mode moving `specs/<feature>/` to
   `specs/archived/<feature>/`, or a rename refactor), `run` mode still passes the stale
   path. Ruff then reports `E902 No such file or directory`, and mypy reports its own
   equivalent. This is a finding about the harness, not about the agent's code, and it
   is delivered to the agent as if it were a real defect.

2. **No file-type gate.** Every touched file goes to every `per-file` command. Editing
   `.claude/settings.json`, `.github/workflows/*.yml`, or a Markdown spec makes ruff
   and mypy parse it as Python and emit bogus `invalid-syntax` findings. Ruff's own
   documentation says why an explicit path gets through: "Files passed directly to the
   command line are always analyzed unless the `force-exclude` setting is enabled"
   (docs.astral.sh/ruff/configuration, "Python file discovery", fetched via Context7
   2026-09-21). The runner's explicit path list skips the tool's own discovery filter.

**Who is affected.** Every scaffolded repo whose profile has a `per-file` command, which
today is both profiles. It is worst on `python`, where *both* commands are `per-file`
and a harness-only turn (editing specs, settings, and workflows) can produce several
false findings. The agent then spends a turn "fixing" nothing, or learns to ignore the
feedback channel. That erodes the one computational-feedback sensor
`AGENTS.md` § "Feedforward vs. feedback" ships. On Cursor and GitHub Copilot the
finding channel is a forced continuation (`feedback-controls.md` FC-6), so every false
positive costs an extra agent turn.

## Goals

1. **G1 — Vanished paths never reach a per-file command.** In turn-based `run` mode, a
   touched path that no longer exists on disk when the runner fires is dropped before a
   `per-file` command's argv is built.
2. **G2 — Per-file commands only receive files of the types they check.** A command can
   declare the file suffixes it accepts, through one new optional
   `extensions?: readonly string[]` field on `CommandSpec` in `src/feedback.ts`. The
   runner drops non-matching touched paths for that command. The suffix lists are
   written once, in `STACK_PROFILES`, and reach the runner through the existing
   `--commands` JSON with no new serialization code.
3. **G3 — Nothing that works today changes.** CI's `--whole-project` mode keeps its
   current execution (each `per-file` command receives exactly `.`). A command with no
   `extensions` behaves as it does today, apart from the vanished-path drop. A
   whole-project command ignores `extensions`. A per-file command whose filtered set is
   empty is skipped cleanly: it is never run with zero path arguments, because that
   would lint the whole repo.
4. **G4 — `extensions` has an explicit, enforced meaning on every `CommandSpec`
   consumer.** Readiness commands (`StackProfile.readiness`, run by `harny-doctor`)
   share `CommandSpec`. This feature states that `extensions` means nothing there and
   enforces that at compile time, following the ADR 0018 precedent.
5. **G5 — Dogfood fidelity survives the change.** This repo's own
   `.sdd/feedback/run-feedback.mjs`, `.claude/settings.json`, and
   `.github/workflows/harny-feedback.yml` are regenerated in this feature, so FC-13
   ("byte-identical to what `npx harny init --tools claude-code --stack typescript`
   produces") still holds on the day it ships.
6. **G6 — The canonical behavior description stays true.** `templates/hooks/README.md`
   § "The behavior" describes the per-command path filtering in tool-neutral language
   (S7). It stays inside the existing six properties that FC-4 counts rather than
   adding a seventh.

## Success Criteria

- [ ] **SC1** (G1) A real-subprocess runner test accumulates two `.py` paths, deletes
      one before `run`, and observes that the `per-file` command's single invocation
      received exactly the surviving path.
- [ ] **SC2** (G1, G3) A turn whose *only* accumulated paths have all vanished (the
      `git mv` case: old path accumulated, file renamed away) produces **no**
      invocation of any `per-file` command, still runs `whole-project` commands, and
      exits `0` with no stdout.
- [ ] **SC3** (G2) A turn touching `.claude/settings.json`, `.github/workflows/ci.yml`,
      and `src/app.py` gives a command declaring `extensions: ['.py', '.pyi']` exactly
      `src/app.py`, while a command declaring no `extensions` still receives all three.
- [ ] **SC4** (G2, G3) A turn touching only non-matching files never spawns the
      filtered `per-file` command at all. Its recorded invocation count is `0`, not `1`
      with no path args.
- [ ] **SC5** (G3) `run --whole-project` with a `per-file` command declaring
      `extensions: ['.py']` still invokes it with exactly one trailing argument, `.`.
- [ ] **SC6** (G2, G5) End to end through a *generated* artifact: the Claude Code
      `Stop` hook rendered for `--stack python`, executed via `sh` against a temp
      project holding the real runner and `probes.mjs` plus stub `ruff`/`mypy`
      binaries on `PATH`, passes each stub only the existing `.py` file after the turn
      accumulated a `.json`, a vanished `.py`, and an existing `.py`. This proves
      `extensions` reaches the runner through the generator's inline `--commands` JSON.
- [ ] **SC7** (G3, G5) End to end through the generated CI workflow: the python
      profile's runner-invocation `run:` step, decoded and executed via `sh` against the
      same kind of temp project, invokes the stub `ruff` with exactly `.`.
- [ ] **SC8** (G2, G4) Every `per-file` command in `STACK_PROFILES.commands` declares a
      non-empty `extensions` list whose entries each start with `.`. No `whole-project`
      command and no `readiness` command declares one. Assigning `extensions` to a
      `ReadinessCommand` literal is a TypeScript compile error in `src/`.
- [ ] **SC9** (G5) `diff` of this repo's committed `.sdd/feedback/run-feedback.mjs`
      against `templates/hooks/run-feedback.mjs` is empty. A scratch
      `harny init --tools claude-code --stack typescript --yes` run's
      `.claude/settings.json` and `.github/workflows/harny-feedback.yml` byte-match this
      repo's committed copies. `.sdd/doctor/checks.json` is unchanged by this feature.
- [ ] **SC10** (G6) `templates/hooks/README.md` § "The behavior" still has exactly six
      numbered properties. Property 2 states the per-command extension gate, the
      vanished-path drop, and the empty-set skip without naming any tool. § "
      `--whole-project`" states that neither filter applies there.
- [ ] **SC11** (all) `npm run typecheck` and `npm test` pass. No runtime or dev
      dependency is added (S4).

## Non-Goals

- **Multi-stack / monorepo components** (per-directory profiles, several profiles in
  one repo). That is a separate upcoming spec.
- **Stack addons** (user-declared extra commands or profile extensions). Separate spec.
- **The Context7 URL change** in the MCP wiring. Separate spec.
- **Changes to the documentation role** (`harny-document`, `sdd-documentation`).
  Separate spec. This feature's own post-ship docs update runs through the existing
  hand-off unchanged.
- **Filtering at accumulate time.** `accumulate` keeps recording every Edit/Write
  path. It cannot know which commands will run, and existence can only be judged when
  the turn ends.
- **Gating `whole-project` commands on the turn's file types** (for example, skipping
  `tsc` on a Markdown-only turn). That would be a behavior change for a command kind
  this feature does not touch.
- **Changing the extension lists' coverage beyond the two shipped profiles** (for
  example `.vue`, `.svelte`, `.ipynb`). See the open question in `contract.md`.
- **Closing open reservations R1–R8** in `feedback-controls.md`. None is touched.
- **Changing `harny-feedback`'s SKILL.md.** It names the module and never restates
  commands or path handling (FC-1, its own Step 2), so nothing in it becomes untrue.

## Constraints

- **S1–S7 (`AGENTS.md` § Coding standards).** TypeScript ESM `nodenext`, `.js`
  specifiers, `node:` builtins in `src/`. The runner is plain ESM `.mjs` with no build
  step, since it is copied verbatim (I5). Deterministic output with one trailing `\n`
  (S3). No new dependency (S4). Shared constants are imported, never re-literalled
  (S5). Tests use vitest with `Spec:`/`Covers:` headers, keep contract ids out of test
  names, and stay offline (S6). Tool-neutral prose (S7).
- **FC-1 / BG-7 (single source).** The extension lists live only in `STACK_PROFILES`.
  The runner may not hard-code any suffix. It learns them from `--commands` exactly
  as it learns `argv`.
- **I5 (runtime byte fidelity).** `templates/hooks/run-feedback.mjs` stays the only
  source of the runner. No per-tool variant.
- **FC-20 / ADR 0017.** `--whole-project` never touches turn state, and its `.` argv
  tail is unchanged.
- **ADR 0018.** The `CommandSpec<K>` / `FeedbackCommand` / `ReadinessCommand`
  structure is kept. Existing consumers must compile unchanged, since the new field is
  optional.
- **ADR 0014.** `renderHook` stays a `Generator` method. No generator's code changes;
  the field travels through the `JSON.stringify(profile.commands)` calls already present
  in all five generators and in `src/engine.ts` `renderRunnerInvocation`.
- **FC-13 (dogfood byte identity).** Any change to generated feedback artifacts must
  be matched by regenerating this repo's committed copies in the same feature.
- **Backward compatibility across versions.** A repo scaffolded before this feature
  (old hook config, no `extensions`) that later picks up the new runner must behave
  sensibly, which means the existence check only. A new hook config run by an old
  runner must be harmless, because the old runner ignores unknown fields.
- **Human decisions already taken** (recorded as binding): `'.'` bypasses both
  filters; an empty filtered set skips the command; `extensions` is optional;
  whole-project commands ignore it; matching is case-sensitive on the suffix; the
  filter order is extension gate, then existence check.

### Deliberate amendments to current truth (stated, not silent)

`harny-sync` lookup returned the following statements that this feature changes. Each
change is intentional and justified here, per `harny-propose` Step 0:

- **FC-6, Scenario "multiple edits across multiple files batch to one run"**
  ("receiving exactly 2 deduped paths"), and archived `agent-feedback-controls`
  `contract.md` BG-1 ("receiving exactly M deduped paths"). After this feature, a
  `per-file` command receives the deduped paths **that pass its extension gate and
  still exist**, which is ≤ M, and it is not invoked at all when that subset is empty.
  The *one run per turn* half of the guarantee (the part BG-1 exists to protect) is
  unchanged. Justification: passing a path the tool cannot or should not check is the
  defect this feature fixes. The existing batching test keeps passing unchanged, since
  its three paths are neither vanished nor filtered, and its command declares no
  `extensions`.
- **FC-4** says the README states "exactly six properties". That count is **kept**.
  Property 2's text is refined in place rather than adding a seventh, so FC-4 needs no
  amendment beyond a wording refresh at archive time.
- **`src/feedback.ts` doc comment on `CommandSpec`** ("Extracted verbatim from the
  original `FeedbackCommand` — no field added, removed, or renamed") describes the
  readiness-doctor extraction. It becomes historically true but no longer describes
  the current shape. The comment is updated to say `extensions` was added by this
  feature, and ADR 0018's "existing consumers compile unchanged" property still holds
  because the field is optional.

### Post-audit amendment A1 (2026-09-22)

Audit finding **AL-3** showed that a non-empty `extensions` list with no valid entry
(e.g. `[null, '']`) matched nothing and silently disabled its command every turn,
against G3's backward-compatibility intent. The human decided that such a list means
**no filter**, the same as an absent `extensions`. `contract.md` § "Post-audit
amendment A1" records the change. It rewrites PH-6 and the proposed **FC-23** wording,
which now reads: case-sensitive suffix match against the list's valid entries
(non-empty strings); an `extensions` value that is absent, not an array, or has no
valid entry means no filter. No goal, success criterion, or non-goal changes.

## Prior Art

- **The reference local patch in `project-agentcore-app`**: a
  `matchesExtensions(path, command.extensions)` gate followed by an `existingPaths()`
  filter, applied before the per-file argv is built. This spec adopts its order and
  names.
- **`FeedbackInstall.requires: Required<Pick<ToolProbe, 'anyFile'>>`**
  (`src/feedback.ts`, A1): the precedent for tightening a shared shape per consumer at
  the type level. `ReadinessCommand`'s new `extensions?: never` follows it and ADR 0018.
- **The `.` whole-project sentinel** (archived `agent-feedback-controls` `contract.md`
  § "Whole-project invocation record"): the reason the filters must live only in the
  turn-based code path.
- **Tool-native precedents**: ruff's default `include` (`*.py`, `*.pyi`, `*.ipynb`,
  `pyproject.toml`) and its "explicit paths are always analyzed" rule
  (docs.astral.sh/ruff/configuration, via Context7). lint-staged's glob-to-command
  mapping is the same "filter touched files per command" idea found elsewhere in the
  ecosystem.
