# ADR 0022: A fifth check family, `repo readiness`, rather than more entries in family 2

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: ai-sdlc-readiness
- **Capability**: readiness-checks
- **Source**: contract.md § Candidate ADRs; intent.md § G1, § Constraints; contract.md § AR-1
- **Trigger**: (a) explicit choice between two design options; (b) constrains future features — any new repo-level document check must join family 3, not family 2; (c) supersedes prior claim (`readiness-doctor`'s RD-1/I3 "four check families")

## Context

`readiness-doctor` shipped four check families — environment, harness-file manifest,
spec-state sanity, test suite — all of which measure whether *harny's own artifacts*
are installed and coherent in a repo. This feature adds a second, distinct question:
does the *target repository* carry the baseline documentation an AI coding agent needs
to work there safely (a README, an architecture doc, per-tool agent guidance)? The
existing `conventions-doc` entry (family 2) already asked a narrow version of this
question — presence of `AGENTS.md`/`CLAUDE.md` — but it lived inside the family that
otherwise checks harny's own scaffolding.

The question was whether to grow family 2 with three more entries, or introduce a new,
separately labelled family.

## Decision

Insert a fifth check family, `repo readiness`, third in fixed order (environment →
harness manifest → **repo readiness** → spec state → tests). It is populated by
`buildRepoReadinessChecks(generators)`, a function separated from `buildDoctorChecks`'s
manifest body so the two families' membership can never be confused at a glance. This
amends `RD-1` and invariant `I3` (four families → five) and, via the new `warn` outcome
(ADR 0023), invariant `I2`.

## Alternatives considered

| Option | Why not |
|---|---|
| Add three more entries to family 2 (`require`) | Blurs "is harny installed here" (a question about harny's own scaffolding) with "is this repo legible to an agent" (a question about the repo's own documentation) into one undifferentiated list. A human reading the report could not tell, at a glance, which question a given line was answering. |
| Move `conventions-doc` into the new family too, for symmetry | Rejected specifically — see ADR 0023's "stale-runner" rationale: a repo with an old, already-scaffolded `run-doctor.mjs` that doesn't know about family 3 would silently stop enforcing the single most important must-have if it moved. |

## Consequences

**Positive**:
- Two structurally different questions ("is harny installed" vs. "is this repo
  legible to an agent") get two labelled sections of one report, not one blurred list.
- The family is data-driven from `--checks` exactly like the four before it — no second
  runner, no second reporting model.
- Future repo-level documentation checks have an obvious home (family 3), rather than
  a choice to make each time.

**Accepted costs**:
- `readiness-doctor`'s RD-1/I3 ("four check families") is now stated as amended, not
  simply superseded silently — `specs/current/readiness-checks.md` carries both the
  original and the amendment note so the history is legible.
- Only family 3 prints a visible heading (`-- repo readiness --`); the other four
  families remain visually unlabelled in the report (disclosed as audit finding F7,
  LOW, not fixed by this feature).

## Follow-ups

None required by this decision alone. A future feature growing the repo-readiness
checklist (the reference material this feature drew from suggested many more items)
should read `intent.md` § Non-Goals first: this feature deliberately shipped three
entries, not an enumerated checklist, and growing the list again is that future
feature's decision to make against evidence, not a default extrapolation from this ADR.
