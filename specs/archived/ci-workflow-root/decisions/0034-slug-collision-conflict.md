# ADR 0034: Derive the workflow file name from the install prefix; surface a name collision as `CONFLICT` rather than resolving it

- **Status**: Accepted
- **Date**: 2026-09-23
- **Feature**: ci-workflow-root
- **Capability**: feedback-controls
- **Source**: contract.md § Behavior Guarantees (CW-5, CW-6, CW-14), Error Handling Contract
- **Trigger**: (a) choice between two named viable options

## Context

When an install is at a subdirectory, its workflow file is named after the install path to distinguish it from other installs' workflows in the same repository. Without naming, two installs at different subdirectories could try to write to the same path (e.g., both to `harny-feedback.yml` if slugification were broken or collided).

There are two strategies for handling such collisions:

1. **Resolve programmatically** — detect the collision, append a suffix or number, and write a different file (e.g., `harny-feedback-1.yml`, `harny-feedback-2.yml`)
2. **Refuse loudly** — detect the collision, exit with an error, and write nothing

The feature adopts the second because it aligns with `cli-init.md` CLI-5: conflict detection completes before any write, and nothing is written when a planned path already exists.

## Decision

`componentSlug(prefix)` applies a deterministic five-step rule to convert a prefix to a slug: lowercase, replace non-alphanumeric with `-`, collapse runs of `-`, trim leading/trailing `-`, fallback to `'install'` if empty. Two installs at two different prefixes with different slugs produce two files; neither overwrites the other. If two prefixes derive the same slug (e.g., `apps/web` and `apps-web` both become `apps-web`), the second install exits with `HarnessError('CONFLICT')` before writing anything, naming the conflicting path. The error is the same posture as pre-existing conflicts for other artifacts: refuse, report, let the human decide.

## Alternatives considered

| Option | Why not |
|---|---|
| Auto-resolve with a suffix (e.g., `-1`, `-2`) | Silently accepts a collision and chooses a name without asking. Violates intent goal G2 ("Make 'may write above the install directory' explicit, narrow, and auditable") and `cli-init.md` CLI-5 (conflict detection before any write). Also makes troubleshooting harder: "why is my workflow called `harny-feedback-2.yml`?" |
| Use a hash of the prefix | Deterministic, but opaque: a reader cannot infer the install path from `harny-feedback-abc123def.yml`. Violates intent goal G3 ("subdirectory install's workflow to be distinguishable in the checks list"). |
| Require a `--workflow-name` flag | Adds a new CLI surface and a new prompt question. Out of scope (intent non-goal: no change to `HarnessConfig` or `.sdd/harness.json`'s schema). The placement is a fact about where the directory sits; persisting it would create staleness risk. |
| Silently skip the second install's workflow | Not writing leaves the install incomplete (no CI feedback). Violates intent success criteria (SC1, SC8, SC9). |

## Consequences

**Positive**: 
- Deterministic and auditable: the same prefix always produces the same slug.
- Collision is surfaced immediately and refuses the entire run, preventing silent overwrites.
- Aligns with existing conflict-detection posture (`cli-init.md` CLI-5): nothing is written at either root.
- Nudges the human to choose differently-named directories, which are likely meaningful anyway (different components should live in differently-named places).
- Enables `monorepo-mode` to maintain multiple installs in one repository without contention.

**Accepted costs**: 
- Requires the human to intervene if two subdirectories derive the same slug (though in practice this is rare — `apps/web` and `apps-web` colliding is a misconfiguration).
- Slightly more strictness than auto-resolution, but this is intentional: explicit refusal is safer than silent suffix-based resolution.

## Follow-ups

None immediately. A future feature that supports multiple components per install may need to revisit slug derivation, but the collision-detection posture (refuse and report) is already the right one.
