# ADR 0041: A `whole-project` command runs once per component with an assigned touched path

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: monorepo-mode
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (MC-17, MC-18)
- **Trigger**: (b) constrains future features — a rule and invariant others must obey; (d) bounds a real performance/UX risk (a type-check storm on a large monorepo)

## Context

Today, a single-component install's `whole-project` command (e.g. `tsc --noEmit`)
runs once whenever the turn touched any file, regardless of that file's type —
a turn that touched only `README.md` still runs the type checker. Generalizing
this literally to N components has two candidate gating rules: "the component
has at least one assigned touched path" (the direct generalization of today's
behavior), or "the component has at least one assigned touched path that also
passed some sibling per-file command's extension filter" (a narrower, more
"efficient" reading).

## Decision

A `whole-project` command runs once per component that has **at least one
assigned touched path** — never gated on any sibling command's extension
filter, and never once per every declared component regardless of relevance.
This is the exact generalization of today's single-component behavior: a
`.md`-only edit inside a component still runs that component's type-check,
precisely as it type-checks the root today. A component with zero assigned
touched paths runs nothing at all — not its per-file commands, and not its
whole-project commands (MC-17).

The accepted cost is explicit: a `.md` edit inside `apps/web` still
type-checks `apps/web`. This is bounded, not unbounded — only components that
were genuinely touched in the turn run anything, so a two-file edit in one
component of a ten-component repo triggers one type-check, not ten.

## Alternatives considered

| Option | Why not |
|---|---|
| Gate on "at least one path that also passed a sibling per-file command's extension filter" | Not a generalization of today's behavior — today's single-component install runs `tsc --noEmit` on a `README.md`-only turn; narrowing this per component would be a silent behavior change, not parity |
| Run every declared component's whole-project commands unconditionally, every turn | The type-check-storm risk this ADR exists to bound — a two-file edit in a ten-component repo would trigger ten type-checks |

## Consequences

**Positive**:
- Exact behavioral parity with today's single-component install, generalized
  by construction rather than by a special case.
- Bounded cost: only touched components run anything at all (MC-17).

**Accepted costs**:
- A `.md`-only edit inside a component still runs that component's full
  type-check — the same cost today's single-component install already
  accepts, now paid per touched component instead of once.

## Follow-ups

None.
