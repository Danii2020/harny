# ADR 0035: Verify the archive with the existing spec-state detector via a family selector, not with new advisory prose or a second check

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: documentation-role-completion
- **Capability**: readiness-checks
- **Source**: contract.md § Interfaces item 1 ("Why a selector rather than a new check"); § Behavior Guarantees RC-1–RC-6
- **Trigger**: (a) a choice between two or more named viable options; (b) constrains future features (a rule others must obey)

## Context

Three reproductions across two features showed `sdd-documentation` reliably narrating
its archive hand-off ("next steps required") instead of performing it, even once
against an invocation brief that explicitly warned it not to. `templates/doctor/run-doctor.mjs`'s
family 4 ("spec state") already computed exactly the shipped-but-unarchived condition
this needed to catch — it simply fired one session too late, at `harny-doctor`'s
session-start/pre-spec-work checkpoint rather than at the moment of the completion
claim. The question was how to make that existing, correct judgment cheaply invokable
at claim time, without spawning the full five-family sweep (in particular, without
spawning the `tests` family's whole test suite on every documentation turn).

## Decision

Add an optional `--only <family>` selector to `run-doctor.mjs` that scopes a run to
exactly one of the five existing check families, re-entering family 4's existing
`shipped && approved` block unchanged rather than introducing a second detector for
the same condition. `--only` absent reproduces today's five-family behavior byte for
byte; `--only spec-state` spawns no child process, in particular none from the
`tests` family. Both `sdd-documentation`'s role template and the conductor invoke
`node .sdd/doctor/run-doctor.mjs --only spec-state` as a precondition on reporting/
declaring completion, rather than trusting the role's own narration.

## Alternatives considered

| Option | Why not |
|---|---|
| Author a second, purpose-built "archive verified" check | Duplicates a rule that already exists (family 4's detector), which is exactly what `AGENTS.md` S5 forbids; two implementations of the same predicate can drift apart. |
| Add only advisory prose telling the role to check before reporting | The evidence says advisory-tier text does not hold here: the procedure already listed every step, and an explicit numbered warning in the invocation still did not prevent the third reproduction. Advisory text is at most one component of the answer, never the load-bearing one. |
| Always run the full five-family sweep at claim time | Correct in principle but too expensive to invoke at the end of every documentation turn — family 5 spawns the whole test suite, which is exactly the cost `--only` exists to avoid. |

## Consequences

**Positive**: The shipped-but-unarchived condition now has exactly one implementation,
reused rather than duplicated, and it is cheap enough to invoke as a completion
precondition rather than only a session-start backstop. The judgment (an exit code) is
deterministic and independently re-derivable.

**Accepted costs**: The *invocation* of the check remains an agent instruction. An
agent that drops the hand-off can equally drop the verification step immediately
after it — this feature does not guarantee the archive always happens; it guarantees
that when the check runs, the answer is computed rather than asserted (see `RC-13`,
carried forward as reservation `RC-R1`). A misconfigured `specs.dir` also still exits
`0` (pre-existing family-4 behavior, reused deliberately — reservation `AL-5`).

## Follow-ups

Whether the same tail-drop risk generalizes to the other four pipeline roles is an
open question, deliberately not examined here (reservation `RC-R2`, `pipeline-roles`
capability). Adding a byte-for-byte stdout assertion for the `--only`-absent default
run so `RC-1` is machine-checked rather than audit-checked (reservation `AL-1`).
