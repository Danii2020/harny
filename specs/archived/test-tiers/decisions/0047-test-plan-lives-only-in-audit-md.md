# ADR 0047: The Test Plan is recorded only inside audit.md § Test Coverage

- **Status**: Accepted
- **Date**: 2026-09-24
- **Feature**: test-tiers
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees TT-8
- **Trigger**: (a) a choice between two named viable options

## Context

The tier proposal needed one canonical home. `tasks.md` was a candidate, since it
already tracks per-phase checklist state and is what a human skims for "what's left
to do." But `tasks.md` items are contractually traceable to `roadmap.md` phases
(`AGENTS.md`, spec schema), and a Test Plan is not a roadmap phase — it is evidence
the test-writer gathers and the auditor later checks against. `audit.md` was already
the file the test-writer owns writing into (the `## Test Coverage` section, PENDING →
WRITTEN), and the file the auditor reads and adds its own findings to.

## Decision

The Test Plan is written only as a `### Test Plan` subsection of
`specs/<feature>/audit.md` § `## Test Coverage`, immediately above the existing Test
Coverage table. It is never written to `tasks.md` or any other file. A re-invocation
updates it in place rather than appending a second one.

## Alternatives considered

| Option | Why not |
|---|---|
| Record it in `tasks.md` | `tasks.md` items must cite a `roadmap.md` phase; a test plan is proposed before implementation and traces to spec items, not a roadmap phase — recording it there would violate the schema's own traceability rule |
| A new sixth spec file | Out of scope: `intent.md`'s Non-Goals explicitly rules out changing the 5-file spec schema for this feature |

## Consequences

**Positive**: the test-writer and the auditor share one file and one section, so the
auditor's `### Tier Results` table can sit directly below the plan it verifies, in the
same read. No new spec-schema file, no new traceability rule to invent.

**Accepted costs**: the shipped pointer to "the pinned shape" originally referenced
"(contract § Data Models)", which resolves to nothing in a downstream repository's own
`contract.md` — a defect found by the auditor (AL-3) and carried as a follow-up, not a
flaw in this decision itself.

## Follow-ups

Carried as audit finding AL-3 (MEDIUM): inline the pinned Test Plan skeleton and its
exact position directly into the skill and the role, rather than pointing at a
section name that does not resolve downstream.
