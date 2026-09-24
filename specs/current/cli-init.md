# CLI Init Specification

> Last synced: 2026-09-23 (monorepo-mode). Owned artifacts: `src/cli.ts`, `src/config.ts`,
> `src/prompts.ts`, `src/init.ts`, `src/writer.ts`, `src/errors.ts`,
> `src/engine.ts`, `src/templates.ts`, `src/vocabulary.ts`, `bin/harness.js`.

## Purpose

`npx harny init`: the CLI scaffolder that reads the canonical `templates/`
layer and a resolved `HarnessConfig`, then writes a configured pipeline into a
target repository — flags, prompts, config-file resolution, exit codes, write
planning, and packaging.

## Requirements

### Requirement: CLI-1 — runInit fixed 13-step sequence

The system SHALL have `runInit` follow a fixed 13-step sequence: load
canonical templates → compute tier defaults from `cost_tier` → merge a
`--config` file over defaults → merge flag `overrides` over that → run
interactive prompts if applicable → validate → warn on reduced gates → build
the payload → resolve generators (collecting skips) → render role +
conductor + MCP config artifacts per available generator → plan writes →
dry-run-or-write.

Step 9 additionally resolves the declared component list (and warns per
component on an unrecognized stack or an absent component directory), and
step 11 additionally builds the commands payload the hook configs and CI
workflow embed. Neither adds a step: the sequence is still thirteen steps in
the same order.

**Source:** cli-skeleton · contract.md § "Public API — src/init.ts" "runInit sequence — normative"; context7-mcp · contract.md Amendment CLI-1; monorepo-mode · contract.md § MC-27

#### Scenario: `runInit` is called
- **WHEN** `runInit` is called with any valid combination of flags and
  config
- **THEN** it executes the 13 steps in the fixed order, from loading
  canonical templates through dry-run-or-write (step 11 includes MCP
  config building and commands-payload building, not a fourteenth step)

### Requirement: CLI-2 — HarnessError is the only deliberate error type

The system SHALL make `HarnessError(code, message, details?)` the only error
type this CLI throws deliberately; its `HarnessErrorCode` maps to an exit
code via a table in `src/errors.ts` (`USAGE`→2, `CONFLICT`→3,
`NO_GENERATOR`→4, `TEMPLATE`→5, `NOT_READY`→6, `CANCELLED`→130); anything else reaching
`main` is a bug mapping to `EXIT.UNEXPECTED` (1).

**Source:** cli-skeleton · contract.md § "Public API — src/errors.ts"; `src/errors.ts:1–3,28–31`; readiness-doctor · contract.md § "Public API — `src/errors.ts`"

#### Scenario: A deliberate error condition occurs
- **WHEN** a deliberate error condition occurs during `runInit`
- **THEN** a `HarnessError` with the matching code is thrown and mapped to
  its exit code via the `src/errors.ts` table
- **WHEN** the readiness check (via `doctor` verb) completes with a "not ready" result
- **THEN** a `HarnessError('NOT_READY', …)` is thrown and mapped to exit code 6
- **WHEN** an unexpected error reaches `main`
- **THEN** it is treated as a bug and mapped to `EXIT.UNEXPECTED` (1)

### Requirement: CLI-3 — Roles/gates replacement and model overrides

The system SHALL have `--roles`/`--gates` replace the enabled set wholesale
(can deselect); `--model <role>=<value>` (`roleOverrides`) only adjusts a
role already in the enabled set and never grants membership — naming a role
outside the enabled set is a `USAGE` error non-interactively, or an
`io.warn` if the user deselects that role during interactive prompts.

**Source:** cli-skeleton · contract.md Behavior Guarantee 22; § "Public API — src/cli.ts" flag table

#### Scenario: `--model` names a role outside the enabled set
- **WHEN** `--model <role>=<value>` names a role outside the currently
  enabled role set, non-interactively
- **THEN** it is a `USAGE` error
- **WHEN** the same situation occurs during interactive prompts because the
  user deselected that role
- **THEN** `io.warn` is emitted instead of an error

### Requirement: CLI-4 — Determinism, containment, and trailing newline

The system SHALL ensure two runs with the same config, templates, and
pre-existing contents at the merge-owned paths and the same install-directory position within the same repository produce byte-identical output
(stable ordering, no timestamps, no randomness); every generated path is
relative and resolves inside the root it declares — the install directory by default, or the enclosing repository root for the single artifact that declares it; every generated artifact ends in
exactly one `\n`.

The declared component list is part of that determinism input set and is
normalized, deduplicated and canonically ordered before anything reads it, so
two configs differing only in component **declaration order** produce
byte-identical output and an ordering tie is impossible.

**Source:** cli-skeleton · contract.md Behavior Guarantees 15, 16, 19; context7-mcp · contract.md Amendment CLI-4; ci-workflow-root · contract.md Amendment CLI-4; monorepo-mode · contract.md § MC-7

#### Scenario: component declaration order does not affect output
- **WHEN** two runs declare the same components in opposite order
- **THEN** both serialize the component list in the same canonical ascending
  order and produce byte-identical output trees

#### Scenario: `runInit` is run twice with identical config, templates, install position, and merge-path contents
- **WHEN** `runInit` is run twice with identical config, templates, pre-existing contents at the merge-owned MCP config paths, and the same install-directory position within the same repository
- **THEN** the two output trees are byte-identical, every path is relative
  and resolves inside its declared root, and every artifact ends in exactly one
  `\n`

### Requirement: CLI-5 — Conflict detection before any write, with merge-path exemption

The system SHALL write nothing when any planned path already exists at its resolved root, unless
`--force`; `--dry-run` writes nothing at all; conflict detection completes
before the first write; **paths explicitly marked as merge-owned (co-owned
with the user and other tools) never enter the conflict set**, so a
pre-existing MCP config file never blocks the entire `init` run; a pre-existing file at the repository root blocks the run exactly as one inside the install directory does.

**Source:** cli-skeleton · contract.md Behavior Guarantees 13, 14; context7-mcp · contract.md Amendment CLI-5; ci-workflow-root · contract.md Amendment CLI-5

#### Scenario: A planned write path already exists without `--force`
- **WHEN** a planned write path already exists at its resolved root and `--force` is not set
- **THEN** nothing is written at either root, and conflict detection completes before any
  write is attempted
- **WHEN** a merge-marked path already exists (e.g. an MCP config file)
- **THEN** it is never added to the conflict set, so its presence does not
  block the run
- **WHEN** a file at the repository root (e.g., a CI workflow from a previous install) already exists
- **THEN** it enters the conflict set and blocks the run exactly as a file inside the install directory does
- **WHEN** `--dry-run` is set
- **THEN** nothing is written at either root regardless of conflicts

### Requirement: CLI-6 — Conductor artifact always emitted

The system SHALL always emit the conductor artifact regardless of which
roles were selected; `RoleSelection` can never name the conductor itself.

**Source:** cli-skeleton · contract.md Behavior Guarantee 6

#### Scenario: `runInit` completes with any role selection
- **WHEN** `runInit` completes with any valid role selection
- **THEN** the conductor artifact is present in the output, and
  `RoleSelection` never contains the conductor as a member

### Requirement: CLI-7 — Partial generator availability

The system SHALL, if at least one selected tool has a generator, succeed the
run and report the rest as `skippedTools`; if none does, it SHALL exit
`NO_GENERATOR` (4) having written nothing.

**Source:** cli-skeleton · contract.md Behavior Guarantees 18; Error Handling Contract

#### Scenario: At least one selected tool has a generator
- **WHEN** at least one selected tool has a generator and others do not
- **THEN** the run succeeds and reports the tools without a generator as
  `skippedTools`
- **WHEN** none of the selected tools has a generator
- **THEN** the run exits `NO_GENERATOR` (4) and writes nothing

### Requirement: CLI-8 — Single spec-schema and harness.json write

The system SHALL write `.sdd/spec-schema/*` and `.sdd/harness.json` exactly
once per run even when multiple tools are selected, byte-identical to
`templates/spec-schema/*.md`.

**Source:** cli-skeleton · contract.md Behavior Guarantee 12

#### Scenario: A run selects multiple tools
- **WHEN** a run selects multiple tools
- **THEN** `.sdd/spec-schema/*` and `.sdd/harness.json` are each written
  exactly once, byte-identical to their canonical source

### Requirement: CLI-9 — No capability token silently dropped

The system SHALL ensure no canonical `cost_tier` or capability token is
silently dropped: every capability maps to ≥1 tool-native token or is
surfaced in `CapabilityMapping.notes`, and every note reaches the rendered
output.

**Source:** cli-skeleton · contract.md Behavior Guarantee 8

#### Scenario: A canonical capability has no direct tool-native equivalent
- **WHEN** a canonical capability token has no direct tool-native
  equivalent for a selected generator
- **THEN** it is surfaced in `CapabilityMapping.notes`, and that note
  reaches the rendered output rather than being silently dropped

### Requirement: CLI-10 — Packaged tarball contents

The system SHALL ensure the packed npm tarball contains `bin/`, `dist/`, and
all thirty-one `templates/**` files, and excludes everything under `src/`,
`tests/`, and `specs/`.

**Source:** cli-skeleton · contract.md Behavior Guarantee 20; `tests/packaging.test.ts`; agent-feedback-controls · contract.md Amendment CLI-10; readiness-doctor · contract.md State Changes; context7-mcp · contract.md Amendment CLI-10

#### Scenario: The npm package is packed
- **WHEN** the npm package is packed
- **THEN** the tarball contains `bin/`, `dist/`, and all thirty-one
  `templates/**` files (including hook, CI, doctor, MCP, and shared-probes templates, from agent-feedback-controls, readiness-doctor, and context7-mcp),
  and contains nothing under `src/`, `tests/`, or `specs/`

### Requirement: CLI-11 — No import cycles, vocabulary has no imports

The system SHALL ensure `src/vocabulary.ts` imports nothing, and no module
pair in `src/` imports each other at runtime (no import cycles), independent
of `import type` erasure.

**Source:** cli-skeleton · contract.md Behavior Guarantee 21

#### Scenario: The `src/` module graph is inspected
- **WHEN** the `src/` module graph is inspected at runtime (ignoring
  `import type`-only edges)
- **THEN** `src/vocabulary.ts` has no imports and no two modules import each
  other

### Requirement: CLI-12 — Components are declared, normalized and mutually exclusive with `stack`

The system SHALL accept a repeatable `--component <path>=<stack>` flag that
splits on the **first** `=` (so a stack value may contain `=`), rejects an
empty path or a missing `=` as `USAGE`, and replaces the component list
wholesale rather than accumulating across sources. `stack` and `components`
SHALL be mutually exclusive **from one source** (one flag invocation, a
`--config` file, or `.sdd/harness.json`): supplying both is a `USAGE` error
naming both fields, with no precedence rule and no silent winner. Every
declared component path SHALL be normalized (`./x` → `x`, `x/` → `x`,
backslashes to `/`), and an absolute path, a `C:`-style path, a `..` path, an
empty list, or a duplicate-after-normalization SHALL each be `USAGE` naming
the offender. `serializeConfig` SHALL emit the key order `version, tools,
roles, gates, skills, stack?, components?`, omitting `components` entirely
when absent or empty.

**Source:** monorepo-mode · contract.md § MC-1, MC-7, MC-8, MC-24, § Data Models; ADR 0038

#### Scenario: both fields from one source
- **WHEN** one `init` invocation supplies `--stack typescript` and
  `--component apps/web=typescript`
- **THEN** it exits `USAGE` (2) naming both fields and writes nothing

#### Scenario: a component path escapes the install directory
- **WHEN** a declared component path is `/abs`, `C:/abs`, `..` or `../x`
- **THEN** it is rejected as `USAGE` naming the offending path, before
  anything reads the list

#### Scenario: a `components`-free config round-trips unchanged
- **WHEN** an existing `.sdd/harness.json` carrying only `stack` is loaded,
  validated, merged and re-serialized
- **THEN** it round-trips byte-identically — never migrated to `components`,
  never warned about

### Requirement: CLI-13 — Interactive `init` asks repo shape before any stack question

The system SHALL ask "single repo or monorepo?" in interactive `init`, before
the stack question and with **single repo** as the default. Answering "single
repo" SHALL reproduce the remaining question sequence exactly as it was.
Answering "monorepo" SHALL loop a component-path question and a
component-stack question until an empty path ends the loop, requiring at least
one component, with the path question's validation delegating to the one
normalizer rather than re-deriving any path rule. A flag-supplied `--stack` or
`--component` SHALL preset the shape question, skip it, and report the preset
through `io.log` exactly as every other preset question does.

**Source:** monorepo-mode · contract.md § MC-25, MC-26; intent.md § SC15

#### Scenario: the single-repo transcript is unchanged
- **WHEN** the user answers "single repo"
- **THEN** the stack question is asked with its wording untouched and no
  component question is ever asked

#### Scenario: a flag presets the shape question
- **WHEN** `--component apps/web=typescript` is supplied
- **THEN** the shape question is not asked, and `io.log` reports that the repo
  shape was already set by a flag

### Requirement: CLI-14 — Declaring no components changes nothing, byte for byte

The system SHALL ensure that a `components`-free install produces a write plan
whose path set **and** whose every file's bytes are identical to the
pre-`monorepo-mode` build, for both a repository-root install and a
subdirectory install, and SHALL hold this by golden-byte comparison of the
whole generated tree rather than by convention. The path set written by a
multi-component install SHALL equal the path set written by a single-repo
install.

**Source:** monorepo-mode · intent.md § SC2, SC14; contract.md § MC-4, MC-5, MC-29

#### Scenario: golden-byte regression over the generated tree
- **WHEN** generating for `--stack typescript` at a repository root and for
  `--stack python` in a subdirectory
- **THEN** every generated file matches its pre-feature golden byte for byte,
  except the contracted single contiguous comment insertion in the workflow
  header

#### Scenario: components add no artifact
- **WHEN** generating for a two-component install
- **THEN** the write plan's path set equals a single-repo install's: one
  `.sdd/`, one runner per family, one hook config per tool, one CI workflow,
  one spec-schema set — and no new file under `templates/`

## Invariants

1. No code path in `src/` writes to, renames, or deletes anything under `templates/` or `.claude/` (`templates/` is a read-only canonical source).
2. Only `bin/harness.js` sets `process.exitCode`; every function in `src/` returns an `ExitCode` rather than calling `process.exit`.
3. Adding a runtime or dev dependency requires an explicit line in that feature's `contract.md`; today's set (`commander@15.0.0`, `@clack/prompts@1.7.0` runtime; `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2` dev) is exhaustive. **Enforcement narrowed 2026-09-23** (`monorepo-mode` audit F6, accepted by the human as an amendment to `codex-generator` guarantee 16): `tests/packaging.test.ts` now asserts the dependency **key set** only, so a package appearing or disappearing is still caught but a version change is not. See reservation MR-F6 below.
4. A new module `src/repo.ts` sits between `engine.ts` and `feedback.ts` in the downward import order; nothing imports it back (CLI-11 invariant preserved).

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-19 | A test's title can overstate its coverage after a refactor removes the field it exercised (e.g. `tests/init.test.ts`'s T32 kept asserting on a removed `overrides.roles` key with no type error, because `tests/` is outside `tsconfig.json`'s `include`) — no coverage was actually lost (a sibling test covered it correctly), but a green test whose name claims more than it verifies is a standing false-confidence risk | MEDIUM | cli-skeleton · audit.md AL-19 |
| AL-20 | The end-to-end suite (`tests/e2e-init.test.ts`) spawns the real CLI via `bin/harness.js`, which imports `dist/cli.js` — so `npm test` alone (no build step) validates whatever was last built, not current `src/`. A `src/`-only regression can pass `npm test` with a stale `dist/` and only fail after `npm run build`. Recommended but not applied: a `pretest` build script (would need a one-line `contract.md` amendment since `package.json` scripts are pinned) | MEDIUM | cli-skeleton · audit.md AL-20 |
| MR-F2 | CLI-12's `stack`/`components` exclusivity is enforced on the **writing** path only. `validateConfig` carries no exclusivity check and is the sole production reader of a real `.sdd/harness.json` (`src/doctor.ts`), so a hand-edited config carrying both fields is accepted silently by `npx harny doctor`, with `components` winning — the silent winner ADR 0038 forbids. harny itself never writes both. Closed by moving or mirroring the check into `validateConfig` plus coverage row A3, **or** by declaring `.sdd/harness.json` harny-owned and hand-editing unsupported, in writing. | HIGH (deferred by human decision) | monorepo-mode · audit.md F2, C1, A3 |
| MR-F4 | A declared **single `.` component** (`--component .=python`) renders the conductor's project-configuration block with **neither** a `Project stack:` line nor a `Component:` line, so an agent reading that block cannot tell which stack the project is — and that invocation shape is exactly the remediation the exclusivity error message recommends. Root cause: `resolveComponents` deliberately erases the declared-vs-implicit distinction, which the rendering rule needs. Closed by carrying the declared-vs-implicit fact onto `ProjectConfigSummary` (which also deletes the duplicated predicate expression at `src/generators/markdown-yaml.ts:62`) **or** by amending the rule to exclude the single-`.` case deliberately. Coverage row A4 is missing. | MEDIUM (deferred by human decision) | monorepo-mode · audit.md F4, C16, A4 |
| MR-F6 | `tests/packaging.test.ts` — the file `AGENTS.md` S4 names as its enforcement evidence — now asserts the dependency **key set** rather than exact version pins, so S4 has lost mechanical version-drift detection repo-wide and has no replacement enforcement point. Accepted knowingly by the human as an amendment to `codex-generator` guarantee 16; the finding itself stands as correct. | MEDIUM (accepted amendment, consequence open) | monorepo-mode · audit.md F6 |
| MR-F11 | The interactive repo-shape question (CLI-13) is asked **fourth** — after tools, roles and optional skills, and before the stack question — not literally first as its own contract headline says, and it carries no `Q` number in `src/prompts.ts`'s otherwise-numbered comment scheme. The operative clause ("before any stack question") holds. Amend the wording or renumber the prompt comments. | LOW (wording) | monorepo-mode · audit.md F11, C25 |
| MR-F9 | CI had not exercised `monorepo-mode` at sign-off: nothing was committed, so the latest green `harny feedback` run belongs to the previous commit. Expected state at ship time; requires a green run on the shipping commit. | LOW (process) | monorepo-mode · audit.md F9 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| cli-skeleton | 2026-07-30 | The entire CLI: `src/{cli,config,prompts,init,writer,errors,engine,templates,vocabulary}.ts`, the `Generator` interface, the Claude Code generator, packaging |
| context7-mcp | 2026-09-15 | CLI-1/CLI-4/CLI-5/CLI-10: default Context7 MCP server wiring via merge-write to each tool's native config; exempts merge-marked paths from conflict detection; adds `templates/mcp/README.md` to packaged count |
| dogfood-quick-fixes | 2026-09-22 | CLI-4/CLI-5/CLI-10: Context7 endpoint value changed from `/mcp` to `/mcp/oauth` in the generated MCP server entries. Determinism and merge-marked path invariants hold at the new value. Packaged template count remains thirty-one. |
| ci-workflow-root | 2026-09-23 | CLI-1/CLI-4/CLI-5: added `src/repo.ts` for git-root detection (CLI-1 step 11 also resolves install location), widened CLI-4's determinism input set, expanded CLI-5 to cover repository-root conflicts. ADRs 0031, 0033 record the declared write-root and repository-detection strategy decisions. |
| monorepo-mode | 2026-09-23 | CLI-12–CLI-14: repeatable `--component <path>=<stack>`, `stack`/`components` mutual exclusivity from one source, component path normalization/dedup/canonical ordering, `components` last in the serialized key order, the interactive repo-shape question with flag presetting, and golden-byte identity for every `components`-free install. Amended CLI-1 (step 9 resolves components, step 11 builds the commands payload; still thirteen steps) and CLI-4 (the component list joins the determinism input set, canonically ordered). Restated CLI-10 as still true: still thirty-one `templates/**` files, no new template. ADRs 0038, 0040. Verdict APPROVED WITH RESERVATIONS: MR-F2, MR-F4, MR-F6, MR-F9, MR-F11 carried. |

## Related ADRs

> Rebuilt from each ADR file's own `Capability:` field. (`cli-skeleton` itself
> predates the ADR log; no backfill, per `harny-adr`'s no-backfill rule.)

| ADR | Title | Status | Path |
|---|---|---|---|
| 0021 | `NOT_READY` exit-code taxonomy extension | Accepted | `specs/archived/readiness-doctor/decisions/0021-not-ready-exit-code-taxonomy-extension.md` |
| 0026 | Merge-write, never whole-file, for co-owned MCP config | Accepted | `specs/archived/context7-mcp/decisions/0026-merge-write-for-mcp-config.md` |
| 0029 | Context7 `/mcp/oauth` for all five tools, no per-tool fallback | Accepted | `specs/archived/dogfood-quick-fixes/decisions/0029-context7-oauth-endpoint.md` |
| 0031 | A declared write root on `GeneratedFile`, never a weakened `assertContained` | Accepted | `specs/archived/ci-workflow-root/decisions/0031-declared-write-root.md` |
| 0033 | Detect the repository root by walking for a `.git` entry, not by shelling out | Accepted | `specs/archived/ci-workflow-root/decisions/0033-walk-git-dont-shell.md` |
| 0038 | `components` replaces `stack`, mutually exclusive, never a fallback | Accepted | `specs/archived/monorepo-mode/decisions/0038-components-replaces-stack.md` |
| 0040 | The component list travels on the payload, not as a new `CiPlacement` field | Accepted | `specs/archived/monorepo-mode/decisions/0040-component-list-on-payload-not-ciplacement.md` |
