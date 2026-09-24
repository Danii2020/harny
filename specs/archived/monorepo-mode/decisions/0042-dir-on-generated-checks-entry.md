# ADR 0042: Component scoping for readiness is a `dir` field on the generated checks entry, never on `CommandSpec`

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: monorepo-mode
- **Capability**: readiness-checks
- **Source**: contract.md § `src/doctor.ts` (`ScopedReadinessCommand`); § Behavior Guarantees (MC-2, MC-20)
- **Trigger**: (b) constrains future features — a rule and invariant others must obey; (c) closes off a convenient-looking but rejected alternative for good

## Context

`npx harny doctor` must run each resolved component's readiness command from
that component's own directory. The directory needs to travel somewhere in the
generated `checks.json`. The convenient-looking place is directly on
`CommandSpec`/`ReadinessCommand` in `src/feedback.ts`, next to `requires` and
`argv` — but `src/feedback.ts` is the single, pinned command table
(`feedback-controls.md` FC-1), and a directory is a fact about a repository's
layout, not a fact about a stack. The same `typescript` `ReadinessCommand`
object is shared by identity across every TypeScript component; giving it a
`dir` field would either force a per-component clone of the whole command
table (defeating FC-1's single-source guarantee) or make the field mutable
shared state (a `FeedbackCommand` that could contradict the payload, and a
`readiness-checks.md` RD-2 violation: `extensions?: never` and `kind: 'test'`
being compile errors on the wrong type would no longer be the only things
that type forbids).

## Decision

`ScopedReadinessCommand` is declared in `src/doctor.ts` — the generated-checks
composition root, not the command table — as
`ReadinessCommand & { readonly dir?: string }`. `buildDoctorChecks` builds one
entry per resolved component's readiness command, attaching `dir` (and an
`id` suffixed `:<path>`) for every shape **except** the one implicit
single-repo shape — exactly one component whose path is `.` — where `dir` is
omitted and `id` is unchanged, matching today's bytes exactly (MC-5).

> **Correction, 2026-09-23 (post-audit).** This paragraph first read "only when
> more than one component is declared". That reading shipped as
> `components.length > 1` and was the audit's round-1 CRITICAL defect (**F1**):
> a lone non-`.` component (`init --component apps/web=typescript`) emitted its
> readiness command with **no `dir`**, so the runner resolved both the `requires`
> probe and `npm test` at the install root instead of the component directory —
> a silent false-readiness verdict. The shipped gate is now
> `!isSingleRootComponent(components)`, the exported predicate in `src/engine.ts`
> that owns the MC-5/MC-20 boundary. One consequence is recorded and accepted: a
> lone non-`.` component now also carries the `:<path>` id suffix, where MC-20's
> literal wording ("more than one component") implied a bare id. MC-20's two
> clauses never covered that case; `harny-sync` restates MC-20 on the
> `isSingleRootComponent` boundary rather than on a component count. `src/feedback.ts`'s `CommandSpec`,
`FeedbackCommand`, `ReadinessCommand` and `StackProfile` gain no `path`, `dir`,
`component` or `cwd` field — enforced by SC16's grep gate over
`src/feedback.ts`.

## Alternatives considered

| Option | Why not |
|---|---|
| Add `dir?: string` to `CommandSpec` in `src/feedback.ts` | Gives `FeedbackCommand` a second, conflicting way to express a component, and puts mutable per-repo data in the table `feedback-controls.md` FC-1 pins as the single command source |
| Clone `STACK_PROFILES` entries per component with the directory baked in | Defeats "the same `typescript` profile object is shared by every TypeScript component, by identity" (MC-2); duplicates the command table N times over |
| A parallel `Map<componentPath, ReadinessCommand[]>` alongside `checks.json.commands` | Widens `DoctorChecksFile` with a second, redundant shape for the same data; `run-doctor.mjs` would need two read paths instead of one |

## Consequences

**Positive**:
- `feedback-controls.md` FC-1 and `readiness-checks.md` RD-2 both hold
  unweakened; a grep gate (SC16) makes a future regression here a build
  failure, not a judgment call.
- `run-doctor.mjs` acquires no new literal: `command.dir ?? '.'` is the only
  change to the runner (RD-3 preserved).

**Accepted costs**:
- One more type (`ScopedReadinessCommand`) to keep straight from
  `ReadinessCommand`; mitigated by declaring it right next to its own doc
  comment explaining why it is not on `CommandSpec`.

## Follow-ups

- Restate **MC-20** (and `readiness-checks.md`'s corresponding statement) on the
  `isSingleRootComponent` boundary rather than on a component count, so the
  `dir`/id-suffix rule covers the lone non-`.` component the original wording
  left undefined. Applied to `specs/current/readiness-checks.md` at archive time;
  the archived `contract.md`'s own MC-20 text is left as it shipped.
