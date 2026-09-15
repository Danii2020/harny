# ADR 0021: NOT_READY exit code taxonomy extension

**Status**: Accepted
**Date**: 2026-09-14
**Feature**: readiness-doctor
**Capability**: cli-init

## Source

readiness-doctor · intent.md § Constraints ("The new verb must not weaken `init`'s guarantees");
contract.md § "Public API — `src/errors.ts`"; roadmap.md Phase 4, Risk Assessment R5

## Trigger

(a) Named choice between two viable mechanisms: extend the exit-code taxonomy vs. add a return channel from CLI action to main.

## Context

The existing CLI exit-code taxonomy maps `HarnessError` codes to exit codes:
- `USAGE` → 2
- `CONFLICT` → 3
- `NO_GENERATOR` → 4
- `TEMPLATE` → 5
- `CANCELLED` → 130

The `init` verb's success exits 0 via `main`'s unconditional `EXIT.OK` once `parseAsync` resolves.

The new `doctor` verb needs to report a successful run that found the harness not ready. This outcome is:
- Not a CLI success (`EXIT.OK` = 0): the harness is not ready.
- Not a CLI error (`EXIT.UNEXPECTED` = 1): the verb ran correctly and got the expected answer "not ready."
- Not any existing `HarnessErrorCode`: those all mean "the CLI could not do its job."

## Decision

Extend the exit-code taxonomy with a new code: `NOT_READY` → 6. Add it to `EXIT` as a constant and to
`HarnessErrorCode` as a string literal. The `doctor` verb throws `HarnessError('NOT_READY', …)` when
the readiness check completes with a failing check, and `main` maps it to exit 6.

The taxonomy now maps `HarnessErrorCode` values to exit codes exclusively; no code is written outside this mapping.
Exit 6 is reachable only from `runDoctor`; no other code path can produce it.

## Alternatives considered

1. **Return channel from action to main**: have the `doctor` action function return an exit code that `main` uses.
   - Pro: No taxonomy extension; the exit-code table stays the same size.
   - Con: Requires module-level mutable state (setting `process.exitCode` or returning a value that main applies),
     since commander discards action return values. This is a violation of the principle that only `bin/harness.js` sets `process.exitCode`.
   - Rejected: the mutable-state cost is higher than adding one table row.

## Consequences

- `EXIT` is no longer a two-value set (0, 1); it is now a seven-value set (0, 1, 2, 3, 4, 5, 6, 130).
- `HarnessErrorCode` gains a new string literal: `'NOT_READY'`.
- `EXIT_BY_CODE` gains one row.
- `cli-init.md` CLI-2 is amended to list the new code.
- The exit-code invariant is preserved: every code is mapped exactly once, from `HarnessError` code to number, via one table.
- No existing code path can accidentally produce exit 6; the type system and test coverage prevent reuse.
- Future error conditions can follow the same pattern: define a code, add it to `HarnessErrorCode` and `EXIT`, throw it, and document the mapping.

## Follow-ups

None at this time; the decision is complete and tested.
