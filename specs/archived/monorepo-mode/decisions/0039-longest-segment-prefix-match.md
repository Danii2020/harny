# ADR 0039: Longest segment-prefix match; an unassigned path is dropped with a notice

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: monorepo-mode
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (MC-9, MC-11)
- **Trigger**: (b) constrains future features — a rule and invariant others must obey; (d) fixes a real incident-adjacent defect class (string-prefix matching)

## Context

`templates/hooks/run-feedback.mjs` must resolve each touched path to exactly one
declared component. A naive `path.startsWith(componentDir)` string-prefix test
is the obvious first implementation, and it is wrong: `'apps/web-admin/x.ts'
.startsWith('apps/web')` is `true`, so a component named `apps/web` would
wrongly claim files that belong to a sibling `apps/web-admin`.

Separately, a touched path may match no declared component at all (a
misdeclared component list, or a genuinely uncovered directory), and the runner
needs a defined behavior for that case.

## Decision

A component `d` matches a touched path made relative to the runner's `cwd` and
POSIX-normalized (`rel`) iff `d === '.'`, or `rel === d`, or
`rel.startsWith(d + '/')` — segment-boundary aware, never a raw string prefix.
Among matches, the one with the most path segments wins. Because normalized
component paths are distinct by construction (MC-7), this can never tie.

A touched path matching no declared component is dropped, never reassigned to
an arbitrary component and never silently discarded: the runner prints exactly
one stderr notice naming the count,
`harny-feedback: <N> touched path(s) matched no declared component; skipped.`
With today's single `.` catch-all component this count is always `0`, so the
notice is never printed — byte-identical output by construction (MC-5).

## Alternatives considered

| Option | Why not |
|---|---|
| Raw `startsWith` string-prefix match | Wrong at a segment boundary (`apps/web` vs. `apps/web-admin`) — the exact defect class this ADR exists to close |
| Assign an unmatched path to the `.` component (or the first declared component) as a default | Produces confident, wrong findings from the wrong toolchain; hides a misdeclared component instead of surfacing it |
| Silently discard an unmatched path | Hides a misdeclared component just as much as a wrong default, only quietly |

## Consequences

**Positive**:
- `apps/web` never matches `apps/web-admin/x.ts` (SC6), proven by a dedicated
  test.
- A misdeclared component set is visible in the runner's own output rather than
  silently wrong.

**Accepted costs**:
- One more code path (the notice) that the single-component case must keep out
  of — covered by a dedicated regression test (`N is always 0 for the legacy
  single-"." form`).

> **Correction, 2026-09-23 (post-audit).** That cost was first written as a path
> that "stays unreachable" for the single-component case. The audit found it
> **reachable** (**F10**, LOW, accepted): `componentDirFor` returns `undefined`
> for any touched path outside the install directory, so a single-`.`-component
> install in a subdirectory whose turn touched a file above it now drops that
> path with the notice, where it was previously passed through to the command.
> A deliberate narrowing, not a regression — no generated artifact changes — but
> MC-11's "with today's single `.` component, `N` is always `0`" is not strictly
> true, and the sentence above no longer claims it is. The audit also rates the
> covering test **weak rather than vacuous** (**F13**, LOW): it sets no
> invocation log and asserts only exit 0 plus the absence of a string, so it
> would also pass if the runner dispatched nothing.

## Follow-ups

- **F13 (LOW).** Add a positive control to the "N is always 0" test — assert the
  `NOOP` command actually ran once — so it cannot pass on a runner that
  dispatches nothing.
- **F3 (HIGH, deferred by human decision at the post-audit gate).** The
  turn-mode half of the "component directory absent + `requires: {}`" error row
  is reachable and untested; the archived `audit.md` row **T39a** records why the
  original "unreachable" reasoning was false. One test closes it: declare a
  component, accumulate a touched path under it, delete the directory before
  `run`, and assert exactly one `componentDirMissingNotice` and no spawn.
