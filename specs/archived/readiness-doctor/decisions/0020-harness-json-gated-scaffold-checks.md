# ADR 0020: .sdd/harness.json-gated scaffold-artifact checks

**Status**: Accepted
**Date**: 2026-09-14
**Feature**: readiness-doctor
**Capability**: readiness-checks

## Source

readiness-doctor · contract.md § Data Models, "Why the `.sdd/harness.json` gate exists";
intent.md § G3; roadmap.md Phase 3, Data Models table

## Trigger

(b) Constrains future features: the rule "scaffold-artifact checks require `.sdd/harness.json` presence" is a new invariant others must obey.
(d) Deliberately accepts a consequence: this repo's own readiness check can never detect missing dogfood artifacts at initialization time without first scaffolding this repo itself.

## Context

The readiness check validates that base harness files are present: `.sdd/spec-schema/*.md`, `.sdd/feedback/run-feedback.mjs`,
`.github/workflows/harny-feedback.yml`, core skills under each skill root, etc. These files are scaffolded by
`npx harny init` and expected to be present in any repo that ran it.

However, this repository (`harny` itself) is the tool, not a repo scaffolded by the tool. It has
`.claude/skills/harny-*` and `specs/current/`, but it does not have `.sdd/harness.json` or
`.sdd/spec-schema/`, because it was not initialized via `npx harny init`. If the readiness check
unconditionally required these artifacts, the check would always fail on this repo, training
developers to ignore it.

## Decision

Gate the scaffold-artifact checks (spec-schema, feedback-runner, CI-workflow, core-skills) on the presence
of `.sdd/harness.json`. If `.sdd/harness.json` is absent, skip all scaffold-artifact checks with a notice.
The skip is reported as coverage, not as a failure.

This encodes the rule: **"These artifacts are required of a repo that `harny init` scaffolded."**
It is honest for both scaffolded repos (which have `.sdd/harness.json` and are expected to have the artifacts)
and unscaffolded repos (which lack `.sdd/harness.json` and are legitimately not bound by this check).

## Alternatives considered

1. **No gate — unconditional scaffold-artifact checks**: fail every repo (including `harny` itself) that lacks the artifacts.
   - Pro: No ambiguity; if a file is missing, the check reports it.
   - Con: This repo would be permanently red, training developers to ignore the check.
   - Rejected: a red control that can never be satisfied teaches people to dismiss it.

2. **Harder gate — require both `.sdd/harness.json` AND one of the artifacts**: assume that a repo has some scaffolded artifacts but not others.
   - Pro: More permissive; detects partial scaffolds.
   - Con: More complex; most repos either run `init` completely or not at all.
   - Rejected: the simpler rule suffices; partial scaffolds are not a common failure mode.

## Consequences

- Any repo without `.sdd/harness.json` skips all scaffold-artifact checks and can still exit ready (0).
- This repo must explicitly add `.sdd/harness.json` and the spec-schema to its dogfood set to have them checked.
  (This is acceptable: the human approved completing the dogfood set in the feature's post-implementation phase.)
- Future features adding new generated artifacts must decide: (a) gate on `.sdd/harness.json` if it is a scaffolded-repo artifact,
  or (b) use a different gate if the artifact is expected in other contexts.
- The gate is not a special case; it is the honest general statement encoded in the check's `requires` field using the existing `ToolProbe` mechanism.

## Follow-ups

None at this time; the decision is complete and tested on this repo after dogfood completion.
