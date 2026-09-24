# ADR 0040: The component list travels on the payload, not as a new `CiPlacement` field

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: monorepo-mode
- **Capability**: cli-init
- **Source**: contract.md § `CiPlacement`
- **Trigger**: (b) constrains future features — a rule and invariant others must obey; (c) reverses or departs from a prior decision another feature anticipated

## Context

`ci-workflow-root`'s contract (XC-6) anticipated this feature explicitly:
`CiPlacement` was made a struct rather than a bare string "so `monorepo-mode`
can add fields (a component list) without changing any signature here." Adding
a `components` field to `CiPlacement` was therefore the mechanism that feature
expected.

By the time this feature landed, the component list was already reachable from
every consumer that needs it: `ProjectConfigSummary.components`
(`payload.conductor.project.components`), which both `buildFeedbackFiles` and
`buildDoctorChecks` already receive via `payload`/`config`.

## Decision

`CiPlacement` is left exactly as `ci-workflow-root` defined it —
`{ readonly prefix: string }` — and gains no field. The component list is read
from `payload.conductor.project.components` at every call site that needs it.
This is a declared, justified departure from XC-6's anticipated mechanism, not
a silent divergence: adding the list to `CiPlacement` too would create a second
copy of the same fact, one that could disagree with the first.

XC-6's actual guarantee — that this feature would need to change no signature
here and delete nothing — still holds: `buildFeedbackFiles(payload, placement)`
and `buildDoctorChecks(config, generators, placement)` keep their exact arity
and parameter types, and `CiPlacement` remains a struct, so the option XC-6
reserved stays open for a future feature that needs a placement fact this
payload genuinely does not carry.

## Alternatives considered

| Option | Why not |
|---|---|
| Add `components: readonly ComponentSelection[]` to `CiPlacement`, as XC-6 anticipated | A second copy of the same fact `ProjectConfigSummary.components` already carries, which can drift from the first; the mechanism was anticipated, not mandated |
| Pass `components` as a new, separate parameter to `buildFeedbackFiles`/`buildDoctorChecks` | Changes both functions' signatures, which is exactly what XC-6 promised this feature would not need to do |

## Consequences

**Positive**:
- One source of truth for the component list; `CiPlacement` stays the pure
  placement fact it always was.
- XC-6's real guarantee (no signature change, nothing deleted) is demonstrably
  intact.

**Accepted costs**:
- A departure from a prior feature's stated anticipation, which could read as
  an accidental contradiction at audit without this record — closed by stating
  the reason here explicitly, in `contract.md` § `CiPlacement`, and in
  `roadmap.md`'s risk table.

## Follow-ups

None.
