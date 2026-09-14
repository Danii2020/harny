# Contract: agent-feedback-controls

> Traces to `intent.md` goals G1–G7 and success criteria SC1–SC20. Every
> interface, guarantee and amendment below cites the goal it serves.
>
> **Post-audit amendment, 2026-09-13.** This contract was audited on 2026-09-13
> (`audit.md`, verdict APPROVED WITH RESERVATIONS) and then amended in response to
> finding **F1 (HIGH)** — "the generated CI gate cannot pass as written". The amendment
> is § "Post-audit amendment A1"; it rewrites **BG-9, BG-10** and the scope sentence of
> **BG-11**, extends **BG-7**, adds **BG-19–BG-21**, adds `FeedbackInstall`/`ciInstall`
> to `src/feedback.ts`, adds one CI-only flag to the shared runner's CLI surface, and
> adds reservations **R6** and **R7**. Everything marked **(A1)** below post-dates the
> audit and has **not** been re-audited; the rest of this document is as audited.
> A1 requires its own human review gate before `harny-test`/`harny-implement` run.

## Verified per-tool facts

All five tools' hook surfaces were fetched from first-party documentation on
**2026-09-13**. These supersede the event names relayed in the feature brief, **three
of which were wrong** — recorded here because `tool-generators.md` TG-6 requires a
dated first-party citation for every per-tool fact, and because a wrong event name is
the AL-30 silent-failure mode (a hook written to an event a tool never fires exits 0
and reports nothing).

### V1 — Turn-completion event, config path, and wrapper shape (G2, SC5)

| Tool | Event id | Config path | Wrapper shape | Source |
|---|---|---|---|---|
| Claude Code | `Stop` | `.claude/settings.json` | `{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": … } ] } ] } }` | https://code.claude.com/docs/en/hooks |
| Cursor | `stop` | `.cursor/hooks.json` (project), `~/.cursor/hooks.json` (user) | `{ "version": 1, "hooks": { "stop": [ { "command": …, "type": "command", "timeout": … } ] } }` | https://cursor.com/docs/hooks |
| Kiro | `agentStop` | `.kiro/hooks/<kebab-name>.json` | `{ "version": "v1", "hooks": [ { "name": …, "trigger": …, "action": { "type": "command", "command": … } } ] }` | https://kiro.dev/docs/hooks/types/, https://kiro.dev/docs/hooks/ |
| GitHub Copilot | `agentStop` (alias `Stop`) | `.github/hooks/*.json` | `{ "version": 1, "hooks": { "agentStop": [ { "type": "command", "bash": … } ] } }` | https://docs.github.com/en/copilot/reference/hooks-reference |
| Codex CLI | `Stop` | `hooks.json` (or inline `[hooks]` in `config.toml`) | `{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": …, "timeout": … } ] } ] } }` | https://learn.chatgpt.com/docs/hooks (from `developers.openai.com/codex/hooks`, 308) |

**Corrections to the brief**, each a would-be silent failure:

1. **Kiro is `agentStop`, not `Agent Stop`.** The docs render the *label* "Agent Stop"
   in prose; the trigger id is camelCase.
2. **Kiro's file events are `fileCreate`/`fileSave`/`fileDelete`, not
   `PostFileCreate`/`PostFileSave`/`PostFileDelete`.** See V6 for an unresolved
   casing conflict inside Kiro's own docs.
3. **Cursor's hook config is `.cursor/hooks.json` with a top-level `version: 1`**, and
   its per-entry key is `command` + `type`, not a bare string.
4. Copilot's hook entry uses **`"bash"`**, not `"command"`, as the script key.
5. Codex's `hooks.json` **does** have a `"hooks"` wrapper key and a nested
   `hooks` array (identical in shape to Claude Code), contradicting secondary sources
   that claim event names sit at the file root. First-party doc wins.

### V2 — No tool's turn-completion payload enumerates the turn's edited files (G2)

This is the single most consequential finding, and it resolves `intent.md` G2's open
"is an accumulator needed?" question **uniformly, for all five tools**:

| Tool | `Stop`-equivalent payload fields | Enumerates edited files? |
|---|---|---|
| Claude Code | `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `stop_hook_active`, `last_assistant_message`, `background_tasks`, `session_crons` | **No** |
| Cursor | `status`, `loop_count` + common base (`conversation_id`, `generation_id`, `model`, `workspace_roots`, …) | **No** (only `subagentStop` carries `modified_files`) |
| Kiro | session context as JSON on STDIN; `hook_event_name`, `cwd`, `session_id` | **No** |
| GitHub Copilot | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `stopReason: "end_turn"`, `stop_hook_active` | **No** (`transcriptPath` only) |
| Codex CLI | `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `turn_id`, `stop_hook_active`, `last_assistant_message`, `permission_mode` | **No** |

**Consequence:** the accumulator `intent.md` G2 permitted as an optional per-tool
detail is in fact **mandatory on every tool**. The canonical design is therefore a
fixed two-part mechanism, not a per-tool choice — which is simpler than the
conditional design intent.md anticipated, and removes the "simpler form preferred
where available" branch entirely.

### V3 — Accumulation surface per tool (G2)

| Tool | Event | Path field available |
|---|---|---|
| Claude Code | `PostToolUse`, `matcher: "Edit\|Write"` | `tool_input.file_path` |
| Cursor | `afterFileEdit` | `file_path` (+ `edits[]` of `old_string`/`new_string`) |
| Kiro | `postToolUse` (IDE **and** CLI); `fileSave`/`fileCreate` are IDE-only | tool context JSON on STDIN |
| GitHub Copilot | `postToolUse` | tool input payload |
| Codex CLI | `PostToolUse`, `matcher` supported | `tool_input`, `tool_name` (`apply_patch`), `turn_id` |

Cursor's `afterFileEdit` is preferred over its `postToolUse` because it yields
`file_path` directly. Kiro's `fileSave`/`fileCreate` are **IDE-only**, so `postToolUse`
is the only surface that works on both Kiro IDE and Kiro CLI and is therefore the one
used (V6 records the residual risk).

### V4 — Feedback channel and blocking semantics per tool (G2, G4)

Each tool returns findings to the agent by a *different* mechanism. This is the
per-tool adaptation `templates/hooks/` must not hardcode (`AGENTS.md` S7 / PR-7).

| Tool | Non-blocking feedback channel | Blocking form | Runaway guard |
|---|---|---|---|
| Claude Code | `hookSpecificOutput.additionalContext` — "non-error feedback for Claude… shown in the transcript as hook feedback rather than a hook error" | `{"decision":"block","reason":…}`, or exit 2 + stderr | 8 consecutive blocks, then override |
| Cursor | *(none on `stop`)* | `{"followup_message": …}` — auto-submitted as the next user message | `loop_limit`, default 5 |
| Kiro | exit 0 + **STDOUT adds to agent context** | non-zero → STDERR shown as warning | not documented |
| GitHub Copilot | *(none on `agentStop`)* | `{"decision":"block","reason":…}` — `reason` becomes the next prompt | 8 consecutive `block`s, then override |
| Codex CLI | `hookSpecificOutput.additionalContext` (documented on `PostToolUse`); `systemMessage` on `Stop` | `{"decision":"block","reason":…}`, or exit 2 + stderr | `stop_hook_active` guard |

**Design consequence (BG-6):** only Claude Code and Kiro can deliver findings without
forcing another agent turn. Cursor and Copilot's only `Stop` channel *is* a
continuation. The canonical behavior is therefore specified as "findings reach the
agent before it yields control", which all five satisfy, rather than "without
consuming a turn", which only two satisfy.

### V5 — Claude Code hook mechanics (G2, G5)

`type: "command"` entries; `matcher` on `PostToolUse` (silently ignored on events
without matcher support); `${CLAUDE_PROJECT_DIR}` resolves project-relative script
paths; `Stop` receives `stop_hook_active` (true when already continuing from a stop
hook) — the field the runner must check to avoid an unbounded loop.

### V6 — Unresolved: Kiro trigger-name casing (carried as a reservation)

Kiro's own two documentation pages disagree. `https://kiro.dev/docs/hooks/types/`
lists triggers in camelCase (`agentStop`, `postToolUse`, `fileSave`);
`https://kiro.dev/docs/hooks/` documents the `trigger` field as "Event type in
**PascalCase** (e.g. `PostFileSave`, `PreToolUse`)" and its schema example uses
`"trigger": "PostFileSave"`. Both fetched 2026-09-13.

This is exactly the `tool-generators.md` **AL-30** class (per-tool facts never
confirmed against a live install). It is **not** resolvable from documentation, so:
Kiro's generator emits the `types/`-page camelCase form (the page whose subject *is*
the event vocabulary, and which is the only one enumerating `agentStop` at all), and
this feature ships **reservation R1** (§ Open reservations) requiring live
confirmation before Kiro's hook is claimed as working. No other tool has this problem.

## Interfaces

### Public API — `src/feedback.ts` (NEW) — G1

The single stack→command mapping. Imports only `./vocabulary.js` and `./errors.js`,
preserving `cli-init.md` CLI-11 (no import cycles).

```ts
/** How a command consumes the turn's touched-file set. */
export type PathMode = 'per-file' | 'whole-project';

export interface FeedbackCommand {
  /** Stable id, unique within its profile. Used in generated output and findings. */
  readonly id: string;
  /** `lint` and `typecheck` are the two computational-feedback kinds this feature
   *  ships. Deliberately NOT `test`: the test suite is already run by
   *  `harny-implement`/`harny-audit` and is far too slow for a per-turn hook. */
  readonly kind: 'lint' | 'typecheck';
  /** Argv, never a shell string — no quoting/injection surface. Executed from the
   *  target repo root. */
  readonly argv: readonly string[];
  /** `per-file` appends the turn's touched paths to `argv`; `whole-project` ignores
   *  them (e.g. `tsc --noEmit`, which cannot type-check a file in isolation). */
  readonly pathMode: PathMode;
  /** Probe deciding whether this command is usable in the target repo. When it
   *  resolves false the command is SKIPPED with a notice, never a failure (BG-9). */
  readonly requires: ToolProbe;
}

/** A presence test evaluated in the target repo at hook/CI runtime, not at
 *  generation time — `harny init` cannot know what a repo will install later. */
export interface ToolProbe {
  /** `package.json` script name that must exist, e.g. `typecheck`. */
  readonly script?: string;
  /** Executable that must resolve on PATH, e.g. `ruff`. */
  readonly binary?: string;
  /** Any one of these files must exist, e.g. `['.eslintrc.json', 'eslint.config.js']`. */
  readonly anyFile?: readonly string[];
}

/** **(A1 — NEW.)** One candidate dependency-bootstrap command for the CI surface
 *  only. Never executed by the per-turn hook: a developer's working tree already
 *  has its dependencies, and installing them on every turn would violate BG-1's
 *  one-cheap-run-per-turn posture. A fresh CI checkout has none, which is why the
 *  two surfaces differ here and nowhere else (see § A1). */
export interface FeedbackInstall {
  /** Stable id, unique within its profile. Appears in the generated step name. */
  readonly id: string;
  /** Argv, never a shell string — same rule as `FeedbackCommand.argv`. Run from
   *  the target repo root. */
  readonly argv: readonly string[];
  /** Gate for this candidate. Restricted to `anyFile`, and `anyFile` is REQUIRED
   *  here (unlike on `ToolProbe`, where every field is optional) so an ungated
   *  install candidate — one that would run `npm ci` in a repo with no manifest —
   *  is unrepresentable. See § A1 "Why install gating may be rendered into shell
   *  but command probes may not". */
  readonly requires: Required<Pick<ToolProbe, 'anyFile'>>;
}

export interface StackProfile {
  readonly id: StackProfileId;
  readonly displayName: string;
  /** Lower-cased match tokens. `resolveStackProfile` matches a normalized
   *  `config.stack` against these. */
  readonly aliases: readonly string[];
  /** In stable emission order. Never empty. */
  readonly commands: readonly FeedbackCommand[];
  /** **(A1 — NEW.)** Ordered CI-only install candidates; the FIRST entry whose
   *  `requires` gate passes is the one that runs, and no more than one ever runs.
   *  Absent (the `python` profile) or all-gates-false ⇒ no install happens, which
   *  is a notice and never a failure: every command then falls through to BG-9's
   *  ordinary probe-skip path. */
  readonly ciInstall?: readonly FeedbackInstall[];
}

export const STACK_PROFILE_IDS = ['typescript', 'python'] as const;
export type StackProfileId = (typeof STACK_PROFILE_IDS)[number];

/** The mapping. The ONLY place a feedback command string is written (SC1). */
export const STACK_PROFILES: readonly StackProfile[];

/** Case-insensitive, whitespace/punctuation-normalized alias match.
 *  Returns `undefined` for a blank, absent, or unrecognized stack — never throws
 *  (SC2, BG-8). */
export function resolveStackProfile(stack: string | undefined): StackProfile | undefined;

/** POSIX path, relative to the target repo root, of the shared runner script. */
export const FEEDBACK_RUNNER_PATH = '.sdd/feedback/run-feedback.mjs';
/** POSIX path of the generated GitHub Actions workflow. */
export const CI_WORKFLOW_PATH = '.github/workflows/harny-feedback.yml';
/** Where the runner accumulates one turn's touched paths. */
export const TOUCHED_FILES_DIR = '.sdd/feedback/.turns';
```

### Public API — `src/generators/types.ts` (MODIFIED) — G2

```ts
export interface Generator {
  // …existing members unchanged…

  /** **(NEW — agent-feedback-controls.)** Where this tool reads its hook config,
   *  POSIX, relative to the target repo root. A fixed per-generator constant (V1).
   *  Unlike `skillsDir`, no two generators share a value. */
  readonly hooksPath: string;

  /** **(NEW — agent-feedback-controls.)** Renders this tool's native hook config.
   *  Returns `undefined` when the tool's hook surface is unavailable for the
   *  resolved profile, in which case the generator contributes no hook artifact
   *  (never an empty or placeholder file at a path the tool would read). */
  renderHook(payload: HookPayload): GeneratedFile | undefined;
}
```

**Why a method, not just a declarative member — a conscious departure from ADR 0011.**
ADR 0011 added `skillsDir` and explicitly refused a `renderSkill` method, because skill
files are copied **verbatim** to a per-tool *path*: nothing about their content varies.
Hook configs are the opposite. V1 shows five mutually incompatible wrapper structures
(nested `hooks` arrays vs. flat; `command` vs. `bash`; `version: 1` vs. `"v1"` vs.
absent; an array-of-hooks file vs. an object keyed by event) and V4 shows five different
output contracts. That is structural per-tool variation, which is precisely what
`renderRole`/`renderConductor` already exist for. A declarative-only member would force
the variation into a shared renderer holding a five-way switch on `generator.id` —
strictly worse than the established adapter pattern and a violation of the same
separation ADR 0011 was protecting. `hooksPath` is still added declaratively, so the
"where" stays data and only the "how" is behavior.

### Public API — `src/generators/json.ts` (NEW) — G2

```ts
/** Deterministic JSON for generated config artifacts: keys in insertion order,
 *  2-space indent, exactly one trailing `\n`. The JSON counterpart of
 *  `markdown-yaml.ts` and `toml.ts`, satisfying `tool-generators.md` TG-5 and its
 *  invariant 1 (no generator hand-rolls serialization).
 *
 *  Uses `JSON.stringify` — a language builtin, NOT a new dependency (§ Dependencies). */
export function renderJson(value: unknown): string;
```

### Public API — `src/engine.ts` (MODIFIED) — G1, G3

```ts
export interface ProjectConfigSummary {
  // …existing members unchanged…
  /** **(NEW.)** The profile `config.stack` resolved to, or `undefined` when the
   *  stack is blank or unrecognized. Makes the escape hatch observable in the
   *  conductor's generated block rather than silent (SC2, SC3). */
  readonly stackProfile?: StackProfile;
}

export interface HookPayload {
  readonly project: ProjectConfigSummary;
  /** Resolved profile, or `undefined` — the inert form (BG-8). */
  readonly profile?: StackProfile;
  /** Canonical runner script contents, verbatim from `templates/hooks/`. */
  readonly runner: HookRunnerTemplate;
}

/** The CI workflow + the shared runner script: tool-neutral, written exactly once
 *  per run regardless of tool count — the same rule `buildSharedFiles` already
 *  applies to `.sdd/spec-schema/*` under `cli-init.md` CLI-8. */
export function buildFeedbackFiles(payload: HarnessPayload): readonly GeneratedFile[];
```

### Public API — `src/vocabulary.ts` (MODIFIED) — G4

```ts
/** Skills always scaffolded, regardless of selection. Pipeline-role order, then the
 *  shared skills (`harny-sync`, `harny-feedback`). */
export const CORE_SKILL_IDS = [
  'harny-propose',
  'harny-test',
  'harny-implement',
  'harny-audit',
  'harny-document',
  'harny-sync',
  'harny-feedback',   // ← appended; see § "Insertion position" below
] as const;
```

**Insertion position — appended last (SC9a, CLI-4).** `SKILL_IDS` is
`[...CORE_SKILL_IDS, ...OPTIONAL_SKILL_IDS]` (`src/vocabulary.ts:51–53`) and
`buildSkillFiles` orders emission by `SKILL_IDS.indexOf` (`src/engine.ts:141–143`), so
the insertion index directly determines generated file order, which CLI-4 requires to
be stable. Appending `harny-feedback` at the end of the core array is the **only**
position that leaves all eight existing ids at their current indices; any interior
insertion shifts `harny-adr` and `harny-standards` and changes the emission order of
artifacts unrelated to this feature. The array's ordering comment is updated in the
same edit (shown above): `harny-sync` was already a non-role skill sitting after the
five role skills, so "pipeline-role order, then sync" becomes "…then the shared
skills", which describes both trailing members without inventing a new grouping rule.

### Canonical templates — `templates/hooks/` (NEW) — G2, SC4

| File | Role |
|---|---|
| `templates/hooks/README.md` | The canonical hook behavior, stated tool-neutrally. Names the behavior first and each tool as an attributed example (`AGENTS.md` S7 / PR-7). Carries no tool's schema as normative. |
| `templates/hooks/run-feedback.mjs` | The shared runner. Copied **verbatim** to `.sdd/feedback/run-feedback.mjs`; identical bytes for every tool. |

`templates/ci/harny-feedback.yml` (NEW) — the GitHub Actions workflow template (G3).

**`templates/**` manifest grows to 26 files.** (An earlier draft of this line said
"22 → 25"; the shipped manifest and `tests/packaging.test.ts:78` both say **26**, which
§ "Amendments to shipped current-truth statements" already records against CLI-10. A1
adds **no** new template file — it modifies three existing ones — so the count is
unchanged by this amendment.)

### Runner CLI surface — `templates/hooks/run-feedback.mjs` (MODIFIED — A1) — G3

The runner's invocation surface is a public interface: five generated hook configs and
one generated workflow are written against it, so it is pinned here rather than left to
the script's own header comment.

```text
node .sdd/feedback/run-feedback.mjs accumulate
node .sdd/feedback/run-feedback.mjs run --commands <file-path|inline-json>
node .sdd/feedback/run-feedback.mjs run --whole-project --commands <file-path|inline-json>   # (A1 — NEW)
```

`--whole-project` is **one boolean flag on the existing `run` mode** — not a third
mode. The mode vocabulary stays exactly `accumulate | run`, so `templates/hooks/README.md`'s
canonical two-part description and all five generated hook configs are untouched by A1.
Under the flag, and only under it:

| Aspect | `run` (hook) | `run --whole-project` (CI) |
|---|---|---|
| STDIN turn key (`turn_id`/`session_id`/…) | required; absent ⇒ exit 0 | **not read, not required** |
| Turn file `.sdd/feedback/.turns/<turn-key>` | must exist; absent ⇒ exit 0 (BG-4) | **never read, never written, never deleted** |
| `pathMode: 'per-file'` | deduped touched paths appended to `argv` | exactly one argument, `.`, appended |
| `pathMode: 'whole-project'` | no paths appended | no paths appended (identical) |
| `requires` probe | skip with a notice (BG-9) | **identical code path**, identical notice |
| `stop_hook_active` suppression | applies (BG-5) | not applicable — no tool, no re-entry, empty STDIN |
| Exit code | `0` clean/skip-only/empty; `2` finding | identical **and load-bearing** (BG-19) |
| Trailing summary line | none (BG-4 keeps a clean turn silent) | one line: `harny-feedback: N of M command(s) ran, K skipped.` |

**No generated hook config may pass `--whole-project`** (BG-20). It exists solely
because CI has no turn to scope to.

## Data Models

### The stack→command mapping (G1, SC1, SC2)

```ts
export const STACK_PROFILES: readonly StackProfile[] = [
  {
    id: 'typescript',
    displayName: 'TypeScript / Node',
    aliases: ['typescript', 'ts', 'node', 'nodejs', 'javascript', 'js',
              'next', 'nextjs', 'react', 'typescript-node'],
    commands: [
      {
        id: 'eslint',
        kind: 'lint',
        argv: ['npx', 'eslint'],
        pathMode: 'per-file',
        requires: { anyFile: ['eslint.config.js', 'eslint.config.mjs',
                              '.eslintrc.json', '.eslintrc.cjs'] },
      },
      {
        id: 'tsc',
        kind: 'typecheck',
        argv: ['npx', 'tsc', '--noEmit'],
        pathMode: 'whole-project',
        requires: { anyFile: ['tsconfig.json'] },
      },
    ],
    // (A1 — NEW.) CI-only; first passing gate wins, at most one runs.
    ciInstall: [
      { id: 'npm-ci', argv: ['npm', 'ci'], requires: { anyFile: ['package-lock.json'] } },
      {
        id: 'npm-install',
        argv: ['npm', 'install', '--no-audit', '--no-fund'],
        requires: { anyFile: ['package.json'] },
      },
    ],
  },
  {
    id: 'python',
    displayName: 'Python',
    aliases: ['python', 'py', 'fastapi', 'django', 'flask', 'python-fastapi'],
    commands: [
      { id: 'ruff', kind: 'lint', argv: ['ruff', 'check'],
        pathMode: 'per-file', requires: { binary: 'ruff' } },
      { id: 'mypy', kind: 'typecheck', argv: ['mypy'],
        pathMode: 'per-file', requires: { binary: 'mypy' } },
    ],
    // (A1.) No `ciInstall`: deliberate, see BG-21 and reservation R6.
  },
];
```

`pathMode: 'whole-project'` for `tsc` is not a limitation being papered over: passing
file paths to `tsc` makes it ignore `tsconfig.json` entirely, which would silently
change the check being run. The model records that rather than pretending every tool
is per-file.

### Touched-file accumulation record (G2, V2, V3)

The accumulator writes one newline-delimited path file per turn:

```
.sdd/feedback/.turns/<turn-key>
```

`<turn-key>` is the first available of: the tool's own turn id (`turn_id` on Codex),
else `session_id`/`sessionId`/`conversation_id`. The `Stop` handler reads it, dedups
by absolute path, runs the commands, then **deletes** it — so a turn key reused across
turns cannot leak the previous turn's paths.

### Whole-project invocation record (A1, G3)

CI has no turn, so it has no accumulation record — **not an empty one, and not a
synthetic one**. `run --whole-project` bypasses the record entirely; the turn-key
precedence above and `TOUCHED_FILES_DIR` are simply not consulted, and
`.sdd/feedback/.turns/` stays empty on a CI runner (verified: the prototype run left
the directory untouched).

The touched-path substitute is a single fixed argument:

| `pathMode` | Hook argv tail | CI argv tail (A1) | Why |
|---|---|---|---|
| `per-file` | the turn's deduped absolute paths | exactly `.` | The repo root **is** the whole project, and `.` is the documented whole-project target for every per-file command this feature ships (`eslint .`, `ruff check .`, `mypy .`) |
| `whole-project` | *(none)* | *(none)* | Unchanged; `tsc --noEmit` already reads `tsconfig.json` |

**Why `.` and not "no argument at all".** Omitting the argument is *not* equivalent,
and the difference is load-bearing on two of the four shipped commands:

- **ESLint.** Per ESLint's own v9 migration guide (`docs/src/use/migrate-to-9.0.0.md`,
  "Change in behavior when no patterns are passed to CLI"), flat-config users get
  "linting the current directory" when no pattern is passed, but **eslintrc users get an
  error**. This profile's probe accepts `.eslintrc.json`/`.eslintrc.cjs`, so the
  eslintrc branch is reachable, and a bare `npx eslint` would red-gate it for a bogus
  reason — the exact F1 failure class. Passing `.` makes both branches behave the same.
- **mypy.** `mypy` with no target errors out ("no files or modules specified"); `mypy .`
  does not. (Not reachable in CI today under BG-21, but the rule must not depend on
  which profile is resolved.)

`spawnSync` receives `.` as one argv element, so this introduces no shell-quoting or
glob-expansion surface.

### Severity mapping (G4, SC10)

`harny-feedback` maps findings onto `harny-audit`'s existing buckets
(`.agents/skills/harny-audit/SKILL.md:112–117`) **by reference**, restating no
definition:

| Finding | Bucket |
|---|---|
| Type error (`typecheck` non-zero) | **CRITICAL** — a broken guarantee; blocks approval |
| Lint error severity `error` | **HIGH** |
| Lint severity `warning` | **MEDIUM** |
| Formatting-only / stylistic | **LOW** |
| Command skipped (probe false) | *Not a finding* — reported as coverage, per BG-9 |

## State Changes

| Path | Change | Rationale |
|---|---|---|
| `.sdd/feedback/run-feedback.mjs` | CREATE (once per run) | Shared runner, verbatim from canonical |
| `.sdd/feedback/.turns/` | runtime-only, gitignored in the target repo — via `.sdd/feedback/.turns/.gitignore` (CREATE, once per run, alongside the runner/workflow, `*` + `!.gitignore` so the ignore file itself stays trackable) | Accumulator scratch |
| `.github/workflows/harny-feedback.yml` | CREATE (once per run) | G3 |
| `.claude/settings.json` / `.cursor/hooks.json` / `.kiro/hooks/harny-feedback.json` / `.github/hooks/harny-feedback.json` / `hooks.json` | CREATE (per resolved generator) | G2, V1 |
| `src/vocabulary.ts` | MODIFY — `CORE_SKILL_IDS` 6 → 7 | G4 |
| `.gitignore` (this repo only) | MODIFY — see below | G5 |

### `.gitignore` amendment (G5, SC13, SL-10)

```gitignore
# Local agent config stays local; the harny-* skill bridge and the shared
# feedback hook settings are tracked.
.claude/*
!.claude/settings.json
!.claude/skills/
.claude/skills/*
!.claude/skills/harny-*
```

One line added. `!.claude/settings.json` must sit **after** `.claude/*` (a negation
only re-includes what a preceding pattern excluded) and **before** the
`.claude/skills/` group is irrelevant to it — the two negations are independent because
they match different paths. `.claude/settings.local.json` is **not** re-included and
stays ignored; `.claude/agents/**` stays ignored. SL-10's guarantee is therefore
extended by exactly one tracked path, and its "ordering is load-bearing" property is
preserved rather than disturbed.

## Behavior Guarantees

1. **(G2, SC6a) One run per turn.** For a turn touching M distinct files via N edits
   (N ≥ M ≥ 1), each resolved command executes **exactly once**, receiving exactly M
   deduped paths (or none, for `whole-project`). Verified by counting runner
   invocations, not by inspecting findings.
2. **(G2, V2/V3) Two-part mechanism, always.** Every generated hook config registers
   both a post-edit accumulator and a turn-completion runner. A hook config registering
   only one of the two is a contract violation — no tool's `Stop` payload enumerates
   touched files (V2), so a runner without an accumulator has nothing to check.
3. **(G2, SC6) No per-edit invocation.** No generated hook config binds any
   `STACK_PROFILES` command to a per-edit event. The accumulator appends a path and
   exits; it never executes a mapped command.
4. **(G2) Empty turn is a no-op.** A turn touching zero files runs no command and
   produces no output.
5. **(G2, V5) Loop safety.** The runner checks the tool's re-entry flag
   (`stop_hook_active` where present) and emits no blocking response on re-entry, so it
   cannot drive Claude Code/Copilot's 8-block override or Cursor's `loop_limit` of 5.
6. **(G2, V4) Findings reach the agent before it yields.** On every tool the runner
   uses that tool's documented channel (V4). Where a non-blocking channel exists
   (Claude Code `additionalContext`, Kiro STDOUT) findings are delivered without forcing
   a turn; where it does not (Cursor, Copilot) the continuation channel is used. The
   guarantee is delivery before yielding, never "without consuming a turn".
7. **(G1, SC1; extended by A1) Single source of command strings.** No command string
   from `STACK_PROFILES` appears as a literal in any generator, template, workflow, or
   skill body. Generators and the runner receive them from `src/feedback.ts`; the
   workflow receives them through the generated block. Enforced by a test grepping the
   shipped tree for each `argv[0]`. **(A1)** This now covers `ciInstall[].argv` on the
   same terms: `npm`/`npm ci` is a `STACK_PROFILES` string like any other, so it may not
   be literalled into `src/engine.ts` or `templates/ci/harny-feedback.yml`, and the
   grep gate extends to each install entry's `argv[0]`. The canonical workflow template
   outside the generated block therefore still contains **no** command string at all.
8. **(G1, SC2) Escape hatch — inert, never fatal, never silent.** When
   `resolveStackProfile` returns `undefined`: no `HarnessError` is thrown; the CI
   workflow and the runner are still written; the runner exits 0 after printing a
   single named notice; the workflow runs one step that prints the same notice and
   succeeds; `io.warn` names the unrecognized value and lists `STACK_PROFILE_IDS`; and
   the conductor's generated block records "Project stack: <value> (no built-in
   profile)". The artifacts are present and valid, and the absence is legible in four
   places.
9. **(G1; AMENDED by A1 — closes `audit.md`'s BG-9 PARTIAL) Absent tooling is skipped,
   not failed, on _every_ surface this feature ships.** A command whose `requires` probe
   is false at runtime is skipped with a one-line notice and does not affect exit status
   — in the per-turn hook **and in CI**, because both surfaces reach the probe through
   the *same* `probeSatisfied` call in the *same* shared runner. A generated hook cannot
   know what a repo installs later, and a hook that fails because a linter is absent
   trains users to delete it — and a PR gate that fails for the same reason trains them
   to delete the workflow.
   *As originally written this guarantee said only "does not affect exit status", which
   the audit correctly found untrue of the CI path: `renderCiWorkflow` emitted one raw
   step per command and never consulted `requires`. The guarantee is not weakened here;
   the surface that failed to honor it is being brought under it (BG-10).*
10. **(G3, SC7/SC8; REWRITTEN by A1) One workflow per run, and its steps are the runner.**
    `.github/workflows/harny-feedback.yml` is written exactly once regardless of tool
    count and triggers on `pull_request`. Its generated block contains **exactly two
    kinds of step and nothing else**:
    1. **At most one dependency-install step**, emitted only when the resolved profile
       declares `ciInstall`. It runs the first candidate whose `anyFile` gate matches, in
       declaration order, and prints a notice and does nothing when none matches.
    2. **Exactly one runner invocation**, `node .sdd/feedback/run-feedback.mjs run
       --whole-project --commands '<inline JSON>'`, carrying the resolved profile's
       `commands` as inline JSON — the same `FeedbackCommand[]` shape, embedded the same
       way (`wrapPosixShellArg`, `src/generators/json.ts:21`) the five hook configs
       already embed it.

    One step per command is **forbidden**: it is what made probes unreachable in CI.
    `pathMode` is still "ignored" in the sense BG-10 always meant — CI checks the whole
    project, never a per-turn set — but that is now *implemented* by the runner's
    whole-project rule (§ Data Models "Whole-project invocation record"), not by
    dropping the runner from the loop. The escape-hatch case (no resolved profile) is
    unchanged: one notice step, exit 0, no install step, BG-8's four-place legibility
    intact.
11. **(TG-3/TG-4; scope clarified by A1) Canonical fidelity preserved, unamended.**
    `templates/hooks/run-feedback.mjs` appears **byte-for-byte** in the generated
    `.sdd/feedback/run-feedback.mjs`. See § "TG-3 resolution" below.
    **(A1) What this guarantee does and does not freeze.** It constrains the *generated
    copy* to equal the *canonical template*; it has never frozen the canonical template
    against revision during this feature's own development. A1 revises
    `templates/hooks/run-feedback.mjs` to add the `--whole-project` flag, and BG-11 is
    satisfied exactly as before: one canonical file, copied verbatim, identical bytes for
    every tool, asserted by the existing fidelity test against whatever the canonical
    file then contains. This is the same precedent as Phase 4's addition of
    `.sdd/feedback/.turns/.gitignore` — capability added to canonical content mid-feature,
    fidelity rule untouched. What BG-11 *would* forbid is a CI-specific variant of the
    runner, or the workflow carrying its own copy of the probe logic; A1 introduces
    neither.
12. **(CLI-4/S3) Determinism and containment.** Identical config + templates produce
    byte-identical hook/CI artifacts; every path is relative and inside `targetDir`;
    every artifact ends in exactly one `\n`. JSON artifacts are emitted only through
    `renderJson`.
13. **(CLI-5) Conflict detection unchanged.** A pre-existing `.claude/settings.json`,
    `.cursor/hooks.json`, or `.github/workflows/harny-feedback.yml` is a `CONFLICT`
    without `--force`, detected before the first write. This is a realistic case —
    unlike `.sdd/`, these paths are frequently already populated.
14. **(CLI-7) Skipped tools contribute nothing.** A tool without a resolved generator
    contributes no hook artifact.
15. **(G4, SC9a) `harny-feedback` is core.** It is scaffolded by every run;
    `--skills none` still emits it; naming it in `--skills` raises the existing
    `USAGE` "always scaffolded" error (`src/config.ts:466–474`). `CORE_SKILL_IDS` has
    7 members, `OPTIONAL_SKILL_IDS` 2, `SKILL_IDS` 9.
16. **(G4, SC11) Skill parity.** Every edit to `.agents/skills/harny-{implement,audit}/SKILL.md`
    lands identically in `templates/skills/`, per the divergence table
    `templates-skill-library-parity` established.
17. **(G4; extended by A1) The auditor verifies, it does not re-run.** `harny-audit`'s
    new step checks that the hook fired and its findings were addressed, and that the CI
    gate is green — it does not re-invoke `STACK_PROFILES` commands itself.
    **(A1)** "Green" alone is no longer sufficient evidence, precisely because BG-9 now
    holds in CI: a run in which every command was probe-skipped is also green. The
    auditor reads the run's log for the runner's `N of M command(s) ran, K skipped.`
    summary and reports `N = 0` as a gap, exactly as it already reports a hook that never
    fired. This is still verification, not re-execution.
18. **(TG-6) Every per-tool fact is cited.** Each generator's hook path, event id and
    wrapper shape traces to a V1–V6 row with its 2026-09-13 first-party URL.
19. **(A1; G3, SC8) In CI, a finding fails the job — the one place exit 2 is not
    translated.** The runner's exit code is the CI step's exit code, unmediated: `0`
    (clean, skip-only, or nothing to run) is a green check; `2` (at least one mapped
    command reported a finding) is a **red** check. This is the deliberate inverse of
    the hook surface, where exit 2 is *never* allowed to fail the tool's own process —
    there, each generator's wrapper catches 2 and re-expresses it on that tool's V4
    channel (Claude Code/Codex `additionalContext`, Kiro STDOUT, Cursor/Copilot a forced
    continuation), always exiting 0 itself, because a hook that hard-fails an agent's
    turn is a worse citizen than one that reports. CI has no such concern: a PR gate's
    entire purpose is to be red, and there is no agent turn to protect. No wrapper
    script therefore appears in the workflow — the step invokes the runner directly, and
    GitHub Actions' own non-zero-exit rule does the rest. An install-step failure fails
    the job for the same reason, and is attributable because it is its own named step.
20. **(A1; G3) CI never touches turn state.** The workflow passes `--whole-project`, so
    the run reads no turn key, requires no turn file, creates none, and deletes none;
    `TOUCHED_FILES_DIR` is untouched on a CI runner. Conversely, **no generated hook
    config passes `--whole-project`** — a hook that ignored the turn's touched files
    would silently re-check the entire project on every turn, defeating BG-1's
    one-cheap-run-per-turn design. Both halves are contract violations if breached, and
    both are cheaply testable (a grep of the five rendered hook configs for the flag; an
    assertion that a CI-mode run against a repo with no `.turns/` directory still runs
    its commands).
21. **(A1; G1, G3) The `python` profile's CI gate is probe-skip-only, by decision.**
    `python` declares no `ciInstall`, so its workflow installs nothing, `ruff` and `mypy`
    are absent from a stock runner image, both probes resolve false, both are skipped
    with BG-9 notices, and the job is green having executed no check. This is a scoped
    non-goal, not an oversight: this feature never defined a Python dependency-install
    convention, and there is no single correct one to guess (`pip install -r
    requirements.txt` vs. `poetry install` vs. `uv sync` vs. `pip install -e '.[dev]'`,
    each with its own marker file and its own failure modes), so inventing one here would
    be exactly the kind of unverified per-tool guess V6/AL-30 exist to prevent. The
    resulting vacuum must not be silent, which is what the runner's trailing summary line
    (`harny-feedback: 0 of 2 command(s) ran, 2 skipped.`) is for — it appears in the CI
    log of every whole-project run. Recorded as reservation **R6**; a future feature adds
    `ciInstall` to the `python` profile and nothing else has to change.

### TG-3 resolution — no amendment needed (open question 3)

`tool-generators.md` TG-3 requires the canonical body to appear byte-for-byte as a
contiguous substring of every generator's output. A JSON hook config carries no
canonical prose, so the question was whether TG-3 needs a narrow amendment.

**It does not.** TG-3 is already scoped, in its own words, to "every role and the
conductor" — the body-carrying artifacts. `.sdd/harness.json` has been a generated JSON
artifact since `cli-skeleton` (`serializeConfig`, `src/config.ts:400–418`) and has never
been subject to TG-3. Hook configs join that existing class.

The canonical content of this feature is split so that the fidelity guarantee lands
where content actually exists:

| Artifact | Class | Fidelity rule |
|---|---|---|
| `run-feedback.mjs` | canonical resource | **verbatim copy**, byte-identical across all five tools — the *stronger* Gu 9/10 rule ADR 0012 established for skills |
| hook config JSON | per-tool wrapper | structural, per-tool; carries no canonical body — like frontmatter |
| CI workflow | canonical template + delimited block | canonical text verbatim; config confined between `GENERATED_BLOCK_BEGIN`/`END` |

This is the same body/wrapper split that already exists for roles, with the script
playing the body's part. TG-3 is **clarified in `specs/current/`** to say explicitly
that it governs body-carrying artifacts (which is what it already means), and BG-11
gives the script a stronger guarantee than TG-3 would have.

**(A1) Unchanged by the post-audit amendment.** A1 revises the canonical runner's
*contents* and the canonical workflow template's *header comment*; it changes neither
artifact's class in the table above nor its fidelity rule. The runner is still one
canonical file copied verbatim with identical bytes for every tool, and the workflow is
still canonical text with configuration confined between the two markers — A1 changes
only what the splice puts between them (BG-10) and what the canonical text says about it.

### YAML — no serializer module, no dependency (open question 2)

A general YAML serializer is **not** needed and must not be added. The workflow is one
known document shape, not arbitrary objects, so it ships as a canonical text template
with configuration confined to a delimited generated block — the mechanism
`renderProjectConfigBlock` (`src/generators/markdown-yaml.ts:43–67`) already
implements. The only YAML-specific operation required is **quoting** interpolated
command strings, and `yamlQuote` already exists and is already shared
(`src/generators/markdown-yaml.ts:15–18`); reusing it is exactly what `AGENTS.md` S5
requires. A JSON module *is* genuinely needed, because four wrapper shapes must be
serialized deterministically — but it wraps `JSON.stringify`, a language builtin.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| `config.stack` blank/absent | No error. Inert form per BG-8 | Warning naming `STACK_PROFILE_IDS`; artifacts still written |
| `config.stack` unrecognized | No error. Inert form per BG-8 | Same, quoting the unrecognized value |
| Hook/CI path already exists, no `--force` | `HarnessError('CONFLICT')` before any write | Exit 3; nothing written |
| `templates/hooks/**` or `templates/ci/**` missing | `HarnessError('TEMPLATE')` naming the file | Exit 5; "packaging bug, not your configuration" |
| A generator's `renderHook` returns `undefined` | Generator contributes no hook artifact; run succeeds | Noted in run summary |
| Probe false at runtime (linter absent) | Command skipped, notice printed, exit unaffected (BG-9) | Hook reports which checks ran and which were skipped |
| Mapped command exits non-zero | Findings routed via the tool's V4 channel; runner exits 0 | Agent receives findings and self-corrects |
| Mapped command not found despite probe | Treated as a skip, not a failure | One notice line |
| Runner re-entered (`stop_hook_active`) | Emits no blocking response (BG-5) | No loop |
| Accumulator file unreadable/absent at `Stop` | Treated as an empty turn (BG-4) | No output |
| **(A1)** Mapped command reports a finding **in CI** | Runner exits 2; step and job fail (BG-19) | Red PR check; the finding's own output is in the step log |
| **(A1)** Probe false **in CI** (linter absent, no install convention) | Skipped with the BG-9 notice; exit status unaffected | Green check whose log names each skipped command and the `N of M ran` summary |
| **(A1)** No `ciInstall` gate matches (no `package-lock.json`, no `package.json`) | Install step prints a notice and does nothing; the run continues | Green-or-red on the checks themselves, never on the missing install |
| **(A1)** Install command itself fails (e.g. lockfile out of sync with `package.json`) | The install step fails; the job is red; the feedback step does not run | Red check attributed to a step named for the install, not to a check |
| **(A1)** `.sdd/feedback/run-feedback.mjs` absent from the checkout | The feedback step's guard fails the job with a named message telling the user to re-run `harny init` and commit the runner | Red check; never a silently-green gate that checked nothing |
| **(A1)** `--whole-project` passed with no `.sdd/feedback/.turns/` present | Normal, expected CI case: commands run, nothing is read or deleted (BG-20) | No user-visible difference |

## Dependencies

**No new runtime or dev dependency is added.** Per `AGENTS.md` S4 and `cli-init.md`
invariant 3, the exhaustive set is unchanged: `commander@15.0.0`,
`@clack/prompts@1.7.0` (runtime); `typescript@7.0.2`, `vitest@4.1.10`,
`@types/node@26.1.2` (dev).

Explicitly argued and rejected:

- **A YAML library (`js-yaml`, `yaml`).** Rejected — see § YAML above. Zero benefit for
  one known document shape, against S4's default-none posture.
- **A JSON serializer.** Unnecessary; `JSON.stringify` is a builtin.
- **ESLint for harny itself.** Rejected **for this feature**. harny has no linter today
  (`package.json:8–14`, no config file at root). Its dogfood profile therefore runs
  `tsc --noEmit` via the existing `typecheck` script and *skips* ESLint through the
  ordinary BG-9 probe path — which has the useful side effect of exercising the
  skip path on the maintainers' own repo. Adding ESLint is a separate decision needing
  its own contract line, per `intent.md` § Non-Goals.

**(A1) No new dependency of any kind — including no new GitHub Action.** The amendment
deliberately adds neither:

- **`actions/setup-node`.** Rejected. The workflow needs `node` (to run the runner) and
  `npm` (to install), both of which the `ubuntu-latest` hosted image already provides.
  Adding the action would introduce a second pinned third-party action version — a new
  external fact of exactly the TG-6/AL-30 class this feature has been disciplined about
  — to buy a Node-version pin that no guarantee here depends on. A project that wants one
  can add it by hand: it sits **outside** the generated block, which is the only region
  `harny init` overwrites.
- **A Python install convention.** Rejected for this feature; see BG-21 and R6.
- **A YAML serializer.** Still rejected, and A1 does not weaken the argument: both new
  step shapes render as single-line double-quoted YAML scalars through the existing
  shared `yamlQuote`, so `spliceGeneratedYamlBlock` needs no block-scalar support. The
  rendered form was parsed with a real YAML parser during this amendment's drafting and
  round-trips to the exact intended shell strings.

Internal dependencies: `src/feedback.ts` → `vocabulary.ts`, `errors.ts` only.
`src/generators/json.ts` → nothing. Both preserve CLI-11. **(A1)** `src/engine.ts` gains
an import of `wrapPosixShellArg` from `src/generators/json.ts` (which imports nothing),
alongside its existing `./generators/markdown-yaml.js` import — no cycle, CLI-11
preserved. Duplicating the quoting helper into `engine.ts` is forbidden (`AGENTS.md` S5).

## Integration Points

- **`src/init.ts:196–201`** — the file-assembly point. Hook artifacts join per resolved
  generator (beside `renderRole`/`renderConductor`); `buildFeedbackFiles(payload)` joins
  beside `buildSharedFiles`. `runInit`'s 13-step sequence (CLI-1) is **unchanged**: this
  adds artifacts within the existing render step, not a new step.
- **`src/engine.ts:73–79`** — `buildPayload` resolves `stackProfile` into
  `ProjectConfigSummary`, making `config.stack` load-bearing for the first time (SC3).
- **`src/prompts.ts:164–192`, `src/cli.ts:168`, `src/config.ts:49–50`** — the three
  "captured only" comments corrected (SC3).
- **`.agents/skills/harny-implement/SKILL.md:74–76, 83–85`** — Step 4 and the final
  checklist gain the `harny-feedback` call beside `harny-standards`.
- **`.agents/skills/harny-audit/SKILL.md:74–78`** — Step 5 gains hook-and-CI
  verification (BG-17).
- **`tests/packaging.test.ts:28–68`** — `EXPECTED_TEMPLATE_FILES` gains three paths;
  `toHaveLength(22)` → `(25)`.
- **`tests/canonical-fidelity.test.ts`** and **`tests/templates.test.ts`** — a gap
  discovered during Phase 1 implementation, not caught when this list was first
  written: both pre-existing tests hardcode `templates/`'s top-level shape and needed
  the same allowlist/expected-entries update `templates/skills/**` already received
  during `templates-skill-library-parity`, now extended to `templates/hooks/**`.
- **`AGENTS.md`** — `templates/` tree, the feedforward/feedback vocabulary (G7, SC17),
  and the skill list 8 → 9.

**(A1) Integration points this amendment touches**, all pre-existing files — no new
module, no new template file:

- **`src/feedback.ts`** — `FeedbackInstall` added; `StackProfile.ciInstall?` added;
  `typescript` gains two install entries, `python` gains none (BG-21).
- **`src/engine.ts:198–210` (`renderCiWorkflow`)** — rewritten: emits the optional
  install step plus exactly one runner invocation, instead of one raw step per command.
  It is the **only** `src/` function A1 changes behaviorally; `buildFeedbackFiles`,
  `buildPayload`, `runInit`'s 13-step sequence (CLI-1) and every generator are untouched.
- **`templates/hooks/run-feedback.mjs`** — `parseRunArgs` recognizes `--whole-project`;
  `runCommand` appends `.` for `per-file` under that flag; `run` mode takes the
  no-turn-state path when the flag is set and prints the summary line. The `accumulate`
  mode, the turn-file path, BG-4's silent clean turn and BG-5's re-entry suppression are
  byte-for-byte unchanged in behavior.
- **`templates/hooks/README.md`** — documents `--whole-project` as the CI-only flag and
  states BG-20's two-way rule (hooks never pass it; CI always does).
- **`templates/ci/harny-feedback.yml`** — its header comment currently says CI "runs the
  same computational-feedback commands as the Stop hook … with one difference: pathMode
  is ignored"; it is corrected to describe the runner invocation, the install step, and
  the red-on-exit-2 rule (BG-19). The canonical structure outside the markers otherwise
  stays as shipped, including `actions/checkout@v4`.
- **`.agents/skills/harny-audit/SKILL.md` (+ its `templates/skills/` twin, BG-16)** —
  the CI half of its verification step gains BG-17's A1 clause: read the run log's
  `N of M command(s) ran` summary, not only the check's conclusion.
- **Tests** — the regression the audit explicitly asked for ("consider a regression test
  asserting the CI path honors probes once F1 is fixed", `audit.md` § Recommendations):
  a CI-mode runner test proving probe-false ⇒ skip ⇒ exit 0, finding ⇒ exit 2, `per-file`
  ⇒ `.`, and no turn file read or created; plus `renderCiWorkflow` assertions that the
  generated block is install-step-plus-one-runner-step, that no hook config contains
  `--whole-project`, and that BG-7's grep gate covers `ciInstall[].argv[0]`.
  `tests/packaging.test.ts`'s `toHaveLength(26)` is **unchanged** — A1 adds no template
  file.

## Post-audit amendment A1 — the CI gate honors probes and installs dependencies

> **Made 2026-09-13, after this contract was audited**, in response to `audit.md`
> finding **F1 (HIGH)** and the BG-9 **PARTIAL** in its Behavior-Guarantee table.
> Scope: the CI surface only. No goal, non-goal, success criterion, phase, or task
> outside CI changes; `intent.md` and `roadmap.md` are not amended.

### What F1 found

The generated workflow ran one step per resolved `STACK_PROFILES` command directly
after `actions/checkout@v4`, with **no dependency install** and with each command's
`requires` probe **never evaluated** — probes existed only inside
`templates/hooks/run-feedback.mjs`, which the workflow never invoked. The auditor
reproduced the consequence in a dependency-free checkout of this repo: `npx eslint`
exit **2** (no `eslint.config.*` — a case the hook *skips*), `npx tsc --noEmit` exit
**1** (`npx` resolving an unrelated `tsc` package because TypeScript was not
installed). So harny's own first PR (the deferred SC12) would have shown a red gate
that proved nothing, and every scaffolded Node repo inherited the same.

F1 is a **spec gap faithfully implemented**, not an executor deviation: BG-10 as
written asked CI to "run the same `STACK_PROFILES` commands as the hook, with
`pathMode` ignored", and that is precisely what shipped. BG-9 promised skip-not-fail
without saying *which surfaces* it bound. A1 closes both holes in the contract first.

### The fix: CI invokes the same runner, in a CI-only mode

One source of truth for "skip absent tooling, don't fail", rather than two
implementations that drifted the moment one of them was written in YAML:

```yaml
      # <!-- harny:begin generated project configuration -->
      - name: "Install dependencies (TypeScript / Node)"
        run: "if [ -f package-lock.json ]; then npm ci; elif [ -f package.json ]; then npm install --no-audit --no-fund; else echo 'harny-feedback: no package.json in this checkout; skipping dependency install'; fi"
      - name: "harny feedback (TypeScript / Node)"
        run: "test -f .sdd/feedback/run-feedback.mjs || { echo 'harny-feedback: .sdd/feedback/run-feedback.mjs is missing from this checkout; run npx harny init and commit it'; exit 1; }; node .sdd/feedback/run-feedback.mjs run --whole-project --commands '[{\"id\":\"eslint\",…},{\"id\":\"tsc\",…}]'"
      # <!-- harny:end generated project configuration -->
```

Both steps are single-line double-quoted YAML scalars produced by the existing shared
`yamlQuote`; the inline commands JSON is embedded with the existing shared
`wrapPosixShellArg`. The install step's shell chain is rendered **from
`ciInstall`**, in declaration order, never literalled (BG-7). The guard on the second
step exists because a checkout missing the runner is the one way this design could
fail *silently* rather than loudly.

### Why the runner needed a new flag, and why only one

The runner's `run` mode was measured against the CI situation before anything was
specified. Against a scratch repo with `tsconfig.json`, the shipped runner behaves as
follows:

| CI-like invocation | Result |
|---|---|
| empty STDIN (no turn key) | **exit 0, nothing ran** — `run` returns early when `resolveTurnKey` finds nothing |
| STDIN `{"session_id":"ci"}`, no turn file | **exit 0, nothing ran** — `run` returns early when the turn file is absent (BG-4) |
| STDIN `{"session_id":"ci"}` + a hand-created empty turn file | commands ran; `tsc` reported; **exit 2** |

So `run` as shipped cannot be used by CI unmodified — it would produce a vacuously
green gate. The third row is the "synthetic turn file" workaround, and it is
**rejected**: it forces the workflow to re-encode `TOUCHED_FILES_DIR`'s layout and the
turn-key vocabulary in shell (a second source of truth for the exact internals A1 is
consolidating), it makes CI's behavior depend on a file the runner then deletes, and
it is semantically wrong — a `per-file` command with an empty path list is not the
same thing as a whole-project run (proved by `mypy`, which errors with no target, and
by eslintrc-era ESLint, which errors with no pattern). `--whole-project` states the
intent CI actually has, which BG-10 has claimed since the original contract
("`pathMode` ignored in CI").

**One flag, not a third mode**, so the `accumulate | run` vocabulary that
`templates/hooks/README.md` and all five generated hook configs are written against is
untouched; the flag is parsed by the existing `parseRunArgs` loop.

### Why install gating may be rendered into shell but command probes may not

The install step's gate is rendered as `[ -f <file> ]`, which *is* a second
implementation of a probe — so the line has to be drawn explicitly rather than by
taste. `FeedbackInstall.requires` is typed `Required<Pick<ToolProbe, 'anyFile'>>`: the **only**
probe kind whose shell equivalent is exact, dependency-free, and unable to drift
(`anyFile` means "one of these paths exists at the repo root"; `[ -f … ]` means the
same thing). `binary` (a PATH walk honoring `PATHEXT`) and `script` (a `package.json`
`scripts` key lookup) have no such faithful one-liner, which is why `FeedbackCommand`
probes — which use all three kinds — stay exclusively inside the runner. The type
makes the restriction unrepresentable rather than merely documented.

The alternative, teaching the runner an `--install` flag so install gating also ran
through `probeSatisfied`, was considered and rejected on two grounds: it grows the
byte-frozen runner by a second capability when the task's own instruction is to keep
runner changes minimal and only where truly required, and it merges dependency-install
output into the feedback step, destroying the failure attribution BG-19's last sentence
depends on.

### Verified behavior (prototype, 2026-09-13)

The design above was executed before being written down — a patched runner copy in a
scratch directory, driven through the exact rendered `run:` strings under `bash -e`,
against a repo with `tsconfig.json`, no ESLint config, and stub executables:

| Case | Observed |
|---|---|
| eslint probe false, `tsc` clean | ``skipped `eslint`: requirement not met``, `harny-feedback: 1 of 2 command(s) ran, 1 skipped.`, **exit 0** (green) |
| `tsc` reports a finding | finding text echoed, **exit 2** propagated through `bash -e` as the step's exit code (red) |
| ESLint config added | `2 of 2 command(s) ran`; the `per-file` command received exactly one argument, `.` |
| any of the above | `.sdd/feedback/.turns/` neither created nor read (BG-20) |

The workflow YAML above was parsed with a real YAML parser and its two `run:` scalars
round-tripped to the intended shell strings, quotes intact.

**Expected result on harny's own first PR (SC12).** With `npm ci` restored to the
pipeline: `eslint` is skipped (this repo still has no ESLint config — the deliberate
skip-path dogfood recorded under § Dependencies), and `npx tsc --noEmit` runs for real
and **exits 0** (measured in this repo on 2026-09-13 with dependencies installed). The
gate is therefore green *and* meaningful, which is what G5 claimed and F1 blocked.

## Amendments to shipped current-truth statements

Each was declared in `intent.md` § Problem Statement; none is broken silently.

| Statement | Amendment |
|---|---|
| `skill-library.md` **SL-1** | "eight" → **nine**; `harny-feedback` added to the enumeration, recorded as **core** |
| `cli-init.md` **CLI-10** | "eleven" → **26** `templates/**` files. Corrects a claim already stale at 22 (`tests/packaging.test.ts:67`) |
| `tool-generators.md` **TG-10** | 30 tool artifacts → 30 + one hook artifact per resolved generator; plus the once-per-run runner and workflow |
| `tool-generators.md` **TG-1** | "sufficient without amendment" narrowed a second time (after ADR 0011): gains `hooksPath` **and** `renderHook` |
| `tool-generators.md` **TG-3** | Clarified (not amended) to state it governs body-carrying artifacts; see § TG-3 resolution |
| `AGENTS.md:25–26` | "does not yet include … any publishing/CI tooling" — CI clause removed |
| `skill-library.md` **SL-10** | Extended by exactly one tracked path, `.claude/settings.json` |

## Dogfood generation divergence (Task 4.5, SC14)

Per the `templates-skill-library-parity` divergence-table discipline: every artifact
this repo committed from generator output is checked against what a plain downstream
run produces, and any gap is recorded here with its class and reason rather than left
implicit.

**Verification method.** A real `harny init <target> --tools claude-code --stack
typescript --yes` was run against a scratch target directory (a genuine downstream
invocation, not a simulation), and its three feedback artifacts were byte-diffed
against the copies committed at this repo's own root:

| Artifact | Relationship | Divergence class and reason |
|---|---|---|
| `.claude/settings.json` | **Byte-identical** | None. `diff` against the scratch downstream run's copy is empty. |
| `.github/workflows/harny-feedback.yml` | **Byte-identical** | None. Same. |
| `.sdd/feedback/run-feedback.mjs` | **Byte-identical** | None. Same; also byte-identical to `templates/hooks/run-feedback.mjs` (BG-11). |

**No content divergence of any kind.** Every byte of the three committed artifacts is
provably identical to plain generator output for the same `--stack typescript --tools
claude-code` inputs.

**One process/scope divergence, DC-4 (new class this feature introduces): partial
extraction instead of a full `init` run.** The three feedback artifacts were produced
by invoking `buildPayload`, `claudeCodeGenerator.renderHook`, and `buildFeedbackFiles`
directly against this repo's own root and writing only their three output paths —
not by running the full 25-file `runInit` pipeline against this repo's root and
accepting its entire write plan. A plain downstream run of `harny init --tools
claude-code --stack typescript` also writes `.claude/agents/*.md` (five role files),
`.claude/skills/{harny-*,sdd-conductor,README.md}`, `.sdd/harness.json`, and
`.sdd/spec-schema/*.md` — confirmed above by listing the scratch run's 25 files.
None of those other files were written into this repo: `.claude/agents/*.md` are this
repo's own hand-authored live subagents (`CLAUDE.md` § "The live subagents"),
`.claude/skills/harny-*` are the tracked symlink bridge to `.agents/skills/`
(`skill-library.md` SL-2), and `.sdd/harness.json`/`.sdd/spec-schema/*.md` model a
scaffolded *consumer* repo's own config, which this repo — the harness's own source —
is not. Running the full pipeline here would have tried to overwrite all of it with
generated stand-ins, which is out of Phase 4's scope (Tasks 4.1–4.6 only) and would
regress this repo's own dogfood conventions. Extracting only the feedback subsystem's
three artifacts is the narrower, reversible action Task 4.3/4.4 call for; the byte-diff
above establishes that the narrower path cost no content fidelity.

## Dogfood acceptance mechanics (G5)

**SC12 — CI on a real harny PR.** A branch is pushed and a PR opened against `main`
with `gh pr create`. Acceptance evidence recorded in `audit.md`: the workflow run URL,
`gh pr checks <n>` showing the check, and its conclusion. A local `act` run or a
`workflow_dispatch` trigger does **not** satisfy SC12 — only a `pull_request` event
proves the trigger.

**(A1) SC12 is gated on A1 shipping.** `audit.md` MA-1 says "do finding F1 first"; that
ordering is now contractual. Performing SC12 against the pre-A1 workflow would record a
red check as this feature's dogfood evidence. Additionally, the acceptance evidence must
show the run **log**, not just the conclusion: a green check whose log shows every
command skipped satisfies nothing (BG-21/R6), so the `N of M command(s) ran` summary
line and the `tsc` step's real execution are part of SC12's evidence, not decoration.

**SC13 — hook in a live Claude Code session.** With `.claude/settings.json` tracked, a
**new** session (settings are read at startup) edits a file introducing a deliberate
type error; acceptance evidence is the transcript excerpt showing the `Stop` hook's
findings delivered via `additionalContext`, plus a second run showing an edit-free turn
producing no output (BG-4).

**SC13 carries a known verification limit**, identical in kind to `skill-library.md`
**CR-1**: the session that creates `.claude/settings.json` cannot itself observe it
being loaded. Verification requires a restart and is therefore human-gated, recorded as
**R2**.

## Open reservations introduced by this contract

| ID | Reservation | Severity |
|---|---|---|
| R1 | Kiro's own docs disagree on trigger-name casing (V6). The camelCase form is shipped; a wrong guess fails silently (AL-30 class). Requires live Kiro confirmation | MEDIUM (human-gated) |
| R2 | SC13 cannot be verified in the session that writes `.claude/settings.json`; requires a restart (CR-1 class) | MEDIUM (human-gated) |
| R3 | Cursor and Copilot deliver findings only by forcing a continuation (V4). On a clean turn this costs nothing, but on a findings turn it consumes a turn against their loop guards. Accepted as the documented ceiling of those tools' surfaces | LOW |
| R4 | Kiro's `fileSave`/`fileCreate` are IDE-only, so accumulation uses `postToolUse` for both surfaces (V3); untested on Kiro IDE where the file events might be more accurate | LOW |
| R5 | **(Raised by the Phase 7 audit.)** Kiro's and GitHub Copilot's `postToolUse` accumulator payload field shape is assumed, not cited: both generators forward the payload unmodified on the premise it carries `tool_input.file_path` and a recognized turn key, but V3 pins only "tool context JSON on STDIN" (Kiro) and "tool input payload" (Copilot) — neither field name has a first-party citation, unlike Claude Code/Cursor/Codex. A wrong field name is silent (AL-30 class): `accumulate` exits 0 having recorded nothing, and the turn looks empty rather than erroring. Closeable only by a live Kiro run, a live Copilot run, or a first-party citation pinning both payloads' file-path field | MEDIUM (human-gated) |
| R6 | **(A1, post-audit.)** The `python` profile's CI gate is **probe-skip-only**: no `ciInstall`, so `ruff`/`mypy` are absent on a stock runner, both skip, and the job is green having checked nothing (BG-21). Scoped out deliberately — this feature never defined a Python install convention and there is no single right guess among `pip`/`poetry`/`uv`/editable-extras. Legible rather than silent (the runner's `N of M ran` summary is in every log), but a Python project scaffolded today gets a CI gate that is decorative until a follow-up feature adds `ciInstall` to the profile. Closeable by that follow-up; nothing else has to change | MEDIUM (scope, deliberate) |
| R7 | **(A1, post-audit.)** The `typescript` profile's install candidates cover npm only (`package-lock.json` → `npm ci`, else `package.json` → `npm install`). A pnpm or Yarn-Berry repo falls to the `npm install` branch, which usually works but fails on workspace-protocol (`workspace:*`) manifests; a repo whose install fails or is skipped then still has a **true** `tsc` probe (`tsconfig.json` exists) and re-enters F1's exact failure — `npx` resolving an unrelated `tsc` package — because `ToolProbe` has no way to ask "is this tool actually installed *locally*". Loud and attributable (a step named for the install, or a named finding), never silent. The robust fix is a new `localBinary` probe kind checking `node_modules/.bin/<name>`, which would also improve the hook path; out of A1's approved scope, which is CI reuse of the existing probe logic, not a new probe kind | MEDIUM (design, deferred) |
