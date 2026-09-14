# ADR 0014: renderHook as method on Generator interface

- **Status**: Accepted
- **Date**: 2026-09-14
- **Feature**: agent-feedback-controls
- **Capability**: tool-generators
- **Source**: contract.md § IF-1
- **Trigger**: (c) — supersedes ADR 0011; (b) — constrains future generators to implement `renderHook`

## Context

ADR 0011 established that the `Generator` interface would not include a `renderSkill` method, keeping skill rendering out of the interface in favor of consolidating it elsewhere. This feature adds per-turn hook feedback to all five tools, which requires each generator to produce hook configs (JSON, not shared Markdown). The question was whether to fit hooks into the existing `Generator` interface or create a parallel rendering path.

## Decision

The `Generator` interface gains two new members: `hooksPath` (a declarative string naming each tool's native hook-discovery path, e.g., `.claude/settings.json`, `.cursor/hooks.json`) and `renderHook` (a method that produces a `GeneratedFile` containing that tool's hook config JSON). This departs from ADR 0011's "no render methods beyond role/conductor" principle because hook rendering is genuinely per-tool (each tool's hook schema and config path differ), and the method is the cleaner declarative pattern than scattering path knowledge throughout the codebase.

## Alternatives considered

| Option | Why not |
|---|---|
| Add hook rendering as a separate generator-lookup function | Would duplicate the lookup and tool-dispatch logic that `Generator` already encodes; tool-neutral path would be harder to test |
| Store `hooksPath` as configuration, rendering logic outside the interface | Coupling the path to a rendering function is tighter and clearer than a separate manifest |
| Merge hooks into the existing `renderConductor` method | Hook configs and conductor are unrelated shapes (JSON/YAML vs. the artifact format); overloading one method obscures the coupling |

## Consequences

**Positive**: 
- Each generator declares exactly one hook path and method, making the set of generators extensible for future tools
- All five generators gain hook support uniformly through the same interface
- Hook configs and role/conductor artifacts share no rendering logic (they're independent paths)

**Accepted costs**: 
- Departure from ADR 0011's stricter "roles and conductor only" rule, though the rationale still holds (no role/conductor rendering changes)
- Future generators must implement `renderHook` even if they don't emit hooks (though they can return `null` or empty config if a tool doesn't support hooks)

## Follow-ups

None.

