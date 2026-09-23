# The canonical Context7 MCP wiring

This directory holds the canonical, tool-neutral source describing harny's default
wiring for the `docs-lookup` capability: on every `npx harny init` run, the harness
writes the default Context7 MCP server into each selected tool's own configuration
file, so the tool-native tokens two generators already emit (Claude Code's
`mcp__context7__resolve-library-id` / `mcp__context7__query-docs`, Kiro's
`@context7`) resolve to a real, connected server instead of an artifact pointing at
nothing.

The behavior below is what `src/mcp.ts` implements. It is stated first as behavior,
tool-neutral throughout, with each tool named only afterward as an attributed
example of how that behavior lands on its own configuration surface (`AGENTS.md`
S7 — no single tool's mechanic is the only possibility described here). This file is
packaged with harny, not scaffolded into a target repo — nothing under `templates/`
is ever written to a project.

## The behavior

1. **One server, written automatically, no prompt.** `docs-lookup`'s default backing
   server, Context7, is not optional and not user-chosen: every `init` run writes it
   for every tool selected that has a native MCP configuration surface. There is no
   flag and no interactive question — the goal is that `docs-lookup` simply works
   after `init`, the same way every other capability's tokens already do.
2. **Each tool gets its own file, in its own native shape.** harny writes to
   whichever configuration file a tool itself already reads for MCP servers — never
   a harny-specific file, and never the same file for two tools that do not already
   share one. The five files, their root keys and their entry shapes are fixed facts
   verified against each tool's own documentation (see the table below); a change to
   any of them is a contract amendment, not a generator's local choice.
3. **A file harny does not wholly own is extended, never replaced.** Every one of
   these five files is co-owned with the user and, for VS Code's file in particular,
   with every other MCP server the user or team already configured there. harny
   reads what is already at the path, adds exactly one server entry under that
   tool's own root key, and writes the result back — every other key, every other
   server, and (for the one file that is not MCP-only) every unrelated setting
   survives untouched. A file harny cannot safely extend — one whose existing
   contents do not parse, for instance a JSON file edited to add comments — is left
   **byte-identical** and reported by name, never guessed at and never mangled.
4. **Re-running `init` is always safe, and converges.** A file already holding
   harny's Context7 entry is left exactly as it is, one time, with a note explaining
   why nothing changed. A file that does not yet exist, or exists but holds only
   whitespace, is written fresh. Running `init` any number of times over an
   unmodified target produces byte-identical output every time — no duplicated
   entry, no duplicated table, no accumulating whitespace.
5. **Config file only — the tool's own approval prompt is still the gate.** harny
   writes the server entry and stops there. It never marks the server as trusted,
   never pre-approves its tools, and never touches any other approve/trust
   mechanism a tool exposes. The very first time an agent actually calls a Context7
   tool, that tool's own native first-use prompt is what a human sees and answers —
   exactly as if the human had configured the server by hand. harny narrows nothing
   and widens nothing (`AGENTS.md` TG-8).
6. **No credential is ever written.** The configuration harny writes points at
   Context7's OAuth-variant endpoint, which negotiates OAuth 2.0 with clients that
   implement the MCP authorization specification; harny itself never reads an
   API-key environment variable and never writes one — not the key itself, not a
   placeholder, and not an environment-variable reference — into a file that gets
   committed to the repository. If a client performs the OAuth handshake, that
   exchange is entirely between the client and Context7 — harny neither stores nor
   mediates any token. See "Using an API key" below for the non-OAuth endpoint's own
   upgrade path, which stays entirely the human's own manual step.

## The five files

All facts below were verified against each tool's own first-party documentation on
2026-09-15, the same standard this repo's other per-tool fact tables (`AL-30`,
`CG-1`/`O4`) are held to — verified against documentation, not against a live tool
install, and carried forward as an open reservation where that gap matters (see
"Known gaps" below).

| Tool | Config file (project scope) | Root key | Approval gate harny leaves in place |
|---|---|---|---|
| Claude Code | `.mcp.json` (repo root) | `mcpServers` | Workspace-trust and per-project-server approval prompt on first interactive use. |
| Cursor | `.cursor/mcp.json` | `mcpServers` | Cursor's own server-enable step. |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` | `servers` | VS Code's own MCP server trust prompt. |
| Kiro | `.kiro/settings/mcp.json` (workspace; the user file at `~/.kiro/settings/mcp.json` is never written) | `mcpServers` | Per-tool-call approval, because harny does not write `autoApprove`. Workspace config takes precedence over the user file. |
| Codex CLI | `.codex/config.toml` (project; the user file at `~/.codex/config.toml` is never written) | `mcp_servers` | Codex's own project-trust decision — project `.codex/` layers load only once the user has trusted that project, and then take precedence over the user file. |

Every entry points at Context7's hosted streamable-HTTP endpoint, OAuth variant:
`https://mcp.context7.com/mcp/oauth`. harny writes this endpoint for every tool — a
deliberate departure from Context7's own per-client examples, most of which still
show the non-OAuth endpoint — because the non-OAuth endpoint was observed not to
work correctly in practice.

## Using an API key

The endpoint harny writes handles authentication through its own OAuth 2.0
handshake, negotiated by a client that implements the MCP authorization
specification — there is no API key to configure on that path. A client that does
not implement that specification, or a user who prefers the older anonymous flow,
can instead point the tool's own MCP entry at the non-OAuth endpoint by hand: that
endpoint works fully anonymously — no signup, no key, shared anonymous rate limits —
and also accepts an optional API key, sent as an `Authorization: Bearer <key>`
header, for a higher rate limit. harny does not automate either the switch or the
header: add it to the relevant tool's MCP entry by hand, following that tool's own
documentation for supplying a header value (most tools support sourcing it from an
environment variable rather than a literal in a committed file). This is a
deliberate v1 boundary, not an oversight — an unset environment-variable reference
degrades worse than no header at all on at least one of the five tools, so harny
never writes one automatically.

## Known gaps

- **Cursor.** One unverified, low-confidence secondary claim reports that MCP
  support in some Cursor installs sits behind a settings toggle that defaults off.
  If that is accurate on a given install, the generated file is correct but inert
  until that toggle is flipped in Cursor's own settings — the file itself needs no
  change.
- **Codex Desktop.** An open upstream issue (`openai/codex#13025`) reports that
  Codex Desktop ignores project-scope `.codex/config.toml` MCP servers and loads
  only the user's global configuration file. The Codex CLI surface is expected to
  read the project file normally. If Desktop does not pick up the Context7 entry,
  the manual workaround is adding the same `[mcp_servers.context7]` table to the
  global `~/.codex/config.toml` by hand — harny itself never writes outside the
  target repository, so it cannot do this step automatically.
- **Untrusted Codex projects.** If a project has not been trusted in Codex, its
  `.codex/config.toml` is not loaded at all, MCP servers included — trust the
  project first, in Codex itself, and the entry harny already wrote will take
  effect with no further changes needed.

## Committing vs. gitignoring

These five MCP config files are repo-scoped configuration meant to be committed to version control;
however, a repository that gitignores `.vscode/` will not propagate the GitHub Copilot wiring to
teammates, who can either re-run `npx harny init` in their own clone or add the `context7` entry
to `.vscode/mcp.json` by hand using the entry shape documented in the table above.

## What lives here

This directory carries only this document. There is no runtime script here to
scaffold: the mechanism itself lives in `src/mcp.ts`, which reads and extends each
tool's own configuration file directly — there is nothing to copy verbatim into a
generated project the way `templates/hooks/` and `templates/doctor/` copy a runner
script.
