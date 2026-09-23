# ADR 0037: Guard the untracked live conductor with a presence-gated parity test rather than tracking the file or leaving it unguarded

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: documentation-role-completion
- **Capability**: pipeline-roles
- **Source**: contract.md § Behavior Guarantees RC-15, RC-16
- **Trigger**: (a) a choice between two or more named viable options; (b) constrains future features (a rule future conductor edits must satisfy)

## Context

The live `.claude/skills/sdd-conductor/SKILL.md` had drifted badly behind the shipped
`templates/conductor/sdd-conductor.md`: it never mentioned the `sdd-documentation`
stage, carried four hard rules instead of five, omitted `auditor → documentation`
from its automatic-flow list, and never verified the archive before declaring the
pipeline done. The drift went unnoticed because `.claude/skills/sdd-conductor/` is
gitignored (`.gitignore` allowlists only `.claude/skills/harny-*`) and no test
imported `tests/helpers/paths.ts`'s declared oracle for its placement. This is a
dogfood-only defect — the shipped template was already correct, so no downstream
user was affected — but it meant this repo's own orchestrator had no model of the
documentation stage and could not have verified its archive.

## Decision

Repair the live conductor's drift in place (`RC-15`), and add a parity test
(`tests/conductor-parity.test.ts`) with precisely specified presence-gated
semantics (`RC-16`): the test asserts `RC-15`'s elements against
`.claude/skills/sdd-conductor/SKILL.md` only if the file exists (a filesystem
existence check, never a caught read error); if the file is absent, the test
**skips**, observably (a reported skip, not a silently-passing empty assertion); if
the file is present but empty, or present but missing an element, the test **fails**,
naming the missing element. This keeps CI and fresh clones green (the file is absent
there) while making any future re-drift on a machine that does have the file loudly
visible rather than silent.

## Alternatives considered

| Option | Why not |
|---|---|
| Track `.claude/skills/sdd-conductor/SKILL.md` in git | Explicitly a non-goal (`intent.md` § Non-Goals): would require a `.gitignore` change with effects well beyond this feature's scope, and the symlink-bridge design for the `harny-*` skills does not extend cleanly to the conductor, which is not itself a `harny-*` skill. |
| Leave the live conductor unguarded (repair once, trust it stays repaired) | This is exactly the mechanism that let the drift happen the first time — no test imported the declared oracle. Leaving it unguarded reopens the identical failure class. |
| Fail the test outright when the file is absent | Would make CI and every fresh clone red permanently, since the file is untracked and never present there — indistinguishable from a real regression and impossible to keep green. |

## Consequences

**Positive**: A concrete, observable skip/fail distinction exists for an untracked
file's guard, reusable as a pattern for any future untracked, machine-local artifact
that still deserves regression protection. The live conductor now carries a model of
the documentation stage and verifies its archive before declaring the pipeline done.

**Accepted costs**: The guard protects only machines where the file happens to be
present; a contributor who has never had this file materialize gets no protection at
all, and the repair itself is covered by no commit since the file is gitignored
(reservation `RC-R4`, upgraded in visibility as audit finding AL-8).

## Follow-ups

None named. `RC-R4` remains an open, deliberate reservation about the untracked
file's disconnect from version control.
