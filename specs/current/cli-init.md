# CLI Init Specification

> Last synced: 2026-09-08. Owned artifacts: `src/cli.ts`, `src/config.ts`,
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
conductor artifacts per available generator → plan writes →
dry-run-or-write.

**Source:** cli-skeleton · contract.md § "Public API — src/init.ts" "runInit sequence — normative"

#### Scenario: `runInit` is called
- **WHEN** `runInit` is called with any valid combination of flags and
  config
- **THEN** it executes the 13 steps in the fixed order, from loading
  canonical templates through dry-run-or-write

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

The system SHALL ensure two runs with the same config and templates produce
byte-identical output (stable ordering, no timestamps, no randomness); every
generated path is relative and resolves inside `targetDir`; every generated
artifact ends in exactly one `\n`.

**Source:** cli-skeleton · contract.md Behavior Guarantees 15, 16, 19

#### Scenario: `runInit` is run twice with identical config and templates
- **WHEN** `runInit` is run twice with identical config and templates
- **THEN** the two output trees are byte-identical, every path is relative
  and resolves inside `targetDir`, and every artifact ends in exactly one
  `\n`

### Requirement: CLI-5 — Conflict detection before any write

The system SHALL write nothing when any planned path already exists, unless
`--force`; `--dry-run` writes nothing at all; conflict detection completes
before the first write.

**Source:** cli-skeleton · contract.md Behavior Guarantees 13, 14

#### Scenario: A planned write path already exists without `--force`
- **WHEN** a planned write path already exists and `--force` is not set
- **THEN** nothing is written, and conflict detection completes before any
  write is attempted
- **WHEN** `--dry-run` is set
- **THEN** nothing is written regardless of conflicts

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
all thirty `templates/**` files, and excludes everything under `src/`,
`tests/`, and `specs/`.

**Source:** cli-skeleton · contract.md Behavior Guarantee 20; `tests/packaging.test.ts`; agent-feedback-controls · contract.md Amendment CLI-10; readiness-doctor · contract.md State Changes

#### Scenario: The npm package is packed
- **WHEN** the npm package is packed
- **THEN** the tarball contains `bin/`, `dist/`, and all thirty
  `templates/**` files (including hook, CI, doctor, and shared-probes templates, from agent-feedback-controls and readiness-doctor),
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

## Invariants

1. No code path in `src/` writes to, renames, or deletes anything under `templates/` or `.claude/` (`templates/` is a read-only canonical source).
2. Only `bin/harness.js` sets `process.exitCode`; every function in `src/` returns an `ExitCode` rather than calling `process.exit`.
3. Adding a runtime or dev dependency requires an explicit line in that feature's `contract.md`; today's set (`commander@15.0.0`, `@clack/prompts@1.7.0` runtime; `typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2` dev) is exhaustive.

## Open reservations

| ID | Reservation | Severity | Source |
|---|---|---|---|
| AL-19 | A test's title can overstate its coverage after a refactor removes the field it exercised (e.g. `tests/init.test.ts`'s T32 kept asserting on a removed `overrides.roles` key with no type error, because `tests/` is outside `tsconfig.json`'s `include`) — no coverage was actually lost (a sibling test covered it correctly), but a green test whose name claims more than it verifies is a standing false-confidence risk | MEDIUM | cli-skeleton · audit.md AL-19 |
| AL-20 | The end-to-end suite (`tests/e2e-init.test.ts`) spawns the real CLI via `bin/harness.js`, which imports `dist/cli.js` — so `npm test` alone (no build step) validates whatever was last built, not current `src/`. A `src/`-only regression can pass `npm test` with a stale `dist/` and only fail after `npm run build`. Recommended but not applied: a `pretest` build script (would need a one-line `contract.md` amendment since `package.json` scripts are pinned) | MEDIUM | cli-skeleton · audit.md AL-20 |

## Contributing features

| Feature | Shipped | What it established |
|---|---|---|
| cli-skeleton | 2026-07-30 | The entire CLI: `src/{cli,config,prompts,init,writer,errors,engine,templates,vocabulary}.ts`, the `Generator` interface, the Claude Code generator, packaging |

## Related ADRs

| ADR | Title | Status |
|---|---|---|
| (none — cli-skeleton predates the ADR log; no backfill per `harny-adr`'s no-backfill rule) | | |
