# Contract: monorepo-mode

> Inherits, by reference and without restatement, the determinism, path-containment,
> trailing-newline, conflict-before-write and exit-code rows of
> `specs/archived/cli-skeleton/contract.md` (Behavior Guarantees 13–21) and the
> `HarnessErrorCode`→exit-code table in `src/errors.ts`. Only what this feature
> *changes or adds* appears below.

## Interfaces

### Public API

#### `src/config.ts`

```ts
/** One declared component of a monorepo install: a directory and the stack that
 *  directory is written in. Carries a path and a stack and nothing else — no roles,
 *  no gates, no tools, no tier (intent.md § Non-Goals). */
export interface ComponentSelection {
  /** Normalized POSIX path, relative to the install directory. `'.'` means the
   *  install directory itself and is a legal, ordinary member (the catch-all). Never
   *  absolute, never escaping the install directory, never carrying a trailing `/`. */
  readonly path: string;
  /** Same semantics as `HarnessConfig.stack`: resolved by `resolveStackProfile`,
   *  omitted when blank, and inert-never-fatal when unrecognized (`feedback-controls.md`
   *  FC-2, applied per component). */
  readonly stack?: string;
}

/**
 * Normalizes one user-supplied component path and rejects what cannot be a
 * component. The single home of the rule (`AGENTS.md` S5); the prompt's `validate`
 * callback, the flag parser, the `--config` loader and `validateConfig` all call
 * this one function rather than re-deriving it.
 *
 * Steps, in order: trim; replace `\` with `/`; `path.posix.normalize`; strip a
 * trailing `/`; map `''` to `'.'`. Then reject, as `HarnessError('USAGE')`: an
 * absolute path (POSIX or `C:`-style), and any result equal to `'..'` or beginning
 * `'../'`.
 */
export function normalizeComponentPath(raw: string, source: string): string;

/** Parses one `--component <path>=<stack>` assignment. Splits on the FIRST `=`,
 *  exactly as `parseModelAssignment` already does for `--model`. An empty right-hand
 *  side yields a component with no `stack` (legal and inert). An empty left-hand
 *  side, or no `=` at all, is `HarnessError('USAGE')`. */
export function parseComponentAssignment(raw: string): ComponentSelection;

/** Validates, normalizes, deduplicates and canonically orders a component list.
 *  Returns entries sorted ascending by `path` (plain codepoint comparison, the same
 *  ordering `compareByName` in `src/engine.ts` already uses), which is what makes the
 *  list's emission order independent of the order a user typed it in. An empty list,
 *  or two entries whose normalized paths are equal, is `HarnessError('USAGE')`. */
export function validateComponentList(raw: unknown, source: string): ComponentSelection[];
```

#### `src/engine.ts`

```ts
/** A `ComponentSelection` with its stack already resolved. The one shape every
 *  downstream consumer reads, so no consumer branches on whether the install
 *  declared components (MC-3). */
export interface ResolvedComponent {
  readonly path: string;
  readonly stack?: string;
  /** `undefined` for a blank or unrecognized stack — the per-component escape
   *  hatch (`feedback-controls.md` FC-2). */
  readonly profile?: StackProfile;
}

/** The unification point (MC-3). Returns `config.components` resolved, in their
 *  canonical order, when present; otherwise exactly one entry,
 *  `{ path: '.', stack: config.stack, profile: resolveStackProfile(config.stack) }`.
 *  Total, pure, and NEVER empty. */
export function resolveComponents(config: HarnessConfig): readonly ResolvedComponent[];

/** One component's slice of the runner wire format. */
export interface ComponentCommands {
  /** POSIX, relative to the runner's own `cwd` (the install directory). */
  readonly dir: string;
  /** The component's resolved profile's commands, or `[]` when it resolved none. */
  readonly commands: readonly FeedbackCommand[];
}

/** What travels to the runner on `--commands`. The legacy bare-array form is not a
 *  compatibility shim to be removed later: it is the canonical encoding of the
 *  one-component-at-`.` case, and the reason every single-repo artifact stays
 *  byte-identical (MC-5). */
export type CommandsPayload =
  | readonly FeedbackCommand[]
  | { readonly components: readonly ComponentCommands[] };

/** Bare array iff `components.length === 1 && components[0].path === '.'`;
 *  the object form otherwise, carrying EVERY declared component including those
 *  that resolved no profile (MC-6). Pure. */
export function buildCommandsPayload(
  components: readonly ResolvedComponent[],
): CommandsPayload;

/** The `working-directory:` value for a step that must run inside `componentPath`,
 *  for an install sitting at `prefix` inside its repository. `path.posix.join` then
 *  `path.posix.normalize`; `'.'` maps to `''`, and an empty result means the caller
 *  emits no `working-directory:` line at all — which is what keeps a root install's
 *  generated block byte-identical (MC-13). */
export function stepWorkingDirectory(prefix: string, componentPath: string): string;
```

#### `src/doctor.ts`

```ts
/** A readiness command as it appears in a GENERATED `checks.json` — the profile's
 *  own `ReadinessCommand` plus the directory it runs in.
 *
 *  Deliberately declared here and not as a field on `CommandSpec` in
 *  `src/feedback.ts` (intent.md G7, MC-2): a directory is a fact about this repo,
 *  not about a stack, and putting it on `CommandSpec` would (a) give `FeedbackCommand`
 *  a second, conflicting way to express a component and (b) put mutable per-repo data
 *  in the table `feedback-controls.md` FC-1 pins as the single command source.
 *  `ReadinessCommand`'s `extensions?: never` narrowing is untouched
 *  (`readiness-checks.md` RD-2). */
export type ScopedReadinessCommand = ReadinessCommand & {
  /** POSIX, relative to the install directory. Absent means the install directory
   *  itself, so a `checks.json` generated before this feature runs unchanged against
   *  the new runner — the same absent-means-today's-default posture as
   *  `DoctorCheck.tier` (ADR 0023) and `CommandSpec.extensions` (FC-23). */
  readonly dir?: string;
};
```

### Data Models

#### `HarnessConfig` and `PartialHarnessConfig` (`src/config.ts`)

```ts
export interface HarnessConfig {
  readonly version: typeof CONFIG_VERSION;
  readonly tools: readonly ToolId[];
  readonly roles: readonly RoleSelection[];
  readonly gates: readonly GateId[];
  readonly skills: readonly SkillId[];
  readonly stack?: string;
  /** **(NEW.)** Declared components, normalized, deduplicated and canonically
   *  ordered. Non-empty when present. MUTUALLY EXCLUSIVE with `stack`: declaring
   *  both is `USAGE` (MC-1). Absent is the single-repo case and is the default. */
  readonly components?: readonly ComponentSelection[];
}

export interface PartialHarnessConfig {
  // …unchanged fields…
  readonly stack?: string;
  /** **(NEW.)** Wholesale-replaces the component list, exactly as `gates` replaces
   *  the gate set and `roleIds` replaces role membership. Never merged per-path:
   *  a component list is a description of a repository's shape, and merging two
   *  such descriptions produces a shape neither source asked for. */
  readonly components?: readonly ComponentSelection[];
}
```

`mergeConfig` step 3 gains one line beside `stack`'s:

```ts
const stack = override.stack !== undefined ? override.stack : base.stack;
const components = override.components !== undefined ? override.components : base.components;
```

…followed by the exclusivity check (MC-1), which is evaluated **after** the merge, so
`--config` supplying `stack` and a flag supplying `components` is caught. When
`override.components` is present and non-empty, any `stack` inherited from `base` is
**dropped, not carried and not an error** — the flag replaced the shape question's
answer, and inheriting the superseded answer would re-trigger MC-1 on the user's
behalf. The reverse holds symmetrically for `override.stack` over a base
`components`. MC-1's error is reserved for the case where **one source** supplies
both.

#### `serializeConfig` key order (`src/config.ts`)

`version, tools, roles, gates, skills, stack?, components?` — `components` appended
last, emitted only when present and non-empty, each entry serialized as `{ path }`
or `{ path, stack }` in that field order. **A single-repo config therefore serializes
to exactly today's bytes** (MC-4), which is what keeps `.sdd/harness.json` in this
repo and in every existing install unchanged.

#### `ProjectConfigSummary` (`src/engine.ts`)

```ts
export interface ProjectConfigSummary {
  // …unchanged fields, INCLUDING `stack` and `stackProfile`…
  /** **(NEW.)** `resolveComponents(config)`'s result. ALWAYS present and ALWAYS
   *  non-empty — for a single-repo config it is the one implicit `.` component.
   *  `stack`/`stackProfile` are left in place unchanged precisely so
   *  `renderProjectConfigBlock`'s existing lines do not move (MC-16). */
  readonly components: readonly ResolvedComponent[];
}
```

#### `HookPayload` (`src/engine.ts`)

```ts
export interface HookPayload {
  readonly project: ProjectConfigSummary;
  readonly profile?: StackProfile;
  readonly runner: HookRunnerTemplate;
  /** **(NEW.)** The exact value each generator serializes onto its hook's
   *  `--commands` argument. Precomputed once by `runInit` via
   *  `buildCommandsPayload`, so no generator ever derives it and no generator ever
   *  learns what a component is (MC-15, SC14). */
  readonly commands: CommandsPayload;
}
```

`profile` stays on `HookPayload` (it is still what the escape-hatch and display paths
read) but stops being the source of the `--commands` value.

#### `CiPlacement` (`src/engine.ts`) — deliberately unchanged

```ts
export interface CiPlacement {
  readonly prefix: string;
}
```

`ci-workflow-root`'s contract XC-6 anticipated that `monorepo-mode` would "add
fields (a component list)" here. **This feature declines that mechanism and states
so explicitly rather than diverging silently.** The reason: the component list is
already on `payload.conductor.project.components`, which `buildFeedbackFiles` and
`buildDoctorChecks` both already receive; adding it to `CiPlacement` too would create
a second copy of the same fact that can disagree with the first. XC-6's actual
*guarantee* — that `monorepo-mode` needs to change no signature and delete nothing —
holds either way, and holds here: `buildFeedbackFiles(payload, placement)` and
`buildDoctorChecks(config, generators, placement)` keep their exact arity and
parameter types. `CiPlacement` remains a struct, so the option XC-6 reserved is still
open for a future feature that needs a placement fact this payload does not carry.
Recorded as **ADR 0040**.

#### Runner wire format (`templates/hooks/run-feedback.mjs`)

`--commands` accepts, in addition to today's two forms (a file path, or inline JSON):

| Parsed value | Normalized to | Meaning |
|---|---|---|
| `[ …FeedbackCommand… ]` | `[{ dir: '.', commands: […] }]` | Today's form. One implicit component at the runner's `cwd`. |
| `{ "components": [ { "dir": "apps/web", "commands": […] }, … ] }` | itself, each entry defaulting `dir` to `'.'` and `commands` to `[]` | Monorepo form. |
| anything else (non-array, non-object, unparseable, missing file) | `[]` | Unchanged tolerant posture: no commands, exit 0. |

#### `DoctorChecksFile` (`src/doctor.ts`)

```ts
export interface DoctorChecksFile {
  // …unchanged fields…
  /** **(WIDENED.)** Entries may now carry `dir`. Field ADDED to the element type;
   *  no field of `DoctorChecksFile` itself is added, renamed or removed, and
   *  `version` stays `1` (MC-21). */
  readonly commands: readonly ScopedReadinessCommand[];
}
```

### State Changes

- **`.sdd/harness.json`** gains an optional `components` array. Written once per run
  as today (`cli-init.md` CLI-8). Byte-identical for every config that declares none.
- **`.sdd/doctor/checks.json`**'s `commands` entries may gain `dir`, and their `id`s
  may gain a `:<path>` suffix (MC-20). Byte-identical for a single-`.`-component
  install.
- **Each tool's hook config** carries the same `--commands` argument it carries
  today for a single-repo install, and the object form for a monorepo install. No
  new file, no new path, no second hook registration.
- **`.github/workflows/harny-feedback*.yml`**'s *generated block* gains one install
  step per component that declares `ciInstall`, and its single runner step's name
  changes only when more than one component resolves a profile. The canonical region
  (triggers, job, checkout, header comment) is untouched except for the header
  comment's new paragraph (MC-14), which is a canonical-region change and is
  contracted here explicitly for that reason.
- **No new generated path, anywhere.** The write plan's path set for a monorepo
  install is identical to a single-repo install's.
- **`templates/` file count stays at thirty-one.** No file is added under
  `templates/`, so `cli-init.md` CLI-10 and `tests/packaging.test.ts` are unchanged.

## Behavior Guarantees

### Configuration

1. **MC-1 — `stack` and `components` are mutually exclusive, and the error is
   loud.** A single source (a `--config` file, `.sdd/harness.json`, or one flag
   invocation) supplying both non-empty is `HarnessError('USAGE')` naming both
   fields; nothing is written. There is no precedence rule, no "stack as the default
   for unlisted paths", and no silent winner. A repository whose root is one of its
   components says so by declaring `{ path: '.', stack: … }`, which is strictly more
   explicit and is exactly the shape `plan.md` line 240 proposed. Recorded as
   **ADR 0038**.
2. **MC-2 — A component is a repo fact; `STACK_PROFILES` never learns about one.**
   `StackProfile`, `FeedbackCommand`, `ReadinessCommand` and `CommandSpec` gain no
   `path`, `dir`, `component` or `cwd` field. A grep of `src/feedback.ts` for that
   vocabulary finds nothing (SC16). The same `typescript` profile object is shared by
   every TypeScript component, by identity.
3. **MC-3 — One code path, not two.** `resolveComponents` is total and never returns
   an empty list, so every downstream consumer (`buildCommandsPayload`,
   `renderCiWorkflow`, `buildDoctorChecks`, `renderProjectConfigBlock`) iterates a
   list and never branches on `config.components === undefined`. The single-repo case
   is a one-element list, not a special case.
4. **MC-4 — A `components`-free config round-trips byte-identically.**
   `serializeConfig` emits no `components` key; `loadConfigFile` and `validateConfig`
   accept a `components`-free object exactly as today; `mergeConfig` produces the same
   result. An existing `.sdd/harness.json` is never rewritten, never migrated, and
   never warned about (SC4).
5. **MC-5 — Byte-identity is achieved by construction, not by a branch.** Every
   rendering rule this feature adds is written so that its value for
   "one component whose path is `.`" *is* today's value: `buildCommandsPayload`
   returns the bare array; `stepWorkingDirectory` returns `''`; `ScopedReadinessCommand.dir`
   is omitted; the component label suffix is omitted. No `if (isSingleRepo)` guard
   appears at any rendering site.
6. **MC-6 — Every declared component reaches the payload, including profile-less
   ones.** A component whose stack is blank or unrecognized appears in
   `CommandsPayload` with `commands: []`. This is what lets the runner tell "this
   path belongs to a component that runs nothing" apart from "this path belongs to no
   component" (MC-11), which are different situations and get different output.
7. **MC-7 — Component paths are normalized, deduplicated and canonically ordered
   before anything reads them.** `apps/web`, `./apps/web`, `apps/web/` and
   `apps//web` all normalize to `apps/web`; two entries normalizing to the same path
   are `USAGE` (SC12). Because normalized paths are distinct by construction, the
   longest-prefix match of MC-9 can never tie, and needs no tie-break rule.
8. **MC-8 — Containment applies to component paths.** A component path that is
   absolute, or that normalizes to `..` or a `../`-prefixed path, is `USAGE`.
   Component directories are never created by `init`; a declared component that does
   not exist on disk at init time produces one `io.warn` naming it and is otherwise
   written normally (a component directory may legitimately be created after
   scaffolding).

### Path → component resolution (the runner)

9. **MC-9 — Longest-prefix match, on path segments, never on raw strings.** A
   touched path is made relative to the runner's `cwd` and POSIX-normalized. A
   component `d` matches it iff `d === '.'`, or `rel === d`, or
   `rel.startsWith(d + '/')`. Among matches, the one with the most path segments
   wins. `apps/web` therefore never matches `apps/web-admin/x.ts` (SC6), which a
   `startsWith(d)` test would get wrong. Recorded as **ADR 0039**.
10. **MC-10 — `'.'` is an ordinary component that behaves as the catch-all.** It
    matches every path under `cwd` and has zero segments, so it wins only when no
    longer component matches. It is legal in any position of the list and needs no
    special declaration syntax.
11. **MC-11 — A path belonging to no component is dropped, with a notice, never
    reassigned.** When at least one touched path matches no component, the runner
    prints exactly one line to stderr naming the count:
    `harny-feedback: <N> touched path(s) matched no declared component; skipped.`
    It is never handed to an arbitrary component's linter (which would produce
    findings from the wrong toolchain) and never silently discarded (which would
    hide a misdeclared component). A path resolving outside `cwd` entirely is treated
    the same way. With today's single `.` component, `N` is always `0` and the line
    is never printed — byte-identical output (MC-5).
12. **MC-12 — Every command runs with its own component's directory as its working
    directory, and probes are evaluated there too.** `requirementMet(command.requires,
    componentCwd)`, then `spawnSync(binary, args, { cwd: componentCwd })`. This is what
    makes `anyFile: ['tsconfig.json']` and `script: 'test'` resolve against
    `apps/web/tsconfig.json` and `apps/web/package.json` rather than the install
    root's. Touched paths continue to be passed as the **absolute** paths the
    accumulator recorded, so they remain correct regardless of the command's cwd and
    remain byte-identical for a single-component install.

### CI rendering

13. **MC-13 — One workflow, one job, one runner call — and per-component install
    steps.** The generated block contains, in canonical component order: at most one
    dependency-install step per component whose resolved profile declares
    `ciInstall`, each carrying `working-directory: stepWorkingDirectory(prefix, path)`
    when that value is non-empty; then **exactly one** runner-invocation step,
    carrying `working-directory: prefix` when non-empty (the install directory — the
    runner resolves components itself). No `strategy:`, no `matrix:`, no second job,
    no second workflow file, no `on.*.paths`, no `defaults.run.working-directory`
    (SC9). This is `ci-workflow-root` contract XC-6's decided shape, reached by
    extension: ADR 0032's step-level scoping is applied to more steps, and nothing
    it introduced is removed.
14. **MC-14 — Step names stay unique and legible, and only widen when they must.**
    With exactly one component: install step name, runner step name and notice step
    name are byte-identical to today (`Install dependencies (<displayName>)`,
    `harny feedback (<displayName>)`). With more than one component: each install
    step is named `Install dependencies (<displayName> — <componentPath>)`, and the
    single runner step is named `harny feedback (<displayNames, deduped, in canonical
    component order, comma-joined>)`. The `templates/ci/harny-feedback.yml` header
    comment gains one paragraph describing the multi-component shape; it is the only
    canonical-region change this feature makes, and it is regenerated into this
    repo's own committed workflow in the same feature (the pattern `ci-workflow-root`
    used under its C4).
15. **MC-15 — No generator learns what a component is.** The `Generator` interface
    gains no member. Each of the five `renderHook` implementations changes exactly
    one expression — `const commands = profile ? profile.commands : []` becomes
    `const commands = payload.commands` — and `grep` over `src/generators/**` finds no
    component vocabulary, with exactly one bounded exception: the display strings
    MC-16 requires inside `renderProjectConfigBlock` in `markdown-yaml.ts`, a shared
    rendering helper that is not a tool generator (SC14). Emitting the word is not
    understanding the thing; no file here dispatches on, resolves, or matches a
    component. Continues `ci-workflow-root` XC-5's posture.
16. **MC-16 — The conductor's generated block gains lines, and moves none.**
    `renderProjectConfigBlock` emits its existing lines in their existing order and
    appends, immediately after the `Project stack:` line's position and only when the
    install declares components, one line per component:
    `- Component: <path> — <stack><' (no built-in profile)' when unresolved>`. For a
    single-repo config the block is byte-identical (`project.stack` is set,
    `config.components` is absent). For a monorepo config `project.stack` is
    `undefined`, so no `Project stack:` line is emitted and the component lines stand
    in its place — the escape-hatch legibility of `feedback-controls.md` FC-2 is
    preserved per component. These lines are the sole, deliberate exception to
    MC-15's component-vocabulary gate, and they are confined to this one function:
    SC14 scopes the gate to permit them here and nowhere else under
    `src/generators/**`.

### Per-turn and whole-project execution

17. **MC-17 — A component with no assigned touched path runs nothing at all in
    turn-based `run` mode.** Not its per-file commands, and not its `whole-project`
    commands. A two-file edit in one component of a ten-component repo must not
    trigger ten type-checks.
18. **MC-18 — A `whole-project` command runs once per component that has at least
    one assigned touched path, from that component's directory, with no path
    arguments.** "At least one assigned path" — not "at least one path that passed
    some extension gate" — because that is the exact generalization of today's
    single-component behavior, where a turn touching only `README.md` does run
    `tsc --noEmit`. The accepted cost is that a `.md` edit inside `apps/web` still
    type-checks `apps/web`, precisely as it type-checks the root today. Recorded as
    **ADR 0041**.
19. **MC-19 — `--whole-project` (CI) runs every command of every component, from
    that component's directory, with `.` as the per-file sentinel.** No turn state is
    read or written (`feedback-controls.md` FC-20 unchanged), the `.` sentinel still
    bypasses both the extension gate and the existence check (FC-24 unchanged), and
    the trailing summary line keeps its exact text with counts summed across
    components: `harny-feedback: <ran> of <total> command(s) ran, <skipped> skipped.`
    For one component the counts and the text are byte-identical. A finding anywhere
    still exits `2`, never mediated by `stop_hook_active` (FC-19, FC-20 unchanged).

### Readiness

20. **MC-20 — Readiness commands are scoped by data, and their ids stay unique.**
    For each resolved component with a profile, each of that profile's `readiness`
    commands is emitted into `checks.json`'s `commands`. With more than one
    component, each carries `dir: <componentPath>` and its `id` becomes
    `<command.id>:<componentPath>`; with exactly one `.` component, `dir` is omitted
    and `id` is unchanged. Recorded as **ADR 0042**.
21. **MC-21 — `run-doctor.mjs` gains no literal and no new family.** Family 5
    resolves each command's working directory as
    `path.resolve(cwd, command.dir ?? '.')` and evaluates that command's `requires`
    probe against the same directory. `checks.json`'s `version` stays `1`;
    `DoctorChecksFile` gains no field of its own; a `checks.json` generated before
    this feature (no `dir` anywhere) produces byte-identical runner behavior, because
    `path.resolve(cwd, '.')` is `path.resolve(cwd)` (`readiness-checks.md` RD-3's
    "every path is data, never a literal in the runner", preserved).
22. **MC-22 — Five families, same order, same count.** `readiness-checks.md` RD-1
    and I3 are untouched. Families 1–4 are not per-component: one install has one
    `.sdd/`, one conductor, one skill root set, one `specs/`, and one CI workflow, so
    their entries are unchanged in number and in content (MC-23).
23. **MC-23 — Verb and direct invocation still agree (RD-7).** `runDoctor` already
    re-derives placement; it now also re-derives components from the same
    `.sdd/harness.json` it already reads, so `npx harny doctor` and
    `node .sdd/doctor/run-doctor.mjs` evaluate the same per-component command set and
    exit with the same code (SC10).

### CLI and prompts

24. **MC-24 — `--component <path>=<stack>` is repeatable and replaces wholesale.**
    Repeating it accumulates into one list, which then replaces the component set
    entirely (never merges into a `--config` file's list). It parses with the same
    first-`=`-wins rule `--model` already uses. `--component` together with `--stack`
    in one invocation is `USAGE` (MC-1).
25. **MC-25 — The shape question is asked first, and presets behave like every other
    preset.** Interactive `init` asks *"Is this a single repo or a monorepo?"*
    (default: single repo) before any stack question. Answering "single repo" leads to
    exactly today's stack question, unchanged in wording, so the single-repo
    interactive transcript is unchanged after that point. Answering "monorepo" loops
    a path question and a stack question until an empty path ends the loop, requiring
    at least one component. A flag-supplied `--stack` or `--component` presets the
    shape question, which is then skipped and reported through `io.log`, the same
    treatment `preset.tools`/`preset.gates` already receive.
26. **MC-26 — The path prompt validates inline against the one normalizer.** The
    `text` prompt's `validate` callback calls `normalizeComponentPath` and surfaces
    its message, so a bad path is re-asked immediately rather than raising `USAGE`
    after the whole interactive session completes. `prompts.ts` stays widget wiring:
    it owns no rule, only the call.
27. **MC-27 — `runInit` stays thirteen steps.** Component resolution folds into the
    existing step 9 (`buildPayload`) and step 11 (render), exactly as `context7-mcp`
    folded MCP building into step 11 and `ci-workflow-root` folded placement
    resolution into it. `cli-init.md` CLI-1 is unchanged in count and in order.
28. **MC-28 — Every per-component misconfiguration warns once, naming the
    component.** Step 9b's escape-hatch warning becomes per component: an explicitly
    configured component stack matching no built-in profile emits one `io.warn`
    naming that component's path and the unrecognized value alongside the built-in
    profile ids. A blank component stack is not warned about (it is a legitimate
    "this component has no automated feedback"), matching today's treatment of a
    blank `config.stack`.

### Scope fences

29. **MC-29 — No new dependency, no new template file, no new generated path.**
    `AGENTS.md` S4; `cli-init.md` invariant 3 and CLI-10 both unchanged.
30. **MC-30 — `ci-workflow-root` is extended and nothing of it is deleted.**
    `src/repo.ts` is unmodified: `resolveInstallLocation`, `componentSlug`,
    `ciWorkflowPathFor` and `ciWorkflowPathFromInstallDir` keep their exact bodies.
    ADR 0032's no-`paths:`-filter and no-`defaults.run` rules hold. ADR 0034's slug
    rule and `CONFLICT` posture hold and still govern subdirectory installs.
    `GeneratedFile.root` keeps exactly one assignment site in all of `src/`
    (`feedback-controls.md` I7, `ci-workflow-root` WR-5's grep gate).
31. **MC-31 — This feature implements no part of `component-level-docs`.** No
    per-component document is written, no per-component repo-readiness entry is
    added, and no manifest or directory heuristic is introduced.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| One source supplies both a non-empty `stack` and a non-empty `components` | `HarnessError('USAGE')` naming both fields and the source | Exit 2. Nothing written. Remediation: declare the root as `{ path: '.', stack: … }` |
| `--component` and `--stack` in one invocation | Same as above, naming both flags | Exit 2. Nothing written |
| `--component` with no `=`, or an empty left-hand side | `HarnessError('USAGE')` naming the offending argument and the expected `<path>=<stack>` form | Exit 2 |
| `--component apps/web=` (empty stack) | Accepted: a component with no `stack`. No warning (matches a blank `config.stack`) | Exit 0. That component runs no commands |
| A component path is absolute, or normalizes to `..` / `../…` | `HarnessError('USAGE')` naming the path | Exit 2. Nothing written |
| Two components normalize to the same path | `HarnessError('USAGE')` naming the duplicate normalized path | Exit 2. Nothing written |
| `components` present but an empty array | `HarnessError('USAGE')`: a declared component list must have at least one entry | Exit 2 |
| `components` is not an array, or an entry is not an object, or `path` is not a string | `HarnessError('USAGE')` naming the field and the source, in `validateIdList`'s existing message style | Exit 2 |
| A component's `stack` matches no built-in profile | Inert, never fatal: every artifact is written, that component contributes `commands: []`, one `io.warn` names the component path and the value with the valid profile ids (`feedback-controls.md` FC-2, per component) | Exit 0 with a named warning |
| No component's stack resolves to a profile | The workflow's escape-hatch notice step is generated exactly as today, and the runner receives an all-empty payload | Exit 0. Same behavior as today's unrecognized single stack |
| A declared component directory does not exist on disk at `init` time | One `io.warn` naming the path; the run proceeds and writes everything | Exit 0 with a named warning |
| At runtime, a touched path matches no declared component | Dropped; one stderr notice line naming the count (MC-11) | The turn's other components still run; exit code unaffected |
| At runtime, a component's directory does not exist | That component's `requires` probes resolve false (`anyFileExists`/`scriptExists` fail), so its commands are SKIPPED with the existing notice, never failed (`feedback-controls.md` I3) | Advisory notice only; exit unaffected |
| At runtime, a component's directory does not exist and one of its commands declares no `requires` probe (`requires: {}`) | The runner checks the directory itself before dispatching (`componentDirExists`, both `run` and `--whole-project`): that component is skipped wholesale with exactly one stderr notice naming the component path and its command count, in MC-11's notice style. Never fatal, never spawned with a nonexistent `cwd`, and the directory is never created as a side effect of running a linter | Advisory notice only; the turn's other components still run; under `--whole-project` those commands count as `skipped` in the summary line; exit code unaffected |
| `--commands` carries an object without a `components` array | Normalized to `[]`: no commands, no output, exit 0 — today's tolerant posture for an unusable `--commands` value, unchanged | Silent no-op |
| A `checks.json` entry carries a `dir` naming a directory that does not exist | `spawnSync` fails to start the child; family 5 reports it through its existing failure path | Reported as a `FAIL` line; runner exits 2, verb exits 6 |
| An existing `.sdd/harness.json` carries only `stack` | Loads, validates and merges exactly as today; never migrated, never warned about (MC-4) | No change, no message |

## Dependencies

- **Internal**: `src/config.ts` (`HarnessConfig`, `PartialHarnessConfig`,
  `mergeConfig`, `validateConfig`, `loadConfigFile`, `serializeConfig`,
  `parseModelAssignment`'s `=`-splitting idiom), `src/engine.ts` (`buildPayload`,
  `ProjectConfigSummary`, `HookPayload`, `CiPlacement`, `ROOT_PLACEMENT`,
  `renderCiWorkflow`, `renderInstallGateChain`, `renderRunnerInvocation`,
  `buildFeedbackFiles`), `src/feedback.ts` (`STACK_PROFILES`, `resolveStackProfile`,
  `StackProfile`, `FeedbackCommand` — **read only; not modified**), `src/repo.ts`
  (`resolveInstallLocation` — **read only; not modified**), `src/doctor.ts`
  (`DoctorChecksFile`, `buildDoctorChecks`, `buildDoctorFiles`, `runDoctor`),
  `src/init.ts` (`runInit`), `src/prompts.ts` (`runInitPrompts`), `src/cli.ts`
  (flag registration), `src/errors.ts` (`HarnessError`),
  `src/generators/markdown-yaml.ts` (`yamlQuote`, `renderProjectConfigBlock`),
  all five `src/generators/*.ts` (`renderHook`, one expression each).
- **Node builtins**: `node:path` (`path.posix.normalize`, `path.posix.join`,
  `path.relative`, `path.resolve`) — already used across `src/` and in both runners.
- **External packages**: **none added, none removed, none version-changed**
  (`AGENTS.md` S4). `@clack/prompts`' existing `select`/`text` widgets carry the new
  questions.

## Integration Points

- **`runInit` step 9 → `buildPayload` → `resolveComponents`** — components are
  resolved once per run and stored on `ProjectConfigSummary`, which every consumer
  already receives. No consumer re-derives them, and no second copy exists (S5).
- **`runInit` step 11 → `buildCommandsPayload` → `HookPayload.commands`** — the
  runner wire format is computed once, in the composition root, and handed to all
  five generators identically. This is the seam that keeps generators
  component-blind.
- **`runInit` step 11 → `buildFeedbackFiles(payload, { prefix })`** — unchanged
  signature; the builder reads components off the payload it already has.
- **`runDoctor` → `buildDoctorChecks(config, generators, { prefix })`** — unchanged
  signature; the checks builder reads components off the `config` it already has,
  which is the same `.sdd/harness.json` the verb already parses (RD-7 preserved).
- **`.sdd/doctor/checks.json` → `templates/doctor/run-doctor.mjs`** — the component
  directory travels as data in the new `dir` field, so the runner acquires no literal
  and stays generic (RD-3).
- **The generated workflow → `.sdd/feedback/run-feedback.mjs`** — unchanged
  invocation shape (`run --whole-project --commands <inline JSON>`); only the JSON's
  shape widens. ADR 0017's "reuse the shared runner rather than duplicate its logic
  in YAML" is what makes one runner call sufficient for N components.
- **`templates/hooks/README.md` § "The behavior"** — gains a seventh property
  stating, tool-neutrally, that a touched path is resolved to exactly one declared
  component and that component's commands run from that component's directory
  (`AGENTS.md` S7). `feedback-controls.md` FC-4 currently pins this section at
  "exactly six properties" and is amended below rather than broken.
- **`AGENTS.md` § "Feedforward vs. feedback"** — the feedback-computational cell
  becomes true per component; no quadrant moves.

## Architecture Decision Records

Expected under `specs/monorepo-mode/decisions/`, continuing the repo-wide monotonic
sequence (highest existing: **0037**):

| ADR | Decision | Guarantee |
|---|---|---|
| 0038 | `components` **replaces** `stack` (mutually exclusive), rather than coexisting with `stack` as a fallback for unlisted paths | MC-1 |
| 0039 | Longest **segment**-prefix match; a path matching no component is dropped with a notice rather than assigned to a default or silently discarded | MC-9, MC-11 |
| 0040 | The component list travels on the payload, **not** as a new `CiPlacement` field — a declined, justified departure from `ci-workflow-root` XC-6's anticipated mechanism whose guarantee still holds | § `CiPlacement` |
| 0041 | A `whole-project` command runs once per component **with at least one assigned touched path**, not once per declared component and not gated on the extension filter | MC-18 |
| 0042 | Component scoping for readiness is a `dir` field on the **generated checks entry** in `src/doctor.ts`, never a field on `CommandSpec` in `src/feedback.ts` | MC-2, MC-20 |

## Proposed amendments to `specs/current/`

Applied by `harny-sync` archive mode after this feature ships. Every one is a
**widening**; none retires or contradicts an existing statement.

| Statement | Change |
|---|---|
| `feedback-controls.md` FC-1 | Add: components select among the profiles in that one table by stack string; the table itself gains no per-component field (MC-2) |
| `feedback-controls.md` FC-2 | Widen to per component: an unrecognized stack on any component is inert, warned naming that component, and leaves every artifact written (MC-28) |
| `feedback-controls.md` FC-4 | Amend "exactly six properties" to **seven**, the seventh being per-component dispatch, stated tool-neutrally (§ Integration Points) |
| `feedback-controls.md` FC-6 | Add: batching and deduplication are unchanged; the deduped set is additionally partitioned across components, and each command sees only its own component's share (MC-9, MC-12) |
| `feedback-controls.md` FC-7 | Add: a monorepo install still produces exactly one workflow with exactly one runner-invocation step; per-component install steps are the only per-component steps (MC-13) |
| `feedback-controls.md` FC-13 | Add: this repo's own install remains single-repo `stack: typescript` at the git root, and all eight dogfood paths stay byte-identical (SC3) |
| `feedback-controls.md` FC-20 | Add: `--whole-project` covers every component; turn state is still never consulted (MC-19) |
| `feedback-controls.md` I3 | Add: probe evaluation is per component, against that component's own directory (MC-12) |
| `feedback-controls.md` I7 | Unchanged, restated as still-true: exactly one artifact resolves against the repository root (MC-30) |
| `cli-init.md` CLI-1 | Add: step 9 also resolves components and step 11 also builds the commands payload; still thirteen steps, same order (MC-27) |
| `cli-init.md` CLI-4 | Add: the component list is part of the determinism input set, and is canonically ordered so two configs differing only in declaration order produce identical output (MC-7) |
| `readiness-checks.md` RD-1 / I3 | Unchanged, restated as still-true: five families, same order (MC-22) |
| `readiness-checks.md` RD-2 | Unchanged, restated as still-true: `kind: 'test'` and `extensions` remain compile errors where they were; `dir` is added on the generated-entry type, not on `CommandSpec` (MC-2, ADR 0042) |
| `readiness-checks.md` RD-5 | Add: probe-skip determinism is evaluated per component, against that component's directory (MC-12, MC-21) |
| `readiness-checks.md` RD-7 | Add: the verb re-derives components as well as placement, which is what keeps agreement true for a monorepo install (MC-23) |
| `_index.md` § Keyword lookup | Add rows: `components` → `feedback-controls`, `cli-init`; `monorepo mode` → `feedback-controls`; `--component` → `cli-init`; `per-component dispatch` → `feedback-controls`; `longest-prefix match` → `feedback-controls` |
| `_index.md` § Decisions | Register ADRs 0038–0042 with their `Capability:` fields read from the ADR files themselves |
