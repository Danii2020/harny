# ADR 0005: Portable skill frontmatter — six keys, no tool-specific extensions

- **Status**: Accepted
- **Date**: 2026-09-09
- **Feature**: sdd-skill-library
- **Capability**: skill-library
- **Source**: contract.md § Verified facts V5, V6 + § "The harny-* skill shape contract" (G2, SC4)
- **Trigger**: (a) & (b) — chose six-key portable set over tool-specific extensions; constrains future skills

## Context

Skills in the harness ecosystem can live in different agent-tool projects (Claude Code, Cursor, Kiro, GitHub Copilot, Codex, and potential future tools). Each tool's skill format has tool-specific keys: Claude Code has `disable-model-invocation`, `context`, `agent`, `model`, `effort`, etc. (V6); other tools have their own equivalents.

If canonical skill files hardcode any tool-specific key, they become non-portable. A future tool would have to:

1. Remove the Claude-Code-only keys before using the skill (fragile; easy to forget)
2. Add its own tool-specific keys (creates duplication and drift)
3. Store a tool-specific copy (defeats the purpose of a canonical single source)

The portable Agent Skills spec (documented by multiple tool vendors as a standard format) defines six universal keys: `name`, `description`, `license`, `compatibility`, `allowed-tools`, and `metadata` (V5).

## Decision

Every `harny-*/SKILL.md` file in the canonical `.agents/skills/` layer declares only these six keys:

```yaml
name: <skill-id>
description: <max 1,536 characters>
license: <license identifier>
compatibility: <compatibility statement>
allowed-tools: <list of tool ids this skill is compatible with, or omitted if compatible with all>
metadata:
  <custom structured data, if any>
```

No Claude-Code-only keys appear in the canonical files. Tool-specific keys (e.g., `model`, `context`) live only in generated outputs (e.g., `.claude/agents/`, `.cursor/agents/`) and are added by the per-tool generators.

## Alternatives considered

| Option | Why not |
|---|---|
| Include both portable and tool-specific keys in canonical files | Violates portability; other tools see Claude Code syntax they don't understand; either they ignore it (fragile) or they error (breaks interop) |
| Tool-specific copies (Claude Code in `.claude/skills/`, Cursor in `.cursor/skills/`) | Duplication; maintenance burden; drift over time; defeats the purpose of a single canonical source |
| Minimal frontmatter (name, description only) | Loses useful metadata (license, tool compatibility); makes it hard for other tools to reason about skill constraints |

## Consequences

**Positive**:
- Canonical skills are truly portable; any tool can read them
- Generated tool-specific artifacts can be reproduced from the canonical; no locked-in information
- Future tools can adopt the same convention without modifying the canonical files
- Clear separation of concerns: canonical + portable frontmatter, tool-specific frontmatter in generated artifacts

**Accepted costs**:
- Tool-specific configuration is not visible in the canonical file (by design); it lives in the generator instead
- The six-key set is a constraint; if a tool has tool-specific needs not covered by `metadata`, it must extend the specification or store the need elsewhere
- Validation of the six-key constraint is a manual/test concern (contract guarantee C3 / test T4)

## Follow-ups

**Extension point**: if a tool's needs exceed the six-key portable set, the solution is to extend `metadata` (tool-specific fields in a nested structure) rather than add tool-specific frontmatter keys to the canonical file.

**Named successor**: `templates-skill-library-parity` — ensure that any templates shipped in `templates/roles/` and future skills follow the same portable frontmatter contract.
