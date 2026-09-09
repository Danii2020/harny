# ADR 0004: Non-mutation check — filtered absolute form over before/after differential

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: spec-workflow
- **Source**: contract.md § Amendment A1 (replaced by this decision); audit.md AL-S3 (the resolution path)
- **Trigger**: (d) — deliberately accepts an architectural trade-off and records the reasoning

## Context

The `sdd-executor` must verify that generated artifact files do not leak into the source tree — only into the target directory. The original test in `tests/canonical-fidelity.test.ts` was an absolute assertion: it ran the full generator suite and confirmed that `git status --porcelain -- templates .claude` returned nothing.

During Phase 3, amendment A1 proposed replacing the absolute assertion with a **before/after differential**: take a `git status` snapshot before `runInit`, another after, and verify that the "after" snapshot is empty. The rationale was: a differential could catch pre-existing leaks better than an absolute check.

During audit (pass 1), the auditor discovered that a differential has a structural problem: if a file is present in the working tree *before* the generator runs, and the generator does not touch it, the differential shows no change — the leak is invisible to a before/after check. The auditor demonstrated this by leaking a file into `templates/` and watching the before/after differential pass.

Amendment A1 offered two solutions: (a) make the differential span actual `runInit` work (not just empty before/after snapshots), or (b) keep an absolute assertion but filter known-good paths. The executor chose (b): a filtered absolute assertion that verifies the final state while ignoring the eight bridge symlinks under `.claude/skills/harny-*` (which are known to exist and are safely outside the protected paths).

## Decision

The non-mutation check takes an absolute snapshot of `git status --porcelain` for `templates/` and `.claude/`, filters out the eight tracked bridge-symlink entries under `.claude/skills/harny-*/`, and asserts that the remainder is empty. This form:

- Catches mutations that the differential would miss (pre-existing leaks)
- Is simpler to reason about (no temporal dependency on when snapshots are taken)
- Works correctly when the bridge symlinks are the only tracked entries in `.claude/`

## Alternatives considered

| Option | Why not |
|---|---|
| Before/after differential spanning real work | Requires the two snapshots to be separated by actual `runInit` invocation in the test suite; the current test architecture keeps snapshots back-to-back inside one `it()` block; refactoring to span work was out of scope for this amendment |
| Absolute assertion with no filter | Would fail on the bridge symlinks themselves, which are not a leak but a required part of the infrastructure; the filter is load-bearing |
| Original absolute (no amendment) | Passes a genuine leak (demonstrable by the auditor's mutation); does not meet guarantee 21 |

## Consequences

**Positive**:
- Catches the failure mode the differential misses
- Simpler than spanning real work across test phases
- Works with the current test architecture

**Accepted costs**:
- The filter hardcodes the eight skill names and is status-blind: it drops any line whose path matches a name, regardless of git status code; a modification of a tracked symlink might escape detection depending on its status code (AL-S16, residual)
- Adding a ninth `harny-*` skill without updating the filter causes a false positive (AL-S16, residual)
- The filter is not self-documenting; future readers must understand why it exists and how it works

**Open reservations**:
- AL-S15 — the contract text still describes the differential mechanism (not executed). Must be corrected in place before archival.
- AL-S16 — the filter is status-blind and hardcodes the eight names; a staged modification of a bridge symlink goes undetected, and a ninth `harny-*` skill causes a false positive. Must be fixed to filter on `?? ` prefix and the `harny-` discovery pattern (not hardcoded names).

## Follow-ups

**Essential fix**: AL-S16 — filter robustness. The current implementation is sufficient for this feature's scope (eight fixed skills) but fragile for extension.

**Related ADRs**: ADR 0001 (symlink bridge design) explains why the bridge entries exist; ADR 0003 (track all of specs) explains the git state the filter is designed for.
