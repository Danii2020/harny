# ADR 0028: Path filtering lives only in the per-turn code path; the `.` sentinel bypasses it by construction

- **Status**: Accepted
- **Date**: 2026-09-22
- **Feature**: feedback-path-hygiene
- **Capability**: feedback-controls
- **Source**: contract.md § G3, PH-7; roadmap.md § Risk Assessment
- **Trigger**: (b) — constrains future filtering additions; (c) — extends ADR 0017's commitment to runner-based CI reuse

## Context

ADR 0017 established that CI uses the same runner as per-turn hooks, invoked with a `--whole-project` flag instead of per-turn accumulated paths. This feature adds path filtering (extension gate, vanished-path drop) to the per-turn code path to fix false-positive findings on mixed-content turns (e.g., editing `.py`, `.json`, and `.yml` files in one turn).

The filtering is a correctness concern for per-turn feedback but should never apply to CI. CI's `.` argument is already a special case that means "check the entire project"; adding filtering there would either:
1. Break CI's whole-project guarantee (if filtered), or
2. Require additional CI-specific logic (if CI-excepted)

The cleanest approach is to make the filtering logic live only in the per-turn code path (`runRunMode`), so CI's whole-project mode (`runWholeProject`, using `.`) automatically bypasses filtering as a side effect of using a different code path.

## Decision

Path filtering (extension gate via `matchesExtensions`, vanished-path drop via `existingPaths`, and empty filtered set skip via the continue statement) is implemented only in `runRunMode`'s loop, where per-turn paths are evaluated. `runWholeProject` and `runCommand` remain byte-for-byte unchanged. The `.` sentinel argument passed by CI bypasses both filters by construction — not by explicit exemption logic, but because it is processed by a different code path that never calls the filtering functions.

## Alternatives considered

| Option | Why not |
|---|---|
| Implement filtering in `runCommand` (the shared command-invocation function) with a CI-exempt flag | Adds branching logic to the lowest-level function; filtering logic becomes distributed across `runCommand` and its callers; harder to audit (filtering must be checked in two places, and the flag must be threaded through all call sites) |
| Implement CI-specific filtering logic in the workflow YAML (e.g., jq or bash to filter before invoking the runner) | Breaks the ADR 0017 principle that CI reuses the runner's logic; YAML becomes harder to read and maintain; probe checking (which CI needs) is still in the runner; splitting the logic makes it harder to verify consistency between per-turn and CI behavior |
| Add a `--no-filters` flag to suppress filtering in CI | Requires explicit flagging in every CI invocation; future filtering additions must remember to update the flag logic; error-prone (easy to forget the flag and accidentally filter in CI) |

## Consequences

**Positive**: 
- CI behavior is guaranteed to be unchanged by future filtering additions, as long as those additions stay in `runRunMode` and don't touch `runWholeProject`
- No branching logic or exemption flags needed; the `.` sentinel naturally bypasses filtering by virtue of being processed by a different code path
- The rule is simple and auditable: "filtering lives here" (one location in the code)
- CI can be verified by the same test suite that verifies per-turn behavior; no CI-specific test mutations needed

**Accepted costs**: 
- Future filtering or path-processing logic must be added only to `runRunMode`, never to `runCommand` or `runWholeProject`. This is a constraint that must be documented and enforced by code review.
- The rule is implicit rather than explicit in the code; a developer reading `runCommand` won't immediately see that it's intentionally filter-free. It relies on this ADR for documentation.
- If a future feature wants to filter in CI (e.g., "skip type-check on Markdown-only turns"), it cannot reuse this implementation; it would require a separate mechanism or a violation of this ADR.

## Follow-ups

- Document the "filtering in `runRunMode` only" rule in `templates/hooks/README.md` § "The behavior" for future maintainers.
- If a future feature proposes CI-side filtering, evaluate whether to add a new `--filtered-whole-project` flag or stick with this ADR's constraint.

