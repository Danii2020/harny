# ADR 0030: Hardcode `main` in the canonical CI push trigger rather than deriving the default branch

- **Status**: Accepted
- **Date**: 2026-09-22
- **Feature**: dogfood-quick-fixes
- **Capability**: feedback-controls
- **Source**: contract.md § Item 4 (CI-1…CI-6)
- **Trigger**: (a) choice between named options; (b) constrains future features

## Context

The CI workflow that harny scaffolds declares a GitHub Actions trigger (`on:`) that must be canonical (outside the generated block) and copied verbatim into every generated repository. A push-to-integration trigger was needed to close the feedback gap for direct commits to `main`, but the target repository's default branch is unknown at scaffold time.

Three approaches were considered:

1. **Hardcode `main`** — simplest; correct for GitHub's default for new repositories; requires a one-line hand edit for repos using `master`, `trunk`, `develop`, etc.
2. **Derive from git's remote HEAD** — use `git symbolic-ref refs/remotes/origin/HEAD` to detect the default branch. Fails in fresh `git init`, repos with no remote, or environments with no git; makes output non-deterministic across machines and violates `AGENTS.md` S3.
3. **Prompt the user** — add a new `HarnessConfig` field and a new `init` prompt. Disproportionate scope for a one-line workflow value; adds cognitive burden to every scaffolding run.

## Decision

The branch name in `templates/ci/harny-feedback.yml` is hardcoded as `main` with a documented comment explaining the alternatives and directing users to change it by hand if their repo uses a different default branch. This is the one value in the generated workflow that harny explicitly expects a project to adjust.

## Alternatives considered

| Option | Why not |
|---|---|
| Derive from `git symbolic-ref refs/remotes/origin/HEAD` | Non-deterministic (fails in some repo states); violates determinism requirement S3; adds complexity to the scaffold phase that contradicts ADR 0015 (no YAML parsing/re-serialization in the canonical workflow) |
| Prompt the user during `init` | Adds a new configuration field and a new question to every init run, for a value only needed when the default branch is not `main` (a minority case); out of proportion to the problem |
| Leave the trigger as PR-only | Leaves the post-integration feedback sensor (defined in `AGENTS.md` § Feedforward vs. feedback) absent on the integration path, unable to catch issues that only manifest after merge |
| Move the branch name into the generated block and derive it at render time | Contradicts ADR 0015 (no YAML dependency, no dynamic trigger construction); decouples the trigger structure from the portable templates |

## Consequences

**Positive**:
- Post-integration feedback sensor (the CI workflow) now fires on direct pushes to `main`, closing the feedback gap on the integration path
- All scaffolded repos have a consistent, stable workflow with no dynamic derivation
- The scaffold process remains deterministic (`cli-init.md` CLI-4)
- No new configuration field, no new prompt, no new complexity

**Accepted costs**:
- Repositories that use a default branch other than `main` must hand-edit one line of the generated workflow (`on.push.branches` entry)
- The one-line edit is documented in the workflow's own header comment and is explicitly the only value harny expects users to adjust
- No dynamic fallback or auto-detection — a deliberate trade-off favoring simplicity and determinism

## Follow-ups

- Monitor user reports of "CI workflow doesn't fire" to ensure the documentation is discoverable and the hand-edit is unambiguous
- If a future feature needs to derive other scaffold values (e.g., the GitHub organization name), consider whether a centralized config-derivation layer would reduce per-feature complexity
