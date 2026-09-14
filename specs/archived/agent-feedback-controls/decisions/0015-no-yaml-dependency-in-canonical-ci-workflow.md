# ADR 0015: No YAML dependency in canonical CI workflow

- **Status**: Accepted
- **Date**: 2026-09-14
- **Feature**: agent-feedback-controls
- **Capability**: feedback-controls
- **Source**: contract.md § BG-10
- **Trigger**: (b) — constraint on future CI/workflow tooling; (d) — accepts the design cost of no dynamic YAML

## Context

The CI workflow (`templates/ci/harny-feedback.yml`) must generate valid GitHub Actions YAML with exactly two kinds of step: an optional install step and a runner invocation. Early designs considered using a Node.js YAML library to construct the workflow object programmatically and serialize it, which would enable dynamic step composition and validation. However, this would add a runtime dependency to the `package.json`, and the workflow structure is simple enough that string templating is sufficient.

## Decision

The canonical workflow template is hand-written YAML (valid GitHub Actions syntax), and the generator embeds command strings and profile names as inline JSON within the YAML (via `yamlQuote` helper), never invoking a YAML library. The workflow is static except for the generated inline JSON block containing the resolved profile's commands and install steps.

## Alternatives considered

| Option | Why not |
|---|---|
| Add a YAML library (e.g., `js-yaml`) to package.json | Would add a runtime dependency (S4 — explicit amendment required); workflow structure doesn't justify the added dependency; hand-written YAML is simpler to review and audit |
| Dynamically construct the workflow object in JavaScript, then serialize to YAML | Same dependency cost; harder to review the generated output since the shape is implicit in code rather than explicit in the template |
| Generate the workflow as a series of string concatenations | Harder to maintain and read than the current template-based approach; no improvement in simplicity |

## Consequences

**Positive**: 
- No new runtime dependency; `package.json` remains pinned
- Workflow source is human-readable YAML, reviewable by human and by tests (YAML parser verifies structure)
- Command strings are embedded as inline JSON within the YAML step, a pattern already used in the five hook configs

**Accepted costs**: 
- Dynamic validation (e.g., "if this tool is selected, add an extra step") is not possible; the install and runner steps are fixed
- Profile-specific install steps are embedded as comment blocks describing the probes, not as conditional YAML `if` statements

## Follow-ups

None.

