# ADR 0017: Reuse shared runner in CI via --whole-project flag

- **Status**: Accepted
- **Date**: 2026-09-14
- **Feature**: agent-feedback-controls (post-audit amendment A1)
- **Capability**: feedback-controls
- **Source**: contract.md § A1, BG-10, BG-20
- **Trigger**: (a) — choice between CI-embedded logic vs. shared runner; (d) — accepts the design of a non-per-turn CI invocation

## Context

The original audit found that the CI workflow was emitting one raw step per command, with no dependency-install step and no probe check (audit.md F1). The fix required two changes: (1) add dependency-install steps per profile, and (2) make CI use the same shared runner (and its probe logic) that the per-turn hook uses. The question was whether to duplicate the probe logic in YAML, or to extend the shared runner to handle CI's whole-project checking mode.

## Decision

The shared runner (`templates/hooks/run-feedback.mjs`) gains a `--whole-project` flag. When invoked with this flag in CI, the runner skips turn-file reads/writes, checks the entire project (not per-turn paths), and never honors the re-entry guard. The CI workflow invokes the runner once per build with `--whole-project`, reusing all of the probe logic, command invocation, and findings delivery paths that the per-turn hook uses.

## Alternatives considered

| Option | Why not |
|---|---|
| Embed probe logic in the YAML workflow steps (one step per command, each gated by a probe check) | Would duplicate the exact logic that already exists in the runner; CI and hooks would drift over time; harder to test and audit; doesn't solve the install-step ordering problem (which is why F1 occurred) |
| Create a separate CI-only runner with its own probe logic | Maintenance burden of two parallel implementations; CI behavior couldn't be verified in unit tests that use the shared runner; harder to audit consistency |
| Duplicate the entire shared runner into YAML as inline Bash | Not realistic; the runner is 400+ lines of JavaScript logic with complex turn-dedup and re-entry handling |

## Consequences

**Positive**: 
- CI and per-turn hooks honor the same probes and exit with the same findings format
- The runner is the single source of truth for feedback logic; CI doesn't need separate implementation
- CI findings are testable via the same test suite that verifies per-turn behavior
- Adding a new command or changing probe logic automatically affects both surfaces

**Accepted costs**: 
- The runner must handle both per-turn and whole-project modes, adding one flag and a conditional check; the turnstate handling is cleanly separated
- CI logic is not visible as YAML; it's implemented in JavaScript and embedded via a call to the runner. Understanding CI behavior requires reading the runner code, not just the workflow template.
- The whole-project mode is CI-specific (per-turn hooks never use it), so per-turn developers must understand both modes to debug the runner fully

## Follow-ups

None.

