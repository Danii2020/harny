# ADR 0052: execution-plan.md § Validation is the only test plan (supersedes ADR 0047)

- **Status**: Accepted
- **Date**: 2026-10-02
- **Feature**: streamlined-spec-artifacts
- **Capability**: pipeline-roles
- **Source**: contract.md § Interfaces SA-2; § Behavior Guarantees SA-7
- **Trigger**: (c) supersedes a previously shipped decision (ADR 0047)

## Context

ADR 0047 recorded the Test Plan as a `### Test Plan` subsection of `audit.md` § Test
Coverage, written by the test-writer, with a `**Plan status**` line. The plan was thus
produced after the human approved the specs, and needed its own confirmation step.

## Decision

The plan is authored by the architect as `execution-plan.md` § Validation, one row per
AC (what demonstrates it, tests, tier, framework, setup, commands, cwd), and approved at
the spec gate. The `### Test Plan` subsection and the `**Plan status**` line are removed
everywhere. The test-writer writes the tests that § Validation names, at its tiers and
setup. The auditor's `### Tier Results` is checked against § Validation. The plan changes
only through the architect.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep the Test Plan in `audit.md` | Keeps a second plan and a second confirmation after the spec gate; the reason ADR 0047 rejected `tasks.md` no longer applies once tasks cite outcomes and ACs |
| Let the test-writer extend § Validation | Splits ownership of the plan; the test-writer would be approving its own scope |

## Consequences

**Positive**: one plan, approved once, at the gate that already exists. **Accepted
costs**: a legacy feature dir has no § Validation; its auditor checks tiers against the
legacy contract and roadmap.

## Follow-ups

ADR 0047 is marked Superseded by this ADR. Its AL-3 follow-up is moot.
