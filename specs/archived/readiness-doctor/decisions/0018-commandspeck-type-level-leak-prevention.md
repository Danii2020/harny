# ADR 0018: CommandSpec<K> type-level leak prevention

**Status**: Accepted
**Date**: 2026-09-14
**Feature**: readiness-doctor
**Capability**: readiness-checks

## Source

readiness-doctor · contract.md § "Public API — `src/feedback.ts`" ("preventing the leak");
intent.md § G4, § Constraints; roadmap.md Risk Assessment R1, R3

## Trigger

(a) Named choice between two viable mechanisms: compile-time type narrowing vs. runtime grep gate.
(b) Constrains future features: the shape of `StackProfile.commands` now forbids test commands structurally, not by convention.

## Context

`src/feedback.ts` historically made all commands subject to a single `FeedbackCommand` type.
A readiness feature needs to add test-suite commands, but test commands are "deliberately NOT
`test`: the test suite is already run by `harny-implement`/`harny-audit` and is far too slow for
a per-turn hook" (`src/feedback.ts:29–31`). The risk was that a test command could accidentally
leak into per-turn hooks or CI, reintroducing the slowness the per-turn hook was designed to avoid.

## Decision

Extract a generic `CommandSpec<K extends string>` shape with only the `kind` field parameterized.
Re-express the existing `FeedbackCommand` as `CommandSpec<FeedbackKind>` where `FeedbackKind = 'lint' | 'typecheck'`.
Add a new `ReadinessCommand = CommandSpec<ReadinessKind>` where `ReadinessKind = 'test'`.
Attach readiness commands to a separate `StackProfile.readiness?: readonly ReadinessCommand[]` field,
leaving `StackProfile.commands: readonly FeedbackCommand[]` type-restricted to feedback kinds only.

A test command written into `StackProfile.commands` is now a **compile error**, not a runtime risk.

## Alternatives considered

1. **Runtime grep gate only**: scan generated output for readiness command ids, fail the build if found.
   - Pro: No type-level refactoring, less risk of ripple effects.
   - Con: Relies on test discipline and a separate gate; a type error is more trustworthy.
   - Rejected: the exact slowness the per-turn hook was designed to avoid is the feature's single
     worst failure mode (roadmap R3: "Low likelihood, High impact").

## Consequences

- `CommandSpec<K>` becomes the canonical shape for all commands, adding an abstraction layer.
- Existing consumers of `FeedbackCommand` (all five generators, `src/engine.ts`) must be verified to compile
  unchanged; the refactoring must be a pure no-op, or the new shape is wrong.
- No per-tool variant or generator modification is needed; the extraction is purely type-level.
- Future feedback-like features can define their own command kind and attach it to `StackProfile` via
  a new field with their own type restriction.

## Follow-ups

None at this time; the design is complete and tested at compile time.
