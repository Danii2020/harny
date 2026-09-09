# Capability: cli-init

> Last synced: 2026-09-08. Owned artifacts: `src/cli.ts`, `src/config.ts`,
> `src/prompts.ts`, `src/init.ts`, `src/writer.ts`, `src/errors.ts`,
> `src/engine.ts`, `src/templates.ts`, `src/vocabulary.ts`, `bin/harness.js`.

## Purpose

`npx harny init`: the CLI scaffolder that reads the canonical `templates/`
layer and a resolved `HarnessConfig`, then writes a configured pipeline into a
target repository — flags, prompts, config-file resolution, exit codes, write
planning, and packaging.

## Current behavior

| ID | Statement | Provenance |
|---|---|---|
| CLI-1 | `runInit` follows a fixed 13-step sequence: load canonical templates → compute tier defaults from `cost_tier` → merge a `--config` file over defaults → merge flag `overrides` over that → run interactive prompts if applicable → validate → warn on reduced gates → build the payload → resolve generators (collecting skips) → render role + conductor artifacts per available generator → plan writes → dry-run-or-write | cli-skeleton · contract.md § "Public API — src/init.ts" "runInit sequence — normative" |
| CLI-2 | `HarnessError(code, message, details?)` is the only error type this CLI throws deliberately; its `HarnessErrorCode` maps to an exit code via a table in `src/errors.ts` (`USAGE`→2, `CONFLICT`→3, `NO_GENERATOR`→4, `TEMPLATE`→5, `CANCELLED`→130); anything else reaching `main` is a bug mapping to `EXIT.UNEXPECTED` (1) | cli-skeleton · contract.md § "Public API — src/errors.ts"; `src/errors.ts:1–3,28–31` |
| CLI-3 | `--roles`/`--gates` replace the enabled set wholesale (can deselect); `--model <role>=<value>` (`roleOverrides`) only adjusts a role already in the enabled set and never grants membership — naming a role outside the enabled set is a `USAGE` error non-interactively, or an `io.warn` if the user deselects that role during interactive prompts | cli-skeleton · contract.md Behavior Guarantee 22; § "Public API — src/cli.ts" flag table |
| CLI-4 | Two runs with the same config and templates produce byte-identical output (stable ordering, no timestamps, no randomness); every generated path is relative and resolves inside `targetDir`; every generated artifact ends in exactly one `\n` | cli-skeleton · contract.md Behavior Guarantees 15, 16, 19 |
| CLI-5 | Nothing is written when any planned path already exists, unless `--force`; `--dry-run` writes nothing at all; conflict detection completes before the first write | cli-skeleton · contract.md Behavior Guarantees 13, 14 |
| CLI-6 | The conductor artifact is always emitted regardless of which roles were selected; `RoleSelection` can never name the conductor itself | cli-skeleton · contract.md Behavior Guarantee 6 |
| CLI-7 | If at least one selected tool has a generator, the run succeeds and reports the rest as `skippedTools`; if none does, it exits `NO_GENERATOR` (4) having written nothing | cli-skeleton · contract.md Behavior Guarantees 18; Error Handling Contract |
| CLI-8 | `.sdd/spec-schema/*` and `.sdd/harness.json` are written exactly once per run even when multiple tools are selected, byte-identical to `templates/spec-schema/*.md` | cli-skeleton · contract.md Behavior Guarantee 12 |
| CLI-9 | No canonical `cost_tier` or capability token is silently dropped: every capability maps to ≥1 tool-native token or is surfaced in `CapabilityMapping.notes`, and every note reaches the rendered output | cli-skeleton · contract.md Behavior Guarantee 8 |
| CLI-10 | The packed npm tarball contains `bin/`, `dist/`, and all eleven `templates/**` files, and excludes everything under `src/`, `tests/`, and `specs/` | cli-skeleton · contract.md Behavior Guarantee 20; `tests/packaging.test.ts` |
| CLI-11 | `src/vocabulary.ts` imports nothing, and no module pair in `src/` imports each other at runtime (no import cycles), independent of `import type` erasure | cli-skeleton · contract.md Behavior Guarantee 21 |

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
