# ADR 0029: Context7 `/mcp/oauth` for all five tools, no per-tool fallback

- **Status**: Accepted
- **Date**: 2026-09-22
- **Feature**: dogfood-quick-fixes
- **Capability**: cli-init
- **Source**: contract.md § Item 1 (MO-1…MO-8)
- **Trigger**: (a) named options; (c) diverges from prior shipped fact; (d) accepts unverifiable claim

## Context

Context7 documents two endpoints for its MCP server:
- `/mcp` — accepts anonymous requests at a shared rate limit or an `Authorization: Bearer <key>` header
- `/mcp/oauth` — negotiates OAuth 2.0 with clients implementing the MCP OAuth specification

The plain `/mcp` endpoint was observed not to work correctly in practice, despite being shown in Context7's own per-client examples (Cursor, Kiro, Codex). The OAuth endpoint is documented as an opt-in for clients that support the MCP authorization specification, but represents a departure from the vendor's per-client guidance.

The prior shipped feature (`context7-mcp`) hardcoded the plain `/mcp` endpoint across all five tools via a single constant in `src/mcp.ts`, with no per-tool fallback or detection. This feature changes only the value of that constant, not the single-literal invariant or the generation mechanism.

## Decision

harny writes the OAuth endpoint `/mcp/oauth` to all five tools' native MCP configuration files without exception, using the same constant-import mechanism established by `context7-mcp`. No per-tool fallback to `/mcp` is implemented, and no detection of pre-existing configs is performed. The remedy for a tool that cannot perform OAuth is a one-line hand edit of that tool's config back to `/mcp`.

## Alternatives considered

| Option | Why not |
|---|---|
| Per-tool fallback to `/mcp` for tools that cannot do OAuth | Would require runtime detection of OAuth support, expanding scope beyond the constant value change this feature is scoped to; test matrices would need to verify each tool's capability; vendor docs do not give us the necessary detection signal today |
| Hardcode `/mcp` and wait for vendor per-client examples to update | Leaves the observed-broken endpoint in generated configs for users; contradicts the evidence that prompted this change |
| Derive the endpoint from an env-var or config file | Would make generated output non-deterministic or add configuration burden to every scaffolded repo; violates `AGENTS.md` S3 (determinism) and `cli-init.md` CLI-4 |

## Consequences

**Positive**:
- Generated configs now point at an endpoint known to work in practice, rather than a documented-but-broken one
- Users need not hand-edit their configs on first use (assuming their tool supports OAuth)
- All five tools remain synchronized on the same endpoint value via a single source-of-truth constant

**Accepted costs**:
- The generated configuration was never loaded into a live install of any of the five tools to verify OAuth support end-to-end
- Clients that do not implement the MCP OAuth specification will report a connection failure; the remedy is a one-line hand edit
- A departure from Context7's own per-client documentation, mitigated only by the evidence that the per-client docs' recommended endpoint does not work in practice

This cost is accepted and recorded as reservation **`R-OAuth`** (MEDIUM, human-gated), the same class as the standing `AL-30` (per-tool facts verified through documentation rather than live install) and `CG-1`/`O4` (Codex-specific per-tool facts).

## Follow-ups

- Verify that the first live use of a generated config with the `/mcp/oauth` endpoint succeeds on all five tools after this feature ships
- Monitor for user reports of connection failures and capture remediation data (how many tools required hand-editing, which tools, what workaround was effective)
