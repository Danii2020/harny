# ADR 0026: Merge-write, never whole-file, for co-owned MCP config

- **Status**: Accepted
- **Date**: 2026-09-15
- **Feature**: context7-mcp
- **Capability**: tool-generators, cli-init
- **Source**: contract.md § Amendments, § "The write model"; intent.md § Constraints, § "The write model"
- **Trigger**: (a) the contract and intent explicitly name two viable options with reasoned rejection of one; (b) constrains future `harny mcp add` feature; (d) deliberately accepts an asymmetry on `--force` (Codex TOML rewrite)

## Context

The five MCP config files this feature writes (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`,
`.kiro/settings/mcp.json`, `.codex/config.toml`) are the first artifacts harny writes that are
**co-owned** — not wholly harny's own. Every prior artifact (`agents/*.md`, `.sdd/`, `.github/workflows/`)
is wholly harny's, so the whole-file write model and the conflict rule (`CLI-5`: write nothing if the path
exists, unless `--force`) were safe.

A pre-existing `.vscode/mcp.json` with unrelated servers, or a pre-existing `.codex/config.toml` holding
the user's model choice and approval policy, makes whole-file semantics dangerous:
- On the JSON path, a user who already has MCP servers configured would have them destroyed on
  `harny init --force` (the flag documentation tells users to reach for when re-running `init`).
- On the TOML path, `harny init --force` over a repo with pre-existing Codex config would silently destroy
  unrelated Codex settings: model choice, approval policy, sandbox settings, hooks. This is a silent
  data-loss bug with a plausible trigger.
- Whole-file semantics also make `G4` (re-running `init` safe) impossible: a single pre-existing `.vscode/mcp.json`
  would make the *entire* `init` run refuse, blocking unrelated artifacts.

The recommended solution: **merge-write** — read what exists, add exactly one MCP server entry under that
tool's root key, preserve every other key and every unrelated setting, write back. A file that cannot be
safely extended (unparseable JSON, non-object root) is left byte-identical and reported, never mangled.

This path is deliberately kept small and requires no new dependency:
- JSON: `JSON.parse` / `JSON.stringify` are language builtins; present/object checks happen on the
  post-parse structure only.
- TOML: No parser; only presence detection of `[mcp_servers.context7]` by line-start scan. The cost
  is an asymmetry: `--force` replaces a `context7` entry in JSON files but is a no-op on the TOML
  table (removing it safely would need the parser this feature refuses).

## Decision

We build and ship the merge-write path in context7-mcp itself, scoped to one server name. MCP config paths
are marked with a `merge?: true` flag on `GeneratedFile`, and `planWrites` skips them when collecting
conflicts. The two mergers (`mergeJsonMcpConfig`, `mergeTomlMcpConfig`) are pure functions with no
dependency on `fs` or `process.env`. No new npm dependency is added.

## Alternatives considered

| Option | Why not |
|---|---|
| Whole-file write with `CLI-5` + `--force` | Fails data-loss on Codex config and blocks re-running init on already-configured VS Code MCP; deferred to v2 or later. |
| Parse and merge TOML, not line-scan | Adds a new npm dependency (forbidden by S4); merges are already small enough that line-scan for `[header]` is sufficient for exact matching. |
| Rewrite existing Codex `[mcp_servers.context7]` table with `--force` | Would need a TOML parser; asymmetry is documented and tested instead. |
| Store MCP config in a harny-owned file (e.g., `.sdd/mcp-servers.json`) | Violates containment principle: users expect their tools' own config files to be the source of truth, and future features (like `harny mcp add`) must extend the same files. |

## Consequences

**Positive**:
- Pre-existing MCP servers, Codex settings, and unrelated tool config survive intact.
- Re-running `init` is safe and idempotent — no duplicated entries, no accumulating whitespace.
- The deferred `harny mcp add` command can inherit this merge path without reinventing it.
- No new dependency added (S4 stands).

**Accepted costs**:
- `--force` does not rewrite an existing Codex `[mcp_servers.context7]` table (asymmetry documented in MC-9).
- JSONC files (JSON with comments) are not extended; if a `.vscode/mcp.json` has comments, it is left
  byte-identical and reported, never mangled (accepted per OQ4).
- A pre-existing MCP config file with a non-parseable JSON or non-object root is skipped with a warning
  carrying the exact snippet to add by hand (accepted per OQ4, SC7).

## Follow-ups

- **`harny mcp add <server>` command** — future work that extends these same files with additional
  servers, building on the merge mechanism established here.
- **TOML parser integration** — if future features need in-place rewrites of TOML tables, may justify
  adding a parser dependency; deferred pending that justification.
