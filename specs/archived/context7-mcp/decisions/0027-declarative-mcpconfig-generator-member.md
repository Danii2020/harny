# ADR 0027: mcpConfig as a declarative Generator member (continuing ADR 0011/0025)

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: context7-mcp
- **Capability**: tool-generators
- **Source**: contract.md § Interfaces, § "Public API — src/generators/types.ts"; intent.md § Constraints, § Amends five shipped current-truth statements
- **Trigger**: (a) the feature explicitly contrasts with ADR 0014's renderHook method approach; (c) continues the lineage from ADR 0011 (skillsDir) and ADR 0025 (guidancePath)

## Context

The `Generator` interface has evolved through two prior decisions on per-tool variation:

- **ADR 0011** (`skillsDir`): added a declarative path member (per-tool skill-discovery root). Rationale:
  the variation is a *fixed fact* known at module load with no payload input; serialization is done by
  shared helpers, never by the generator.
- **ADR 0025** (`guidancePath`): added another declarative member (per-tool root instruction-file path,
  required-but-possibly-`undefined`). Rationale: same as ADR 0011 — a path fact, so follows `skillsDir`,
  not `renderHook`.
- **ADR 0014** (`renderHook`): added a *method* (per-tool hook file rendering). Rationale: the hook
  content is generated per-tool (format varies), so delegation to a method lets the generator control
  the serialization.

Context7 MCP configuration presents the same question: should the per-tool MCP facts (`path`, `format`,
`rootKey`, `entry` shape) be a declarative member or a render method?

The answer: **declarative member**, following ADR 0011/0025, not ADR 0014. Per-tool MCP facts are
**fixed path and shape facts** known at module load with no payload input — just like `skillsDir` and
`guidancePath`. Every byte of serialization is done by the shared merger in `src/mcp.ts`, never by the
generator. A `renderMcp*` method would be doing no rendering at all; the generator's job is to declare
what the tool's config file looks like, and the merger handles the rest.

## Decision

The `Generator` interface gains a required-but-possibly-`undefined` member, `mcpConfig?: McpConfig`,
where `McpConfig` declares the four fixed facts: path, format (JSON or TOML), rootKey, and entry shape
(a `Record<string, string>`). Omitting this member is a TypeScript compile error, so a sixth generator
cannot skip the question (the same device `TG-12` / ADR 0025 established for `guidancePath`).

All five shipped generators declare `mcpConfig` with real, non-`undefined` values. The shared merger
(`src/mcp.ts`) dispatches on `format` and does all serialization work, freeing each generator from
the need to know about JSON/TOML details.

## Alternatives considered

| Option | Why not |
|---|---|
| renderMcpConfig method on Generator | The generator would have nothing to render: MCP facts are all fixed, format is already known, and merge logic is shared. A method that declares facts but does no rendering violates YAGNI and splits the MCP facts across two locations. |
| Inline MCP facts in each generator file | Creates duplication; the same five facts repeated across five files risk desynchronization and violates DRY. A shared `Generator` member keeps the facts in one place. |
| Optional mcpConfig member | A sixth generator could accidentally omit it, causing a silent skip rather than a compile error. Required-but-possibly-`undefined` (like ADR 0025's `guidancePath`) makes the question mandatory. |
| Store MCP facts in a separate registry outside Generator | Breaks the established pattern (skillsDir, hooksPath, guidancePath all live on the interface) and makes future generator addition harder to validate. |

## Consequences

**Positive**:
- Consistent with established patterns (ADR 0011, ADR 0025): per-tool fixed facts live as declarative
  members, not methods.
- A sixth generator is forced by `tsc` to declare its MCP configuration, making the question unavoidable
  and preventing accidental skips.
- MCP facts are centralized in one place per generator; no duplication or risk of drift.
- Serialization logic stays in one place (`src/mcp.ts`), following S5 (shared constants, one owner).

**Accepted costs**:
- A tool with no MCP surface must still declare `mcpConfig: undefined` explicitly. This is intentional
  (make the question visible) and mirrors `guidancePath`'s own design.
- Any future generator-specific MCP logic (e.g., tool-specific merge rules) would require either amending
  the member type or adding a render method later; the current design assumes all tools use the same
  merge algorithm.

## Follow-ups

- **Per-tool MCP merge customization**: if a future tool requires tool-specific merge logic beyond the
  current JSON/TOML dispatch, revisit whether a render method should be added alongside the declarative
  member.
- **mcpConfig in ADR documentation**: this decision should be cited by any future feature amending the
  Generator interface for MCP-related work.
