# Contract: readiness-doctor

> Every item below cites the `intent.md` goal it serves. Nothing floats.
> Capability namespace this feature ships into: **`readiness-checks`**, prefix
> **`RD-`** (created from `harny-sync`'s bundled `capability-template.md` per `SL-6`;
> *not* folded into `feedback-controls`, whose § Purpose defines it as the feedback
> half of the Fowler split — see `intent.md` § Constraints).

## Interfaces

### Public API — `src/feedback.ts` (amended, not forked)

**(G4.)** The readiness commands attach to the **existing** stack table rather than a
second table. `FC-1`'s guarantee — *"exactly one named module/table that maps
`config.stack` to a set of … commands"* — is therefore widened, never broken: there is
still exactly one stack table, one alias index, one `resolveStackProfile`.

The leak `src/feedback.ts:29–31` warns about (a slow `test` command reaching the
per-turn hook) is prevented **structurally, by the type system**, not by a convention
or a grep test: `commands` cannot hold a `test` command because its element type
forbids that `kind`.

```ts
/** The two computational-FEEDBACK kinds: fast enough for a per-turn hook. */
export type FeedbackKind = 'lint' | 'typecheck';
/** The computational-FEEDFORWARD kind: run once before work starts, never per turn. */
export type ReadinessKind = 'test';

/** The shape both kinds share. Extracted verbatim from today's `FeedbackCommand`
 *  (`src/feedback.ts:26–42`) with `kind` made the only variable — no field added,
 *  removed, or renamed, so every existing consumer keeps compiling unchanged. */
export interface CommandSpec<K extends string> {
  readonly id: string;
  readonly kind: K;
  readonly argv: readonly string[];
  readonly pathMode: PathMode;
  readonly requires: ToolProbe;
}

/** Unchanged name, unchanged shape — now expressed as a narrowing. */
export type FeedbackCommand = CommandSpec<FeedbackKind>;
/** **(NEW.)** Carried by `StackProfile.readiness`, never by `StackProfile.commands`:
 *  `commands: readonly FeedbackCommand[]` makes a `kind: 'test'` entry a compile
 *  error, which is what keeps the test suite out of every per-turn hook and out of
 *  the CI workflow's inline JSON (BG-4). */
export type ReadinessCommand = CommandSpec<ReadinessKind>;

export interface StackProfile {
  readonly id: StackProfileId;
  readonly displayName: string;
  readonly aliases: readonly string[];
  readonly commands: readonly FeedbackCommand[];        // unchanged
  readonly ciInstall?: readonly FeedbackInstall[];      // unchanged
  /** **(NEW — readiness-doctor.)** Feedforward-computational commands: the full
   *  test-suite run `harny-doctor` performs before work starts. Optional and
   *  possibly empty for the same reason `ciInstall` is (BG-8's escape hatch);
   *  absent ⇒ the readiness run's test family reports a notice, never a failure. */
  readonly readiness?: readonly ReadinessCommand[];
}
```

Both shipped profiles gain a `readiness` entry, and each one's `requires` probe is the
existing `ToolProbe` — so an absent test runner is skipped with a notice, never a
failure (`SC8`, `I3`):

```ts
// typescript profile
readiness: [
  { id: 'npm-test', kind: 'test', argv: ['npm', 'test'], pathMode: 'whole-project',
    requires: { script: 'test' } },
],
// python profile
readiness: [
  { id: 'pytest', kind: 'test', argv: ['pytest', '-q'], pathMode: 'whole-project',
    requires: { binary: 'pytest' } },
],
```

### Public API — `src/doctor.ts` (new module)

**(G2, G3, G8.)** One new module, three responsibilities, in the same
model → build → compose layering `feedback.ts` → `engine.ts` → `init.ts` already uses.
Import direction is strictly downward: `cli.ts` → `doctor.ts` → `engine.ts` /
`feedback.ts` / `templates.ts` / `vocabulary.ts`; `init.ts` → `doctor.ts`. Nothing
imports `doctor.ts` back, so `CLI-11` (no cycles) holds and `src/vocabulary.ts` still
imports nothing.

```ts
/** POSIX paths, relative to the target repo root. Owned here; imported everywhere
 *  else, never re-literalled (S5) — the same rule `FEEDBACK_RUNNER_PATH` follows. */
export const DOCTOR_RUNNER_PATH = '.sdd/doctor/run-doctor.mjs';
export const DOCTOR_CHECKS_PATH = '.sdd/doctor/checks.json';
/** The spec-directory convention `AGENTS.md` § "The SDD spec schema" fixes. No `src/`
 *  module owned this string before this feature; this is now its only home. */
export const SPECS_DIR = 'specs';
/** Reserved `specs/` subdirectory names that are not features (`harny-sync`
 *  guardrails: "`<feature>` is neither `current` nor `archived`"). */
export const RESERVED_SPEC_DIRS = ['current', 'archived'] as const;
/** The header `harny-document` stamps and `harny-sync` archive mode requires. */
export const SHIPPED_MARKER = 'Shipped:';
/** The two non-`REJECTED` verdicts `harny-sync` archive mode accepts. */
export const APPROVED_VERDICTS = ['APPROVED WITH RESERVATIONS', 'APPROVED'] as const;

/** One "is this present?" assertion. `anyOf` is satisfied when ANY listed path
 *  exists, which is what lets one entry express "a conventions document, by
 *  whichever of its accepted names". `requires` gates the entry itself: when the
 *  probe is false the entry is SKIPPED with a notice, never failed — the entry-level
 *  application of `I3`, and what makes this harness legible in a repo that was never
 *  scaffolded by `harny init` (BG-9). */
export interface DoctorCheck {
  readonly id: string;
  readonly description: string;
  readonly anyOf: readonly string[];
  readonly remediation: string;
  readonly requires?: ToolProbe;
}

/** The generated data file's schema. Every value in it is derived at generation time
 *  from code that already owns it; the runner script hard-codes none of them (BG-3). */
export interface DoctorChecksFile {
  readonly version: 1;
  readonly specs: {
    readonly dir: string;                       // SPECS_DIR
    readonly reservedDirs: readonly string[];   // RESERVED_SPEC_DIRS
    readonly schemaFiles: readonly string[];    // from SPEC_SCHEMA_NAMES
    readonly shippedMarker: string;             // SHIPPED_MARKER
    readonly approvedVerdicts: readonly string[];// APPROVED_VERDICTS
  };
  readonly require: readonly DoctorCheck[];
  readonly commands: readonly ReadinessCommand[];
}

/** Pure: same config + same resolved generators ⇒ byte-identical result (CLI-4). */
export function buildDoctorChecks(
  config: HarnessConfig,
  generators: readonly Generator[],
): DoctorChecksFile;

/** The runner script (verbatim) + the checks file. Tool-neutral: written exactly
 *  once per run regardless of tool count, the `CLI-8`/`BG-10` rule. Returns `[]`
 *  when the loaded templates root carries no `doctor/run-doctor.mjs` — the same
 *  tolerated-absence posture `buildFeedbackFiles` takes (`src/engine.ts:266–268`). */
export function buildDoctorFiles(
  payload: HarnessPayload,
  generators: readonly Generator[],
): readonly GeneratedFile[];

/** Composition root for the `doctor` verb (G8). Locates the scaffolded runner,
 *  computes the checks, spawns the runner with `stdio: 'inherit'` so its report
 *  reaches the user verbatim, and translates the runner's exit code. Never writes,
 *  never prompts, never calls `process.exit` (cli-init.md invariant 2). */
export interface DoctorOptions {
  readonly targetDir: string;
  /** `--stack`, overriding `.sdd/harness.json`'s recorded value when both exist. */
  readonly stack?: string;
  readonly io: InitIO;
}
export interface DoctorResult {
  readonly ready: boolean;
  /** `id` of every `require`/command check that ran, skipped, or failed. */
  readonly ran: readonly string[];
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
}
export function runDoctor(options: DoctorOptions): Promise<DoctorResult>;
```

### Public API — `src/errors.ts` (one row added)

**(G8.)** A readiness run that completes correctly and reports red is neither
`EXIT.OK` nor any existing code; `EXIT.UNEXPECTED` (1) is reserved for bugs by
`CLI-2`. Of the two mechanisms `intent.md` § Constraints allowed, this contract pins
**extending the taxonomy** — because the alternative (a return channel from a
`commander` action to `main`) requires module-level mutable state, since commander
discards action return values, and that would be a worse trade than one table row:

```ts
export const EXIT = {
  OK: 0, UNEXPECTED: 1, USAGE: 2, CONFLICT: 3, NO_GENERATOR: 4, TEMPLATE: 5,
  /** **(NEW.)** The readiness check ran correctly and the answer is red. NOT a CLI
   *  failure: no other code may be used for it, and it may never be produced by any
   *  path other than `runDoctor`. */
  NOT_READY: 6,
  CANCELLED: 130,
} as const;

export type HarnessErrorCode =
  'USAGE' | 'CONFLICT' | 'NO_GENERATOR' | 'TEMPLATE' | 'NOT_READY' | 'CANCELLED';
```

`CLI-2`'s two substantive guarantees are preserved exactly: `HarnessError` remains the
only deliberately thrown type, and `EXIT_BY_CODE` remains the only mapping. This is
the fourth declared current-truth amendment (`intent.md` § Constraints).

### Public API — `src/cli.ts` (second verb)

**(G8.)** A sibling `commander` command on the same program, mirroring `init`'s shape
(`src/cli.ts:159–175`). `runInit` is not called, not modified, and not extended;
`CLI-1`'s 13-step sequence remains a true statement about `init`.

```ts
program
  .command('doctor')
  .description('Check whether this repository is ready for SDD work: environment, ' +
    'harness files, spec state, and the test suite.')
  .argument('[target]', 'Target directory to check', '.')
  .option('--stack <name>', 'Override the stack recorded in .sdd/harness.json')
  .action(async (target: string, cmdOptions: DoctorCommandOptions) => {
    await runDoctorCommand(target, cmdOptions, io);
  });
```

`runDoctorCommand` resolves `targetDir` against `process.cwd()` and reuses the
existing `assertWritableDirectory` (`src/cli.ts:92–101`) unchanged. No other flag is
added (`intent.md` § Non-Goals), and `--force`/`--dry-run` are deliberately absent
because this verb writes nothing.

### Public API — `templates/shared/probes.mjs` (new shared runtime module)

**(G2, G4.)** The probe evaluator is written **once** and imported by both generated
runners. It is a generated artifact like they are: it never imports from `src/`, has
no dependency, and is copied byte-for-byte into `.sdd/shared/probes.mjs`.

```js
/** Every signature is lifted verbatim from `run-feedback.mjs:156–202`; no behavior
 *  change, no parameter added or reordered. This module IS that code, relocated. */
export function scriptExists(scriptName, cwd) { /* package.json scripts lookup */ }
export function binaryExists(binary) { /* PATH + PATHEXT scan */ }
export function anyFileExists(files, cwd) { /* any listed path exists */ }
/** An empty/absent `requires` always resolves true. A false probe means SKIP with a
 *  notice, never a failure (BG-9). */
export function probeSatisfied(requires, cwd) { /* ... */ }
```

**Resolution — why one specifier serves both trees.** Both consumers sit exactly one
level below their root, and `shared/` is their sibling in both trees:

```text
templates/hooks/run-feedback.mjs   ──┐                .sdd/feedback/run-feedback.mjs  ──┐
templates/doctor/run-doctor.mjs    ──┼─► ../shared/   .sdd/doctor/run-doctor.mjs      ──┼─► ../shared/
templates/shared/probes.mjs        ──┘                .sdd/shared/probes.mjs          ──┘
```

Both scripts therefore carry the **identical** static specifier
`import { probeSatisfied } from '../shared/probes.mjs';`, which resolves against the
importing module's own URL — not `cwd` — so it is correct whether the script is run
from a target repo root, from CI, or in place inside `templates/`. The explicit
`.mjs` extension keeps it ESM regardless of the target repo's `package.json` `"type"`,
the same reasoning `--input-type=commonjs` encodes at
`src/generators/claude-code.ts:126–128`.

**A static import is chosen over a lazy `await import()`** deliberately: a
half-installed harness fails loudly and immediately rather than silently degrading,
and `run-feedback.mjs`'s synchronous `accumulate`/`run` flow needs no async rewrite.
The cost is stated in the Error Handling Contract and in `roadmap.md` R2.

### Modified: `templates/hooks/run-feedback.mjs` (prior shipped artifact)

**(G4.)** This feature **modifies an already-shipped artifact of the archived
`agent-feedback-controls` feature** — it does not merely add files beside it. The
change is exactly: delete the four probe functions (`run-feedback.mjs:156–202`), add
the one import line above, and update the module doc-comment so it stops implying the
script is a single self-contained file. No behavior of any mode changes; `accumulate`,
`run`, and `run --whole-project` are untouched.

Consequences, each of which must be carried by this feature and not discovered later:

- **`feedback-controls.md` `I5`** ("`templates/hooks/run-feedback.mjs` is copied
  verbatim into `.sdd/feedback/run-feedback.mjs`; no per-tool variant exists") stays
  true word-for-word, but the **generated feedback runtime is now two files, not one**.
  Amended accordingly — this is the fifth declared current-truth amendment
  (`intent.md` § Constraints lists four).
- **`FC-13`** (dogfood fidelity over `.claude/settings.json`,
  `.github/workflows/harny-feedback.yml`, `.sdd/feedback/run-feedback.mjs`) gains
  `.sdd/shared/probes.mjs` and this repo's own regenerated
  `.sdd/feedback/run-feedback.mjs`.
- **The CI runner guard** (`renderRunnerInvocation`, `src/engine.ts:216–223`) extends
  its `test -f` precondition to cover both files, because a checkout missing the shared
  module is now equally unable to run. `FC-7`'s "exactly two step kinds" holds: the
  guard lives inside the existing runner-invocation step, which is where a guard
  already lives today.
- **`tests/hooks/run-feedback.test.ts` keeps working unchanged.** It spawns the runner
  in place at `templates/hooks/run-feedback.mjs` (line 84) with `cwd` set to a
  tmpdir (line 121); the import resolves against the module URL, so
  `templates/shared/probes.mjs` is found. Any *future* test that copies a runner into
  a temp directory alone would break — this is called out so it is a known rule, not a
  surprise.
- **Source comments that describe the runner as frozen or standalone** must be
  corrected in the same pass: `src/generators/cursor.ts:148` ("byte-frozen
  `run-feedback.mjs`"), `src/generators/claude-code.ts:113` and `src/generators/kiro.ts:167`.
  Their substantive claim — *a generator never modifies the runner* — remains true and
  should stay; only wording implying a single immutable file changes.

### Public API — the canonical runner, `templates/doctor/run-doctor.mjs`

**(G2, G3.)** Dependency-free Node, copied byte-for-byte into
`.sdd/doctor/run-doctor.mjs`. Same authorship rules as `templates/hooks/run-feedback.mjs`:
no import of anything under `src/`, no command string, no path constant it was not
handed. It has **exactly one import**, `../shared/probes.mjs`, and contains no probe
logic of its own.

```text
node run-doctor.mjs [--checks <path-or-inline-json>]
```

`--checks` defaults to `.sdd/doctor/checks.json`, relative to `cwd`, and accepts
inline JSON detected by a leading `{` — the identical dual-form convention
`readCommands` already implements (`run-feedback.mjs:123–136`). `cwd` is the repo
being checked.

Exit codes, deliberately matching `run-feedback.mjs`'s existing convention so one
number means one thing across both scripts:

| Code | Meaning |
|---|---|
| `0` | Ready. Every check passed or was skipped with a notice. |
| `2` | Not ready. At least one check failed. |
| `1` | The runner itself could not run (unreadable/invalid `--checks`, unknown flag). |

### Public API — `templates/doctor/README.md`

**(G2, G3.)** The tool-neutral canonical behavior document, written to `S7`'s rule and
modelled on `templates/hooks/README.md`: the four check families are stated as
behavior first, with any tool named only afterward as an attributed example.

### Public API — the `harny-doctor` skill

**(G1, G6.)** `SKILL.md` at both roots, satisfying the shape contract (`SL-1`, `SL-3`,
`SL-4`): exactly the six portable frontmatter keys, `description` ≤ 1,536 characters,
the five body sections in order, `metadata.harny-role: shared`,
`metadata.harny-writes: none`. Required body content:

- **When to use this** — at session start; on demand before starting new spec work;
  directly by a human. It states, in the same sentence that names its own triggers,
  that the per-turn lint/type-check trigger and the before-marking-a-task-done trigger
  belong to `harny-feedback` and are not duplicated here (`SC11`).
- **Inputs** — `.sdd/doctor/run-doctor.mjs` and `.sdd/doctor/checks.json` (or the
  project's equivalents), `.sdd/harness.json` if present, `specs/`.
- **Steps** — run the check, read the report, and act: a failed check is addressed
  before spec work begins; a skipped check is reported as coverage, never as a pass.
- **Guardrails** — never restate a command string (name the mapping, read it live);
  never fix what it finds; never invoke `harny-sync` archive mode on the human's
  behalf; refer to other skills by name, never by path (shape-contract rule 5).

### Data Models

```ts
/** `.sdd/doctor/checks.json`, generated. Serialized with `JSON.stringify(x, null, 2)`
 *  plus a trailing newline — the exact form `serializeConfig` (`src/config.ts:402–419`)
 *  already uses for `.sdd/harness.json`, so both generated JSON artifacts agree
 *  (CLI-4, S5). Key order is the declaration order of `DoctorChecksFile`; every array
 *  is emitted in a fixed order (`require` in `buildDoctorChecks`' declaration order;
 *  `commands` in profile order). */
```

The `require` list `buildDoctorChecks` produces, in fixed order. Every path constant
is imported from the module that owns it — `SPEC_SCHEMA_DIR` and `HARNESS_CONFIG_PATH`
from `src/engine.ts`, `FEEDBACK_RUNNER_PATH` and `CI_WORKFLOW_PATH` from
`src/feedback.ts`, `skillsDir`/`conductorPath` from each resolved `Generator`,
`CORE_SKILL_IDS` from `src/vocabulary.ts` — never re-typed here (`S5`):

| `id` | `anyOf` | `requires` gate | Serves |
|---|---|---|---|
| `conventions-doc` | `AGENTS.md`, `CLAUDE.md` | *(none — universal)* | `intent.md` problem-statement item 4 |
| `harness-manifest` | `.sdd/harness.json` | *(none)* | item 1 |
| `spec-schema` | `.sdd/spec-schema/<name>.md` (one entry per `SPEC_SCHEMA_NAMES` member) | `{ anyFile: ['.sdd/harness.json'] }` | item 1 |
| `feedback-runner` | `.sdd/feedback/run-feedback.mjs` | `{ anyFile: ['.sdd/harness.json'] }` | item 1 |
| `ci-workflow` | `.github/workflows/harny-feedback.yml` | `{ anyFile: ['.sdd/harness.json'] }` | item 1 |
| `conductor` | each resolved generator's `conductorPath` | `{ anyFile: ['.sdd/harness.json'] }` | item 1 |
| `core-skills` | `<skillsDir>/<coreSkillId>/SKILL.md`, per resolved generator × `CORE_SKILL_IDS` | *(none — the skill roots are the agent's actual instructions)* | item 1 / `SL-5`'s blind spot |
| `knowledge-base` | `specs/current/_index.md` | `{ anyFile: ['specs/current'] }` | item 2 |

**Why the `.sdd/harness.json` gate exists** — without it, this feature's own repo
would be permanently red: `harny` is the tool, not a repo scaffolded by it, and
legitimately has no `.sdd/spec-schema/` or `.sdd/harness.json` while genuinely having
`.claude/skills/harny-*`, `specs/current/`, and a test suite. The gate is not a
special case for this repo; it is the honest general statement *"these artifacts are
required of a repo that `harny init` scaffolded"*, expressed with the same `ToolProbe`
the codebase already uses for exactly this purpose.

### State Changes

- **Written by `init` (all tool-neutral, once per run):** `.sdd/doctor/run-doctor.mjs`
  (verbatim copy), `.sdd/doctor/checks.json` (generated), and `.sdd/shared/probes.mjs`
  (verbatim copy). All three subject to `CLI-4` and `CLI-5` with no exception (`G5`).
  `.sdd/shared/probes.mjs` is emitted by one new `buildRuntimeSharedFiles(payload)` in
  `src/engine.ts` — **not** by `buildFeedbackFiles` and `buildDoctorFiles` separately,
  which would risk a duplicate entry in the write plan — guarded on
  `payload.sharedProbes` being present, and `SHARED_PROBES_PATH` is owned by
  `src/engine.ts` (the module that already owns the cross-subsystem tool-neutral
  paths), not by either subsystem's module.
- **Written by `doctor`: nothing, ever** (`SC19`). The verb has no write path; it does
  not create `.sdd/doctor/`, does not rewrite a stale `checks.json`, and does not
  touch `.sdd/feedback/.turns/`.
- **Templates root:** `CanonicalTemplates` gains `doctorRunner?: SkillResource`,
  `doctorReadme?: SkillResource` and `sharedProbes?: SkillResource`, all loaded
  through the existing `loadOptionalResource` (`src/templates.ts:436–445`) — absence
  tolerated for lean fixtures, never for the packaged root.
- **Vocabulary:** `CORE_SKILL_IDS` gains `harny-doctor` **appended last**, after
  `harny-feedback`; `OPTIONAL_SKILL_IDS` unchanged; `SKILL_IDS` therefore becomes 10
  with every existing member's index preserved (the insertion-position rule
  `src/vocabulary.ts:38–40` records, and the reason `FC-9`'s amendment is honored
  rather than broken).
- **Dogfood (this repo):** `.agents/skills/harny-doctor/SKILL.md`, the relative
  symlink `.claude/skills/harny-doctor` → it, `templates/skills/harny-doctor/SKILL.md`,
  `templates/doctor/*`, `templates/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`,
  `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`, and a **regenerated**
  `.sdd/feedback/run-feedback.mjs` (tracked today, and changed by this feature). No
  `.gitignore` change is needed: `!.claude/skills/harny-*` already covers the new
  symlink (`SC3`), and `.sdd/` is not ignored.
  **Post-implementation dogfood extension (human-approved, not part of the original
  approved design):** this feature's own `harness-manifest` and `spec-schema` `require`
  entries made this repo's long-standing lack of `.sdd/harness.json` and
  `.sdd/spec-schema/*.md` newly *visible* (they were never checked for before
  `harny-doctor` existed), rather than newly *true* — those two artifacts were always
  the honest, missing state of a repo `harny init` never fully scaffolded. Rather than
  document a permanent `NOT_READY` reservation for this repo, the human decided to
  complete the dogfood set instead: `.sdd/harness.json` (generated via
  `validateConfig`/`serializeConfig`, the same mechanism `buildSharedFiles` uses,
  reflecting this repo's actual live configuration — `tools: ['claude-code']`,
  all five roles at their actual `.claude/agents/*.md` tiers, all three gates, all ten
  skills, `stack: 'typescript'`) and `.sdd/spec-schema/{intent,contract,roadmap,tasks,audit}.md`
  (byte-copied from `templates/spec-schema/*.md`, the same mechanism `buildSharedFiles`
  uses) join the dogfood list above. `npx harny doctor` against this repo now exits `0`
  (Task 5.7's live proof, extended).
- **Packaging:** `templates/**` goes from 26 files to **30**
  (`skills/harny-doctor/SKILL.md`, `doctor/run-doctor.mjs`, `doctor/README.md`,
  `shared/probes.mjs`), asserted by `tests/packaging.test.ts`'s
  `EXPECTED_TEMPLATE_FILES` (`CLI-10` amended, `SC14`).

## Behavior Guarantees

1. **BG-1 (G3).** A readiness run evaluates all four families — environment,
   harness-file manifest, spec state, test suite — in that fixed order, and prints one
   line per check with an outcome of `ok`, `skip`, or `fail`. Order is fixed so two
   runs of the same repo state produce identical output.
2. **BG-2 (G3).** The run is **all-or-nothing in reporting, never in execution**: a
   failing check never aborts the run. Every check is evaluated, so one report shows
   everything wrong at once rather than one thing at a time.
3. **BG-3 (G2, G4).** `run-doctor.mjs` contains no command string, no stack name, no
   spec-directory name, no schema file name, and no `Shipped:`/verdict literal. Every
   such value arrives via `--checks`. The script's bytes are identical in a
   `--stack typescript` repo and a `--stack python` repo. Its only import is
   `../shared/probes.mjs`; it imports nothing from `src/` and nothing external.
4. **BG-4 (G4).** No `ReadinessCommand` ever reaches a per-turn hook config or the CI
   workflow: `renderHook` and `renderCiWorkflow` read `profile.commands`, whose element
   type cannot hold `kind: 'test'`. This is enforced at compile time and re-asserted by
   a test that greps every generated hook config and the generated workflow for the
   readiness commands' `id`s.
5. **BG-5 (G4).** A complete test-suite command string appears nowhere in `src/`,
   `templates/`, or `.agents/skills/` except in `src/feedback.ts`'s profile entries and
   in generated data — the `FC-1` grep gate, extended to the `test` kind (`SC9`).
6. **BG-6 (G3, G8).** Exit codes are total and disjoint: the runner exits `0` (ready),
   `2` (not ready), or `1` (runner failure); `runDoctor` maps them to `EXIT.OK`,
   `EXIT.NOT_READY` (6), and a re-thrown non-`HarnessError` (`EXIT.UNEXPECTED`, 1)
   respectively. No other code is reachable from this path.
7. **BG-7 (G8).** `npx harny doctor` and `node .sdd/doctor/run-doctor.mjs` evaluate the
   same checks and agree on ready/not-ready for the same repo state (`SC20`), because
   the verb passes `buildDoctorChecks`' output — the same function that produced the
   committed `checks.json` — to the same script. The verb is a locator and a runner,
   never a second implementation.
8. **BG-8 (G3).** An unresolved or blank stack is non-fatal (`FC-2` extended): the test
   family reports a single notice naming the unrecognized value and the built-in
   profile ids, every other family still runs, and the run can still exit `0`.
9. **BG-9 (G3).** A check whose `requires` probe is false is **skipped with a notice and
   never fails the run** (`I3`, `SC8`), using the same probe semantics as
   `run-feedback.mjs`. A skip is reported as coverage, never as a pass.
10. **BG-10 (G3).** The spec-state family reports, by feature name: a
    `specs/<feature>/` missing any of the five schema files, and a `specs/<feature>/`
    whose `intent.md` carries `Shipped:` and whose `audit.md` carries an approved
    verdict but which still sits outside `specs/archived/` (`SC7`). `current` and
    `archived` are never treated as features.
11. **BG-11 (G2, G5).** `.sdd/doctor/run-doctor.mjs` is byte-identical to
    `templates/doctor/run-doctor.mjs`, and `.sdd/shared/probes.mjs` to
    `templates/shared/probes.mjs` (`I5`'s rule, applied to both artifacts). All three
    generated artifacts are subject to `CLI-5` with no special case: if any path
    exists, the whole run writes nothing and exits `3` unless `--force` (`SC10`).
12. **BG-12 (G1).** `harny-doctor` is core: it is scaffolded under every configuration
    including `--skills none`, naming it in `--skills` is a `USAGE` error, and
    `CORE_SKILL_IDS`/`OPTIONAL_SKILL_IDS`/`SKILL_IDS` have lengths 8/2/10 with
    `harny-doctor` last in core (`SC1`).
13. **BG-13 (G1).** The two `harny-doctor/SKILL.md` copies (`.agents/skills/`,
    `templates/skills/`) satisfy `tests/skills-fidelity.test.ts`'s bijection with an
    explicit `DIVERGENCE_TABLE` entry (`SC2`); `FC-11`'s both-roots rule holds.
14. **BG-14 (G6).** `harny-feedback/SKILL.md`'s trigger lines are unchanged in both
    roots, and `harny-doctor` contains no lint/type-check command, no severity
    definition, and no per-turn trigger (`SC11`).
15. **BG-15 (G7).** After this feature, every skill-count and template-count statement
    in the repo agrees: `AGENTS.md`, `README.md:49,62,135,183`,
    `templates/skills/README.md:4`, and `tests/packaging.test.ts` (`SC13`, `SC14`).
    The two "eight skills" statements already stale before this feature are corrected
    in the same pass, not left as a second inconsistency.
16. **BG-16 (G7).** `AGENTS.md`'s feedforward/feedback table's feedforward-computational
    cell names this feature's artifacts, and the prose beneath it that currently reads
    *"there is no feedforward-computational quadrant in this repo today"* is rewritten
    so the table and its explanation cannot contradict each other (`SC12`).
17. **BG-17 (CLI-4).** `buildDoctorChecks` is pure and deterministic: identical config
    and generator set produce byte-identical `checks.json`, with no timestamp, no
    absolute path, and no environment-dependent value. Both artifacts end in exactly
    one `\n`, and every generated path is relative and inside `targetDir`.
18. **BG-18 (S4).** No runtime or dev dependency is added. Both runners and the shared
    module use only `node:fs`, `node:path`, `node:child_process`; `runDoctor`
    additionally uses `process.execPath` to invoke the same Node that is already
    running. The `../shared/probes.mjs` specifier is a relative file import, not a
    package specifier, so no resolution ever leaves the target repo.
19. **BG-19 (G4).** **Exactly one probe implementation exists.** `probeSatisfied`,
    `scriptExists`, `binaryExists`, and `anyFileExists` appear in
    `templates/shared/probes.mjs` and nowhere else under `templates/` — asserted by a
    test that greps both runners for those identifiers and finds only the import line.
    Probe-behavior drift between the feedback and readiness surfaces is therefore
    impossible by construction rather than by discipline, which is what makes `I3`
    ("Probe-skip is deterministic … the result is the same whether reached via
    per-turn hook or CI gate") extend safely to a third surface.
20. **BG-20 (G2).** Both generated runners carry the **identical** import specifier
    `'../shared/probes.mjs'`, and that specifier is correct in both the `templates/`
    tree and the generated `.sdd/` tree because `shared/` is a sibling of each
    runner's directory in both. Consequently a runner can be executed in place from
    `templates/` — which `tests/hooks/run-feedback.test.ts:84,121` already does — with
    no copying, no fixture, and no change to that test.
21. **BG-21 (G4).** `templates/hooks/run-feedback.mjs`'s observable behavior is
    unchanged by this feature: `accumulate`, `run`, and `run --whole-project` produce
    the same exit codes, the same stdout/stderr, and the same turn-file lifecycle as
    before, proven by the pre-existing `tests/hooks/run-feedback.test.ts` passing
    without modification to a single assertion.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| `harny doctor` run where `.sdd/doctor/run-doctor.mjs` **or** `.sdd/shared/probes.mjs` does not exist | `runDoctor`'s pre-flight checks **both** paths and raises `HarnessError('USAGE', …)` naming the missing one(s) and `npx harny init` as the remediation | Exit 2, one actionable line, no stack trace (`SC18`) — never an `ERR_MODULE_NOT_FOUND` stack trace from the child |
| `.sdd/shared/probes.mjs` missing when a per-turn hook fires | The runner's static import fails: `ERR_MODULE_NOT_FOUND`, exit 1. Each tool's wrapper still exits 0 (`I4` preserved for the `Stop`/turn-completion path); the accumulator invocation surfaces the tool's own hook-error channel | Loud and immediate, on purpose (see `roadmap.md` R2). `init`'s all-or-nothing write (`CLI-5`) is what prevents this state arising from a normal scaffold |
| `.sdd/shared/probes.mjs` missing in a CI checkout | `renderRunnerInvocation`'s `test -f` guard, extended to both files, prints the existing missing-runner remediation and exits 1 before `node` is invoked | Named file + remediation, not a module-resolution stack trace |
| `harny doctor <target>` where target is missing or not a directory | Existing `assertWritableDirectory` raises `USAGE` | Exit 2, message unchanged from `init`'s |
| Readiness run completes; at least one check failed | Runner prints the full report and exits `2`; `runDoctor` throws `HarnessError('NOT_READY', …)` | Exit 6 — distinguishable from every CLI failure (`SC17`) |
| Readiness run completes; all checks ok or skipped | Runner exits `0`; `runDoctor` returns `{ ready: true, … }` | Exit 0 |
| Runner exits with any code other than 0 or 2 | Re-thrown as a plain `Error` disclosing the observed code and the runner's path | Exit 1 — a bug, per `CLI-2` |
| `checks.json` missing, unreadable, or not valid JSON, on a direct `node` invocation | Runner prints one line naming the file and the `--checks` flag, exits `1` | Legible failure; never a silent exit 0 that claims readiness |
| `checks.json` present but `commands` is empty (unrecognized/blank stack) | Test family prints the escape-hatch notice; run continues | Exit 0 is still reachable (`BG-8`) |
| A `require` entry's `requires` gate is false | Entry skipped with a notice | No failure; skip is reported as coverage (`BG-9`) |
| A test command's binary/script is absent | Command skipped with a notice | No failure (`BG-9`) |
| `.sdd/doctor/*` already exists during `init` without `--force` | Existing `applyWrites` conflict path: nothing at all is written, `HarnessError('CONFLICT')` | Exit 3, list of conflicting paths (`SC10`, `G5`) |
| `templates/doctor/run-doctor.mjs` or `templates/shared/probes.mjs` absent from the loaded templates root | `buildDoctorFiles` / `buildRuntimeSharedFiles` return `[]`; no error | Lean fixtures keep working; the packaged root always carries both |
| A spec feature directory is unreadable (permissions) | Reported as a failed spec-state check naming the path | Exit 6, never an unhandled throw |

## Dependencies

- **Internal:** `src/feedback.ts` (amended), `src/engine.ts` (`SPEC_SCHEMA_DIR`,
  `HARNESS_CONFIG_PATH`, `HarnessPayload`), `src/templates.ts` (`SPEC_SCHEMA_NAMES`,
  `SkillResource`, `loadOptionalResource`), `src/vocabulary.ts` (`CORE_SKILL_IDS`),
  `src/errors.ts` (`HarnessError`, `EXIT`), `src/config.ts` (`HarnessConfig`),
  `src/generators/types.ts` (`Generator`, `GeneratedFile`), `src/writer.ts` (unchanged —
  conflict handling is inherited, not re-implemented).
- **External:** **none added.** The runtime set stays `commander@15.0.0`,
  `@clack/prompts@1.7.0`; the dev set stays `typescript@7.0.2`, `vitest@4.1.10`,
  `@types/node@26.1.2` (`cli-init.md` invariant 3, `S4`).
- **Runtime floor:** Node `>=20.19.0`, unchanged; no API newer than those already used
  by `templates/hooks/run-feedback.mjs`.

## Integration Points

- **`src/init.ts` step 11** — `buildDoctorFiles(payload, resolvedGenerators)` is pushed
  into the same render step that already carries `buildSharedFiles`,
  `buildSkillFiles`, and `buildFeedbackFiles` (`src/init.ts:207–238`). No fourteenth
  step; `CLI-1` holds verbatim.
- **`src/cli.ts`** — one new sibling command; `init`'s action, flags, and behavior are
  untouched.
- **`harny-feedback`** — referenced by name from `harny-doctor` for the per-turn case
  and never reimplemented; its own `SKILL.md` is not edited by this feature. Its
  *runner*, however, **is** modified (see § "Modified: `templates/hooks/run-feedback.mjs`"),
  which is why this feature's test pass includes the untouched
  `tests/hooks/run-feedback.test.ts` as a regression oracle (`BG-21`).
- **The generated `.sdd/` runtime** — now three subdirectories with one rule between
  them: `feedback/` and `doctor/` hold executable entry points, `shared/` holds code
  both import. Any future generated script joins that convention rather than copying
  code a fourth time.
- **`harny-audit`** — `harny-doctor` maps any finding onto `harny-audit`'s existing
  CRITICAL/HIGH/MEDIUM/LOW buckets **by reference** (`FC-10`'s rule, not restated).
- **`harny-sync`** — `harny-doctor` *detects* the shipped-but-unarchived condition and
  names the feature; it never invokes archive mode itself (`intent.md` § Non-Goals).
  The capability doc `specs/current/readiness-checks.md` is created by `harny-sync`
  archive mode from `capability-template.md`, with `_index.md` keyword rows for
  `doctor`, `readiness`, `session start`, and `pre-flight` routing to it.
- **Test suite (`S6`):** `tests/doctor.test.ts` mirrors `src/doctor.ts`;
  `tests/doctor-runner.test.ts` drives `templates/doctor/run-doctor.mjs` as a
  subprocess the way `tests/hooks/run-feedback.test.ts` does; `tests/cli.test.ts`,
  `tests/vocabulary.test.ts`, `tests/packaging.test.ts`, `tests/skills-fidelity.test.ts`
  and `tests/skills-templates.test.ts` are extended, not replaced. Tests whose expected
  write-plan or output tree is enumerated gain `.sdd/shared/probes.mjs`:
  `tests/init.test.ts:584`, `tests/e2e-init.test.ts:136,504` (which also asserts the
  runner is written exactly once — the same assertion is added for the shared module),
  and `tests/engine.test.ts:496–510` (byte-identity) plus its CI-workflow assertions,
  which now see the two-file `test -f` guard.
