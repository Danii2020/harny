# ADR 0023: Must-have/recommended tier split, a new `warn` outcome, and `conventions-doc` stays in family 2

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: ai-sdlc-readiness
- **Capability**: readiness-checks
- **Source**: contract.md § Candidate ADRs, § AR-2–AR-5; intent.md § G2, § Constraints "The conventions-document check stays exactly where it is"
- **Trigger**: (a) explicit choice between two design options; (b) constrains future features — any new check entry must declare an explicit tier or accept the must-have default; (c) supersedes prior claim (invariant `I2`'s "ready means all checks passed or were skipped")

## Context

The human's own instruction for this feature was that a missing baseline document
(e.g. `README.md`) should make a repo report as not ready for SDD work — a real
behavior change with blast radius (a repo green today with no `README.md` goes red
after this ships). But not every useful document is equally load-bearing: an
architecture doc and per-tool agent-guidance files are valuable but shouldn't turn a
green run red on their own, especially for per-tool guidance where `AGENTS.md` already
covers the gap. The existing outcome vocabulary (`ok`/`skip`/`fail`) has no way to say
"evaluated, and found lacking, but not blocking" — `skip`'s shipped meaning is "could
not be evaluated" and is explicitly never a pass, so reusing it would blur two
different concepts.

A related sub-decision: the pre-existing `conventions-doc` entry (family 2) already
blocks on a missing `AGENTS.md`/`CLAUDE.md`. Should it move into the new family for
consistency, since it's conceptually a repo-readiness check?

## Decision

Add exactly two priority tiers to `DoctorCheck` — `tier?: 'must-have' | 'recommended'`,
absent meaning `must-have` — and exactly one new outcome, `warn`. A must-have gap
produces `FAIL` (runner exit `2`, verb exit `6`, `HarnessError('NOT_READY')`); a
recommended gap produces `WARN`, named with its remediation, never changing the exit
code. This amends invariant `I2` to "ready means every check is `ok`, `skip`, or
`warn`; not ready means at least one check is `fail`."

`conventions-doc` is deliberately **not** moved into the new family; its id, position
in `require`, `anyOf`, and behavior stay byte-for-byte unchanged.

## Alternatives considered

| Option | Why not |
|---|---|
| Reuse `skip` for "found lacking, non-blocking" | `skip`'s shipped, disclosed meaning is "could not be evaluated" (an unmet `requires` probe) — deliberately never a pass. Overloading it to also mean "evaluated and found wanting" would make a `SKIP` line ambiguous between two very different situations a human needs to tell apart. |
| A numeric score or Level 0–3 maturity model (as in the reference material that inspired this feature) | Explicitly rejected in `intent.md` § Non-Goals. An outcome enum plus a four-count summary line is sufficient for this feature's scope and avoids inventing an aggregation formula nobody asked for. |
| Move `conventions-doc` into family 3 for conceptual consistency | A repo with an already-scaffolded, uncommitted-upgrade `.sdd/doctor/run-doctor.mjs` that doesn't know about family 3 would silently stop enforcing the single most important must-have check if it moved — the stale runner simply wouldn't print a family-3 section at all. Leaving it in family 2 means a stale runner still evaluates `conventions-doc` correctly; only the *new* family-3 entries are invisible to it, which is a graceful degradation rather than a silent loss of enforcement. |

## Consequences

**Positive**:
- A human reading the report can tell, per line, whether a gap is blocking or merely
  advisory — without a numeric score to interpret.
- Backward compatible: a `checks.json` generated before this feature (no `tier` field
  on any entry) still runs correctly under the new runner — every entry defaults to
  must-have, exactly its pre-feature behavior.
- Forward/stale-runner compatible: an old, uncommitted-upgrade runner run against a
  *new*-format `checks.json` still correctly evaluates `conventions-doc` and simply
  produces no family-3 lines (verified live by the auditor).

**Accepted costs**:
- The behavior change is real, not merely additive: a repo that was green (no
  `README.md`, previously unchecked) is red after this ships. This is stated
  explicitly in `intent.md` § Constraints and must be announced in the changelog, not
  discovered.
- `conventions-doc`'s `'CLAUDE.md'` literal remains unmoved and unconsolidated with the
  new family's `guidancePath`-derived entries (tracked as reservation RD-R9, LOW).

## Follow-ups

None required by this decision alone. If a future feature ever does decide to
consolidate `conventions-doc` into family 3, it must first solve the stale-runner
compatibility problem this ADR's rejected alternative describes — likely by keeping
family 2 non-empty as a compatibility shim rather than removing it outright.
