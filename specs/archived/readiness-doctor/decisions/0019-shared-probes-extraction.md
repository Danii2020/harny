# ADR 0019: Shared probes.mjs extraction

**Status**: Accepted
**Date**: 2026-09-14
**Feature**: readiness-doctor
**Capability**: feedback-controls

## Source

readiness-doctor · intent.md § G4, § Constraints; contract.md § "Public API — `templates/shared/probes.mjs`",
"Modified: `templates/hooks/run-feedback.mjs`"; roadmap.md Phase 2, Risk Assessment R2

## Trigger

(a) Named choice between two mechanisms: one shared module vs. probe-logic duplication in each runner.
(d) Deliberately accepts a known cost: static ESM import creates runtime coupling and pre-flight obligation.

## Context

Both `templates/hooks/run-feedback.mjs` (feedback runner) and `templates/doctor/run-doctor.mjs` (readiness runner)
need identical probe-evaluation logic (`probeSatisfied`, `scriptExists`, `binaryExists`, `anyFileExists`).
The archetypal problem: duplicate code or shared dependency? The feedback runner ships first (agent-feedback-controls);
the readiness runner is added in this feature. Copying probe logic into both runners invites drift
(one updated, the other forgotten). Extracting to a shared module removes drift risk but introduces
a new runtime coupling: both runners depend on `.sdd/shared/probes.mjs` existing and being correct.

## Decision

Extract the four probe functions verbatim from `run-feedback.mjs:156–202` into a new `templates/shared/probes.mjs`.
Update `run-feedback.mjs` to import and use the shared module, with no behavior change.
Update `run-doctor.mjs` to import the same shared module.
Both runners carry identical static import: `import { probeSatisfied } from '../shared/probes.mjs';`.
The shared module is generated and deployed to `.sdd/shared/probes.mjs` by the same mechanism as both runners.

Probe-behavior drift is now impossible by construction (one source, one copy); the cost is that a missing
shared module breaks both runners at import time before any check logic runs.

## Alternatives considered

1. **Duplicate probe logic in each runner**: keep four functions in both `run-feedback.mjs` and `run-doctor.mjs`.
   - Pro: Each runner is fully self-contained; no shared dependency.
   - Con: Drift risk; if one is updated, the other can be forgotten; future runners repeat the pattern.
   - Rejected: the feature's roadmap explicitly names this (R2) as a trade-off, accepting the extraction's runtime cost over drift risk.

2. **Lazy dynamic import via `await import()`**: avoid static coupling by importing on-demand.
   - Pro: Defers the dependency; half-installed state doesn't crash at startup.
   - Con: Makes both runners async; feedback runner is synchronous and cannot be easily made async without major refactor.
   - Rejected: the cost to synchronous logic is too high.

## Consequences

- `templates/shared/probes.mjs` becomes the single source of probe truth for all runners (feedback, readiness, and future ones).
- Both runners must be deployed together with the shared module; a missing `.sdd/shared/probes.mjs` breaks both at import time.
- Three guards prevent the half-installed state from occurring in practice:
  1. `runDoctor` pre-flights both paths and raises `USAGE` with remediation.
  2. CI's `test -f` guard checks both files before invoking the runner.
  3. `init`'s all-or-nothing write (`CLI-5`) ensures both are written or neither.
- The identical `../shared/probes.mjs` specifier is correct in both `templates/` and `.sdd/` trees because both trees keep `shared/` as a sibling of the runner directories.
- This repo's own `.sdd/feedback/run-feedback.mjs` and `.sdd/shared/probes.mjs` are both regenerated in this feature and tracked, establishing a dogfood precedent.

## Follow-ups

Future generated scripts (lint runners, custom hooks, etc.) should follow this convention: runners live in `<category>/run-<type>.mjs`,
shared code in `shared/`. No runner duplicates code; all shared code lives in one place.
