# Contract: feedback-path-hygiene

Affected capabilities: **feedback-controls** (primary), **readiness-checks** (the
`ReadinessCommand` type narrowing only). No `tool-generators` or `cli-init` statement
changes, because no generator, CLI flag, or template count changes.

Contract item ids in this file use the feature-local prefix `PH-`. Every item cites the
`intent.md` goal it serves.

> **Post-audit amendment A1 (2026-09-22).** This contract was amended after its audit
> (`audit.md` verdict APPROVED WITH RESERVATIONS), in response to finding **AL-3**. A1
> rewrites **PH-6**, the `matchesExtensions` reference body, the Error Handling row for
> malformed entries, and the proposed **FC-23** wording. Items marked **(A1)** post-date
> the audit and have **not** been re-audited; the rest of this document is as audited.
> See § "Post-audit amendment A1" at the end.

## Interfaces

### Public API — `src/feedback.ts` (MODIFIED) — G2, G4

One optional field on the shared shape, and one type-level narrowing on the readiness
alias. Nothing is renamed, removed, or reordered. The new field is declared between
`pathMode` and `requires` (see PH-12 for why its position matters).

```ts
/** The shape both `FeedbackCommand` and `ReadinessCommand` share. Originally
 *  extracted verbatim from `FeedbackCommand` (readiness-doctor); `extensions` added
 *  by feedback-path-hygiene. Optional, so every existing consumer and every
 *  hand-written commands JSON keeps working unchanged (ADR 0018). */
export interface CommandSpec<K extends string> {
  readonly id: string;
  readonly kind: K;
  readonly argv: readonly string[];
  readonly pathMode: PathMode;
  /** **(NEW — feedback-path-hygiene.)** File-name suffixes this command accepts,
   *  each including its leading dot (e.g. `'.py'`). Consulted ONLY by the runner's
   *  turn-based `run` mode, and only for `per-file` commands: a touched path is
   *  passed to this command iff it ends with one of these suffixes (case-sensitive).
   *  Absent, or an empty array, means no extension filtering. Ignored by
   *  `whole-project` commands, by `run --whole-project` (whose `.` sentinel bypasses
   *  every path filter), and by the readiness runner. */
  readonly extensions?: readonly string[];
  readonly requires: ToolProbe;
}

/** Unchanged. */
export type FeedbackCommand = CommandSpec<FeedbackKind>;

/** **(MODIFIED — feedback-path-hygiene.)** Readiness commands run whole-project,
 *  once, via `run-doctor.mjs`, which never appends paths, so `extensions` has no
 *  meaning here. `?: never` makes declaring it a compile error (ADR 0018's
 *  type-level-prevention precedent) rather than a silently ignored field. */
export type ReadinessCommand = CommandSpec<ReadinessKind> & { readonly extensions?: never };
```

Two module-private constants hold the suffix lists, so the two python commands share
one list instead of repeating it (S5):

```ts
/** Suffixes the python profile's per-file commands accept (ruff, mypy). */
const PYTHON_SOURCE_EXTENSIONS: readonly string[] = ['.py', '.pyi'];
/** Suffixes the typescript profile's per-file command accepts (eslint). */
const JS_TS_SOURCE_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];
```

They are **not exported**. The single consumer-facing source stays `STACK_PROFILES`
(FC-1), and tests read the lists from there.

### Runner internals — `templates/hooks/run-feedback.mjs` (MODIFIED) — G1, G2, G3

The runner's CLI surface is **unchanged**. That covers the same two modes, the same
`--commands` and `--whole-project` flags, and the same exit codes. Three new
module-private helper functions are added, and `runRunMode`'s command loop changes.
`runCommand` and `runWholeProject` are **byte-for-byte unchanged**.

```js
/** True iff `filePath` should reach a command declaring `extensions`.
 *  (A1) Valid entries are non-empty strings. No filter (always true) when
 *  `extensions` is not an array or has no valid entry: absent, `[]`, and
 *  `[null, '']` all mean "no filter". Otherwise a case-sensitive suffix test
 *  against the valid entries only; invalid entries are ignored. */
function matchesExtensions(filePath, extensions) {
  const valid = Array.isArray(extensions)
    ? extensions.filter((ext) => typeof ext === 'string' && ext.length > 0)
    : [];
  if (valid.length === 0) {
    return true;
  }
  return valid.some((ext) => filePath.endsWith(ext));
}

/** Keeps only the paths that exist on disk when the runner fires (G1).
 *  Paths are the accumulator's absolute paths. */
function existingPaths(paths) {
  return paths.filter((p) => fs.existsSync(p));
}

/** The argv tail a `per-file` command receives in turn-based `run` mode:
 *  extension gate FIRST, then existence check. The order is fixed: it keeps the
 *  `existsSync` calls to paths the command could actually receive. */
function perFilePathsFor(command, touchedPaths) {
  return existingPaths(touchedPaths.filter((p) => matchesExtensions(p, command.extensions)));
}
```

The modified loop in `runRunMode`. Only the lines between the probe check and
`runCommand` are new:

```js
for (const command of commands) {
  if (!requirementMet(command.requires, cwd)) {
    console.error(`skipped \`${command.id}\`: requirement not met (tool not installed in this repo)`);
    continue;
  }

  let paths = touchedPaths;
  if (command.pathMode === 'per-file') {
    paths = perFilePathsFor(command, touchedPaths);
    if (paths.length === 0) {
      // PH-5: nothing this command should check survived the filters. Never run
      // it with zero path args (that would lint the whole repo); no output.
      continue;
    }
  }

  const result = runCommand(command, paths, cwd);
  // ... finding handling unchanged ...
}
```

The file's leading doc comment is updated in the `run` bullet to describe the two
filters and the empty-set skip, and in the `run --whole-project` bullet to say that
neither filter applies.

### Canonical behavior doc — `templates/hooks/README.md` (MODIFIED) — G6

- § "The behavior", property 2: the sentence ending "executes each resolved command
  exactly once against that set" is refined. A command that takes paths receives only
  the members of the set that match the file types it declares and that still exist
  when the turn ends. A command left with no such paths is skipped silently, never run
  without path arguments. The property count stays **six** (FC-4). The wording names
  no tool (S7).
- § "`--whole-project` — the CI-only flag (A1)": one added sentence says the `.`
  argument is passed unconditionally. Neither the file-type filter nor the existence
  check applies, so CI behavior is unchanged.

### Unchanged by construction — no code change

| Site | Why no change is needed |
|---|---|
| `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` `renderHook` | Each builds its `--commands` argument as `JSON.stringify(profile.commands)` (e.g. `claude-code.ts:152`), so the new field is serialized automatically. |
| `src/engine.ts` `renderRunnerInvocation` | Same: `JSON.stringify(commands)` at `engine.ts:257`. |
| `src/doctor.ts` `buildDoctorChecks` | Serializes `profile?.readiness ?? []` (`doctor.ts:258`). Readiness entries cannot carry `extensions` (PH-9), so `checks.json` bytes are unchanged. |
| `templates/doctor/run-doctor.mjs` | Spawns `command.argv` only (`run-doctor.mjs:259–260`) and never reads `pathMode` or `extensions`. |
| `templates/shared/probes.mjs` | Probe semantics untouched. |
| `templates/ci/harny-feedback.yml` | The template's static text is unchanged. Only the generated block's inline JSON grows (PH-12). |
| `templates/skills/harny-feedback/SKILL.md`, `.agents/skills/harny-feedback/SKILL.md` | Never restate commands or path handling (FC-1). |

### Data Models

**`STACK_PROFILES` after this feature** (only the per-file entries change):

```ts
// typescript profile
{
  id: 'eslint',
  kind: 'lint',
  argv: ['npx', 'eslint'],
  pathMode: 'per-file',
  extensions: JS_TS_SOURCE_EXTENSIONS,
  requires: {
    anyFile: ['eslint.config.js', 'eslint.config.mjs', '.eslintrc.json', '.eslintrc.cjs'],
  },
},
{ id: 'tsc', kind: 'typecheck', argv: ['npx', 'tsc', '--noEmit'], pathMode: 'whole-project', requires: { anyFile: ['tsconfig.json'] } }, // unchanged; no extensions

// python profile
{ id: 'ruff', kind: 'lint', argv: ['ruff', 'check'], pathMode: 'per-file', extensions: PYTHON_SOURCE_EXTENSIONS, requires: { binary: 'ruff' } },
{ id: 'mypy', kind: 'typecheck', argv: ['mypy'], pathMode: 'per-file', extensions: PYTHON_SOURCE_EXTENSIONS, requires: { binary: 'mypy' } },

// readiness entries (npm-test, pytest): unchanged; `extensions` is a type error there.
```

**Serialized form in the `--commands` inline JSON** (one element; key order follows
the object literal, which is deterministic under S3):

```json
{"id":"ruff","kind":"lint","argv":["ruff","check"],"pathMode":"per-file","extensions":[".py",".pyi"],"requires":{"binary":"ruff"}}
```

**Path-selection table** (extends archived `agent-feedback-controls` § "Whole-project
invocation record"):

| `pathMode` | Hook (turn-based `run`) argv tail | CI (`run --whole-project`) argv tail |
|---|---|---|
| `per-file`, no/empty `extensions` | deduped touched paths **that still exist**; command skipped if none | exactly `.` (unchanged) |
| `per-file`, non-empty `extensions` | deduped touched paths **ending in a declared suffix and still existing**; command skipped if none | exactly `.` (unchanged) |
| `whole-project` (any `extensions`) | *(none)*: runs whenever the turn file exists (unchanged) | *(none)* (unchanged) |

### State Changes

- **Turn-file lifecycle: unchanged.** `.sdd/feedback/.turns/<turn-key>` is still
  deleted after `run` finishes. That includes a run in which every `per-file` command
  was filtered to empty, and one in which every command was skipped.
- **Accumulator: unchanged.** `accumulate` still appends every resolved Edit/Write
  path, whether or not it matches a suffix or exists at that moment.
- **Generated artifacts whose bytes change** (in every scaffolded repo on re-init, and
  in this repo's dogfood copies, per G5): `.sdd/feedback/run-feedback.mjs` (the
  runner); each tool's hook config (`.claude/settings.json`, `.cursor/hooks.json`,
  `.kiro/hooks/harny-feedback.json`, `.github/hooks/harny-feedback.json`,
  `hooks.json`), whose inline JSON gains `extensions`; and
  `.github/workflows/harny-feedback.yml`, whose inline JSON gains `extensions`.
- **Unchanged bytes**: `.sdd/shared/probes.mjs`, `.sdd/doctor/run-doctor.mjs`,
  `.sdd/doctor/checks.json`, `.sdd/harness.json`, `.sdd/spec-schema/*.md`.

## Behavior Guarantees

1. **PH-1 (G1) Vanished paths are dropped.** In turn-based `run` mode, a `per-file`
   command never receives a touched path for which `fs.existsSync` is false when the
   runner evaluates that command.
2. **PH-2 (G2; clarified by A1) Extension gate.** In turn-based `run` mode, a
   `per-file` command whose `extensions` has at least one valid entry (PH-6) receives a
   touched path only if the path string ends with at least one valid declared suffix.
3. **PH-3 (G2) Case-sensitive suffix match.** Matching is `String.prototype.endsWith`
   on the absolute path, with no case folding. `src/A.PY` does **not** match `'.py'`.
   *Rationale:* it is deterministic and identical on every platform (S3), including
   case-insensitive filesystems (macOS default, Windows), where folding would make
   the same turn produce different argv on different machines. The cost is that an
   upper-case suffix goes unlinted by the hook, and this is accepted: such files are
   vanishingly rare in the shipped stacks, and CI's whole-project run still covers
   them through the tool's own discovery.
4. **PH-4 (G2) Filter order.** The extension gate is applied before the existence
   check. This is not observable in argv, since both filters are pure subtractions, so
   it is verified by code review in the audit, not by a test.
5. **PH-5 (G3) Empty filtered set skips the command.** If a `per-file` command's
   filtered path set is empty, the command is not spawned. It contributes no finding
   and no output line (stdout and stderr stay silent), and the run's exit code is
   whatever the other commands produce. A `per-file` command is **never** spawned in
   turn-based mode with zero path arguments.
   *Why silent, unlike the probe-skip notice (BG-9):* a probe skip tells the user
   something about the repo's configuration that they may want to fix, while "this
   turn touched no Python files" is not a signal at all. A notice here would appear on
   nearly every turn of a mixed-content repo, and on tools whose wrapper forwards
   combined output with a finding, it would add noise to real findings.
6. **PH-6 (G3; amended by A1) Absent or unusable extensions is backward compatible.**
   A valid entry is a non-empty string. A `per-file` command whose `extensions` is
   absent, not an array, empty (`[]`), or an array with **no valid entry** (e.g.
   `[null, '']`, `[5]`) is not extension-filtered. It is still subject to PH-1 and
   PH-5. When at least one valid entry exists, only the valid entries are matched and
   the invalid ones are ignored (`[null, '', 5, '.py']` behaves as `['.py']`). An
   unusable list means "no filter", not "match nothing", so a misconfigured list can
   never silently disable a linter.
7. **PH-7 (G3) The `.` sentinel bypasses both filters.** `run --whole-project` passes
   every `per-file` command exactly `['.']`, whatever its `extensions` are and without
   an existence check. `runWholeProject` never calls `matchesExtensions`,
   `existingPaths`, or `perFilePathsFor`. CI's argv, probes, summary line, and exit
   codes are identical to before this feature (FC-19, FC-20 unchanged).
8. **PH-8 (G3) Whole-project commands ignore `extensions`.** A `whole-project` command
   in turn-based mode runs whenever the turn file exists, exactly as before, with no
   path arguments, even if it declares `extensions` and the turn touched no matching
   or no surviving file.
9. **PH-9 (G4) `extensions` is meaningless for readiness, enforced at compile time.**
   `ReadinessCommand` declares `extensions?: never`. A readiness entry written with
   `extensions` fails `npm run typecheck`. `run-doctor.mjs` never reads the field.
10. **PH-10 (G2) Profile invariant.** Every `per-file` entry in every
    `StackProfile.commands` declares a non-empty `extensions` whose entries each
    start with `.` and are longer than one character. No `whole-project` entry
    declares `extensions`. This is asserted once, structurally, over `STACK_PROFILES`.
11. **PH-11 (G1, G2) One run per turn is preserved.** Each command that is spawned in
    a turn is spawned at most once (BG-1's batching half is unchanged). Filtering never
    splits one command into several invocations.
12. **PH-12 (G2, G5) Serialization is automatic and deterministic.** `extensions`
    reaches every generated hook config and the CI workflow via the existing
    `JSON.stringify` calls, positioned between `pathMode` and `requires`. Two
    identical `harny init` runs still produce byte-identical output (S3, TG/CLI
    determinism).
13. **PH-13 (G1, G2) Turn-file deletion is unconditional.** The turn file is deleted
    at the end of `run` whether zero, some, or all commands were filtered, skipped, or
    run.
14. **PH-14 (G5) Dogfood byte identity (FC-13).** At ship time, this repo's
    `.sdd/feedback/run-feedback.mjs` is byte-identical to
    `templates/hooks/run-feedback.mjs`, and this repo's `.claude/settings.json` and
    `.github/workflows/harny-feedback.yml` are byte-identical to a scratch
    `harny init --tools claude-code --stack typescript` run's output.
15. **PH-15 (G6) Tool-neutral README.** `templates/hooks/README.md` § "The behavior"
    keeps exactly six properties, names no tool, and states PH-1/PH-2/PH-5 in
    behavioral terms. § "`--whole-project`" states PH-7.

## Error Handling Contract

The runner's posture is unchanged: nothing here is fatal, and nothing throws.
`src/feedback.ts` gains no runtime error path. `HarnessError` is not involved (S2).

| Error Condition | Behavior | User Impact |
|---|---|---|
| A touched file was deleted/moved later in the same turn | Path dropped for every `per-file` command (PH-1) | No `E902`/"no such file" finding |
| Every touched file vanished (pure rename/delete turn) | Every `per-file` command skipped silently (PH-5); `whole-project` commands still run (PH-8) | No output unless a whole-project command finds something |
| Touched files are all non-matching types (settings JSON, workflow YAML, Markdown) | The filtered `per-file` command is skipped silently (PH-5) | No bogus `invalid-syntax` findings |
| `extensions` absent, `[]`, or not an array in the commands JSON (older hook config, hand edit) | Treated as no extension filter (PH-6); the existence check still applies | Pre-feature behavior, minus vanished-path findings |
| **(A1)** `extensions` contains a non-string or `''` entry alongside at least one valid entry | Invalid entries are ignored; the valid entries still apply (PH-6) | Degrades to the valid entries |
| **(A1)** `extensions` is a non-empty array with no valid entry (e.g. `[null, '']`, `[5]`) | Treated as no extension filter (PH-6); the existence check still applies | Pre-feature behavior minus vanished-path findings, never a silently disabled linter |
| Old runner (pre-feature) given a new commands JSON with `extensions` | The old runner ignores the unknown field | Pre-feature behavior; harmless |
| Path exists but is unreadable, or is a directory | `fs.existsSync` is true, so it is passed as before | The tool reports it as it does today (unchanged) |
| `fs.existsSync` itself cannot stat the path (permissions on a parent) | Returns false, so the path is dropped | That path is not checked this turn; CI still covers it |
| A `ReadinessCommand` literal declares `extensions` | TypeScript compile error (PH-9) | Caught by `npm run typecheck` at authoring time |
| `--whole-project` with any `extensions` | Ignored; `.` is passed (PH-7) | CI unchanged |

## Dependencies

- **Internal:** `node:fs` (`existsSync`), already imported by
  `templates/hooks/run-feedback.mjs:54`. There are no new imports in `src/feedback.ts`,
  which keeps its zero-import ceiling (CLI-11).
- **External:** none added (S4). No runtime or dev dependency changes.
- **Documentation verified via Context7** (`/websites/astral_sh_ruff`, 2026-09-21):
  ruff analyzes explicitly passed files regardless of `include` unless `force-exclude`
  is set, and its default `include` covers `.py`, `.pyi`, `.ipynb`, and
  `pyproject.toml`. This supports the root-cause claim and informs the `.ipynb` open
  question below.

## Integration Points

- **`STACK_PROFILES` → five generators → per-tool hook configs**: carried
  automatically (PH-12). The generator code is unchanged (ADR 0014).
- **`STACK_PROFILES` → `src/engine.ts` `renderCiWorkflow` → CI workflow**: carried
  automatically, and ignored at runtime by `--whole-project` (PH-7).
- **`StackProfile.readiness` → `src/doctor.ts` → `.sdd/doctor/checks.json` →
  `run-doctor.mjs`**: untouched. The type narrowing guarantees the field can never
  appear (PH-9).
- **`harny-sync` archive mode, `git mv`, and rename refactors**: the concrete in-turn
  workflows that PH-1 stops from producing false findings. Neither needs any change.
- **`harny-audit` Step 6 / FC-12**: unchanged. The auditor still verifies that the hook
  fired and CI is green. With this feature, "the hook fired" can legitimately mean
  "fired and every per-file command was filtered to empty", which is a clean pass.

## Amendments to shipped current-truth statements

To be applied by `harny-sync` archive mode (merge, never overwrite). The ids are
proposals; archive mode assigns the final ids by incrementing past the highest `FC-` id.

| Target | Change |
|---|---|
| `feedback-controls.md` FC-6, Scenario 1 | "receiving exactly 2 deduped paths" becomes "each `per-file` command receiving exactly the deduped paths that pass its extension gate and still exist (here 2), and none invoked when that subset is empty" |
| `feedback-controls.md` FC-4 | Wording refresh: property 2 now includes the per-command filtering; the count stays six |
| `feedback-controls.md` new FC-22 | Vanished touched paths never reach a per-file command in turn-based mode (PH-1, PH-13) |
| `feedback-controls.md` new FC-23 **(wording amended by A1)** | Optional per-command `extensions` gate: case-sensitive suffix match against the list's valid entries (non-empty strings); an `extensions` value that is absent, not an array, or has no valid entry means no filter; whole-project commands ignore it; empty filtered set means silent skip, never a zero-arg run (PH-2, PH-3, PH-5, PH-6, PH-8, PH-10) |
| `feedback-controls.md` new FC-24 | The `.` whole-project sentinel bypasses both filters, so CI is unchanged (PH-7) |
| `readiness-checks.md` RD-2 | Append: `ReadinessCommand` also forbids `extensions` at compile time (PH-9) |
| `feedback-controls.md` § Contributing features | Add `feedback-path-hygiene` with its `Shipped:` date |

## Open questions for the human gate

1. **Should ruff also accept `.ipynb`?** Ruff lints notebooks by default; mypy does
   not. The brief says both python commands use `['.py', '.pyi']`, and this contract
   follows it. Giving ruff its own `['.py', '.pyi', '.ipynb']` would be a one-line
   change, but it would split the shared constant.
2. **Silent skip versus notice for an empty filtered set (PH-5).** This contract
   chooses silence (the rationale is in PH-5). The alternative is a stderr line such
   as ``no matching files for `ruff`; skipped``, which would match BG-9's probe-skip
   notice style.
3. **`extensions?: never` on `ReadinessCommand` (PH-9).** It is a type-level
   narrowing. The minimal alternative is "declared ignored" plus a runtime assertion
   only. The narrowing is chosen because it matches ADR 0018 and costs one line.
4. **ADR candidate** for `harny-adr` at documentation time: "path hygiene lives only
   in the runner's turn-based path; the `.` sentinel bypasses it by construction". It
   extends ADR 0017. This is a judgement call for the documentation role.

## Post-audit amendment A1 — an `extensions` list with no valid entry means no filter

> **Made 2026-09-22, after this contract was audited**, in response to `audit.md`
> finding **AL-3 (LOW)** and the **PARTIAL** on C17. Scope: the runner's
> `matchesExtensions` semantics for malformed `extensions` values only. No goal,
> success criterion, or phase changes, and `roadmap.md` is not amended. `intent.md`
> gets one pointer note.

**What AL-3 found.** Under the audited reference body, a non-empty `extensions` array
whose entries are all invalid (`[null, '']`, `[5]`) passed the "non-empty array" check
and then matched no path. The command was filtered to empty and silently skipped on
every turn. That contradicts PH-6's own rationale ("a misconfigured list can never
silently disable a linter"). The implementation matched the contract exactly, so this
is a spec gap, not an implementation deviation. Shipped profiles cannot reach it
(PH-10), but a hand-edited or third-party commands JSON can.

**The decision (human, 2026-09-22).** An `extensions` value with no valid entry (valid
means a non-empty string) is treated exactly like no filter. `matchesExtensions`
computes the valid entries first and returns `true` when there are none. A list that
mixes valid and invalid entries still filters on the valid ones.

**What changes.** PH-6, the `matchesExtensions` reference body, the Error Handling
rows for malformed entries, and the proposed FC-23 wording, all marked **(A1)** above.
PH-2's wording is clarified to "at least one valid entry" (PH-6), with no change in
its intent. The only code change is inside `matchesExtensions` in
`templates/hooks/run-feedback.mjs`. PH-7's "`runCommand`/`runWholeProject`
byte-unchanged" still holds. `.sdd/feedback/run-feedback.mjs` must be regenerated
and stay byte-identical to the template (PH-14, FC-13). No generated hook config or CI
workflow bytes change, because shipped profiles carry only valid entries.

**Tests.** Two new red tests, `tasks.md` Tasks A1.1–A1.2. The executor changes the
runner and regenerates the dogfood copy in Task A1.3. This amendment needs its own
review before those tasks run, and its own audit entry afterwards.
