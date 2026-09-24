# ADR 0038: `components` replaces `stack`, mutually exclusive, never a fallback

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: monorepo-mode
- **Capability**: cli-init
- **Source**: contract.md § Behavior Guarantees (MC-1); § Data Models `HarnessConfig`
- **Trigger**: (b) constrains future features — a rule and invariant others must obey

## Context

A monorepo install needs to declare more than one directory-and-stack pair. The
existing single `stack?: string` field cannot express that. Two shapes were
possible: let `components` coexist with `stack` (with `stack` as a fallback
default for any path not covered by a declared component), or make the two
fields strictly mutually exclusive.

## Decision

`HarnessConfig.stack` and `HarnessConfig.components` are mutually exclusive. A
single source (a `--config` file, `.sdd/harness.json`, or one flag invocation)
supplying both non-empty is `HarnessError('USAGE')` naming both fields; nothing
is written. There is no precedence rule and no silent winner. A repository whose
root is itself one of its components says so explicitly by declaring
`{ path: '.', stack: … }` inside `components` — exactly the shape the
dogfooding incident (`plan.md` line 240) proposed.

The check is evaluated once, in `mergeConfig`, after the merge inputs are read
but before they are applied — the single home of the rule (`AGENTS.md` S5). An
override that replaces the shape question's answer (supplies `components` when
the base carried `stack`, or vice versa) drops the superseded field rather than
re-triggering this error — the exclusivity error fires only when **one** source
supplies both.

## Alternatives considered

| Option | Why not |
|---|---|
| `stack` as a fallback default for paths outside every declared component | A second, implicit component with no name; a touched path's component could silently change if a declaration is edited elsewhere; contradicts MC-11's "drop and notice" posture for genuinely unassigned paths |
| Merge `stack` and `components` per-path across sources | A component list is a description of a repository's shape; merging two such descriptions produces a shape neither source asked for |
| No exclusivity check at all (last writer wins) | A silent winner is a hostile surprise on a real misconfiguration, and violates `AGENTS.md` S2's conflict-before-write posture |

## Consequences

**Positive**:
- Exactly one evaluation site for the exclusivity rule; no path harny itself
  *writes* can produce a config carrying both fields.

> **Correction, 2026-09-23 (post-audit).** This bullet first claimed "the call
> graph proves no other site can construct a config carrying both." The audit
> disproved it (**F2**, HIGH, accepted as a deferred reservation): `mergeConfig`
> is not on the *reading* path. `validateConfig` carries no exclusivity check,
> and it is the only production reader of a real `.sdd/harness.json`
> (`src/doctor.ts:390`), so a **hand-edited** config carrying both `stack` and
> `components` is accepted silently by `npx harny doctor` — with `components`
> winning, which is precisely the silent winner this ADR forbids. The rule as
> decided is unchanged; its enforcement is one-sided until F2 closes.
- The root-is-a-component idiom (`{ path: '.', stack: … }`) is strictly more
  explicit than an implicit fallback, and is the shape the incident itself
  proposed.

**Accepted costs**:
- An override that intends to widen `stack` to `components` (or the reverse)
  must supply the whole new answer; there is no incremental "add one component
  on top of the existing stack" flow.

## Follow-ups

- **F2 (HIGH, deferred by human decision at the post-audit gate).** Move or
  mirror the `mergeConfig` exclusivity check into `validateConfig`, the one
  function both the writing path (`runInit` step 7) and the reading path
  (`runDoctor`) traverse, and add audit coverage row **A3** — a test that
  exercises a real `.sdd/harness.json` through `validateConfig`, not through
  `loadConfigFile` + `mergeConfig` as row T6 does. The alternative the audit
  offers, if this rule is judged not worth a second site: declare
  `.sdd/harness.json` harny-owned and hand-editing unsupported, in writing.
