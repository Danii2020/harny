# Contract: context7-mcp

> Traceability: every item below cites the `intent.md` goal (`G1`–`G9`) it serves.
> Amendments to shipped current-truth statements are restated here as first-class
> guarantees so `harny-sync` archive mode carries them into `specs/current/`.

## Interfaces

### Public API — `src/generators/types.ts` (MODIFY)

```ts
/** **(NEW — context7-mcp.)** Which serializer a tool's MCP configuration file uses.
 *  Exactly the two formats the five verified targets need; deliberately not an open
 *  string, so a sixth generator cannot invent a third format without amending this
 *  union and the merger that switches on it. */
export type McpConfigFormat = 'json' | 'toml';

/**
 * **(NEW — context7-mcp.)** Everything that varies per tool about where and how its
 * MCP server configuration is expressed. A fixed per-generator constant known at
 * module load with no payload input — a declarative member in the `skillsDir`
 * (ADR 0011) / `guidancePath` (ADR 0025) lineage, deliberately NOT a `renderMcp*`
 * method in the `renderHook` lineage (ADR 0014): nothing here is rendered by the
 * generator. Every byte of serialization happens in `src/mcp.ts` through the two
 * shared modules (`TG-5`).
 */
export interface McpConfig {
  /** POSIX path, relative to the target repo root. Never absolute, never `..`,
   *  never a user-home path (`G3`, `SC19`). */
  readonly path: string;
  readonly format: McpConfigFormat;
  /** The container the server entry lives under: the JSON root object key, or the
   *  TOML table prefix. `'mcpServers'` for Claude Code, Cursor and Kiro;
   *  `'servers'` for GitHub Copilot's `.vscode/mcp.json`; `'mcp_servers'` for
   *  Codex, where the rendered header is `[<rootKey>.<serverName>]`. */
  readonly rootKey: string;
  /** The server entry's own fields, exactly as this tool expects them — the one
   *  place per-tool shape divergence lives (e.g. Claude Code and VS Code carry
   *  `type: 'http'`; Cursor, Kiro and Codex take a bare `url`). Values are strings
   *  only: the five verified entries need nothing else, and restricting the type
   *  keeps `renderTomlKeyValues` total over it. */
  readonly entry: Readonly<Record<string, string>>;
}

export interface GeneratedFile {
  readonly path: string;
  readonly contents: string;
  /** **(NEW — context7-mcp.)** Marks a path harny co-owns with the user and with
   *  other tools, whose `contents` were already computed by extending whatever was
   *  on disk. `planWrites` keeps such a path out of `WritePlan.conflicts`, so a
   *  pre-existing MCP config file never makes the whole run refuse (`G4`).
   *  Deliberately `true | undefined` rather than `boolean`: absent is the default
   *  for every artifact written before this feature, and no call site has to opt
   *  out. */
  readonly merge?: true;
}

export interface Generator {
  // ... all existing members unchanged ...
  /** **(NEW — context7-mcp.)** This tool's MCP configuration file and the shape it
   *  expects a server entry in. `undefined` means this tool has no MCP
   *  configuration surface harny writes. Required-but-possibly-`undefined`, exactly
   *  like `guidancePath`: omitting the member is a `tsc` error, so a sixth
   *  generator cannot skip the question (`SC13`). All five shipped generators
   *  declare a real value; none is `undefined` today. */
  readonly mcpConfig: McpConfig | undefined;
}
```

### Public API — `src/mcp.ts` (CREATE)

```ts
/**
 * The Context7 MCP default wiring: the single source of the server's identity and
 * endpoint (`S5`, `SC15`), and the merge algorithm that extends a target repo's
 * existing MCP configuration without destroying it (`G3`).
 *
 * Tool-neutral by construction — it lives beside `src/feedback.ts` and
 * `src/doctor.ts`, outside `src/generators/`, and derives its work from the
 * *resolved* generators it is handed, never from a hard-coded tool list.
 */

/** The server's key in every tool's configuration, and the `<name>` half of the
 *  `mcp__<server>__<tool>` tokens `src/generators/claude-code.ts:30` already emits.
 *  Literalled exactly once in `src/` (`SC15`). */
export const MCP_SERVER_NAME = 'context7';

/** Context7's hosted, unauthenticated streamable-HTTP endpoint. Literalled exactly
 *  once in `src/` (`SC15`). Verified 2026-09-15 — see § "Verified per-tool MCP
 *  facts". No credential, credential placeholder, or env-var reference is ever
 *  written alongside it (`G9`, `SC11`). */
export const CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp';

/** The result of reconciling one tool's desired `context7` entry with whatever was
 *  already on disk at that tool's MCP config path. Exhaustive and closed: every
 *  path through the merger lands on exactly one of these three. */
export type McpMergeOutcome =
  /** Write `contents` at the config's `path`, as a merge-marked `GeneratedFile`. */
  | { readonly kind: 'written'; readonly contents: string }
  /** A `context7` entry is already present. The file is left byte-identical and no
   *  `GeneratedFile` is produced; `warning` names the path (`G3`, `SC6`). */
  | { readonly kind: 'unchanged'; readonly warning: string }
  /** The existing file cannot be safely extended (unparseable JSON, or JSON whose
   *  root or `rootKey` is not an object). Nothing is written; `warning` names the
   *  path and carries the exact snippet to add by hand (`G3`, `SC7`). */
  | { readonly kind: 'skipped'; readonly warning: string };

export interface McpMergeInput {
  readonly config: McpConfig;
  /** Current file contents, or `undefined` when the path does not exist. A file
   *  that exists but holds only whitespace is treated as `undefined`. */
  readonly existing: string | undefined;
  /** `--force`. Replaces an existing `context7` entry in a JSON config; has no
   *  effect on an existing Codex `[mcp_servers.context7]` table (§ Behavior
   *  Guarantees, MC-9). */
  readonly force: boolean;
}

/** JSON path (Claude Code, Cursor, Kiro, GitHub Copilot). Pure: no filesystem
 *  access, no `Date`, no `process.env`. Uses `JSON.parse`/`renderJson` only — both
 *  language builtins, not a dependency (`S4`). */
export function mergeJsonMcpConfig(input: McpMergeInput): McpMergeOutcome;

/** TOML path (Codex). Pure, same constraints. Detects an existing
 *  `[mcp_servers.context7]` table by line-start header scan, never by parsing —
 *  this codebase has no TOML parser and this feature adds no dependency (`S4`). */
export function mergeTomlMcpConfig(input: McpMergeInput): McpMergeOutcome;

export interface McpBuildOptions {
  /** Absolute path to the repo being scaffolded, for reading existing configs. */
  readonly targetDir: string;
  readonly force: boolean;
}

export interface McpBuildResult {
  /** Merge-marked files to add to the write plan, in `generators` order. */
  readonly files: readonly GeneratedFile[];
  /** One message per `unchanged`/`skipped` outcome, in `generators` order.
   *  `runInit` forwards each to `io.warn`; this module never calls `io` itself,
   *  matching `buildDoctorFiles`' shape. */
  readonly warnings: readonly string[];
}

/** Composition entry point, called from `runInit` step 11. The only impure
 *  function in this module: it reads (never writes) each resolved generator's MCP
 *  config path. A generator whose `mcpConfig` is `undefined` contributes nothing. */
export async function buildMcpFiles(
  generators: readonly Generator[],
  options: McpBuildOptions,
): Promise<McpBuildResult>;
```

### Public API — `src/generators/toml.ts` (MODIFY)

```ts
/** **(NEW — context7-mcp.)** Renders a TOML table: a `[header]` line followed by
 *  one `key = value` line per field, via the existing `renderTomlKeyValues`. The
 *  only place a `[` table-header literal exists in this codebase (`TG-5`,
 *  invariant 1, `SC14`) — `src/mcp.ts` composes tables, it never writes brackets.
 *
 *  `header` must be a dotted sequence of TOML bare keys
 *  (`/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/`); anything else throws
 *  `HarnessError('TEMPLATE')` naming the header, rather than silently emitting a
 *  header that would need quoting. This mirrors `tomlMultilineLiteral`'s existing
 *  "throw rather than silently switch forms" discipline (`TG-7`). */
export function renderTomlTable(header: string, fields: readonly TomlKeyValue[]): string;
```

### Public API — `src/writer.ts` (MODIFY)

```ts
/** UNCHANGED signature. Amended behavior (`CLI-5` amendment, `G4`): a file whose
 *  `merge` flag is set is never added to `conflicts`, even when it exists on disk.
 *  `assertContained` still runs for every file, merge-marked or not. Every
 *  non-merge path keeps today's behavior byte for byte. */
export function planWrites(
  files: readonly GeneratedFile[],
  targetDir: string,
): Promise<WritePlan>;
```

`applyWrites` is **unchanged**: it already writes `plan.files` in order and throws
`HarnessError('CONFLICT')` only when `plan.conflicts` is non-empty, which merge-marked
paths never populate.

### Public API — `src/init.ts` (MODIFY)

`runInit`'s exported signature, `InitOptions`, and `InitResult` are **unchanged**.
Step 11 is widened — the fourth such widening, after skills, hooks + CI, and
doctor + shared probes — and remains part of the fixed 13-step sequence (`CLI-1`):

```ts
  // (NEW — context7-mcp.) The default Context7 MCP server configuration, one file
  // per resolved generator that declares an `mcpConfig` — joined into this same
  // render step, never a fourteenth step (CLI-1). The first artifact family that
  // READS from targetDir while building: each file's contents extend whatever is
  // already there (G3), which is why this call is awaited and why its outputs are
  // merge-marked (G4).
  const mcp = await buildMcpFiles(resolvedGenerators, { targetDir, force: options.force });
  files.push(...mcp.files);
  for (const warning of mcp.warnings) {
    io.warn(warning);
  }
```

### Data Models

```ts
// src/generators/claude-code.ts — appended to the exported generator object.
// Verified 2026-09-15; see § "Verified per-tool MCP facts".
  mcpConfig: {
    path: '.mcp.json',
    format: 'json',
    rootKey: 'mcpServers',
    entry: { type: 'http', url: CONTEXT7_MCP_URL },
  },

// src/generators/cursor.ts
  mcpConfig: {
    path: '.cursor/mcp.json',
    format: 'json',
    rootKey: 'mcpServers',
    entry: { url: CONTEXT7_MCP_URL },
  },

// src/generators/github-copilot.ts — the one root key that differs from the other
// four, and the single most important fact to keep under test (SC17).
  mcpConfig: {
    path: '.vscode/mcp.json',
    format: 'json',
    rootKey: 'servers',
    entry: { type: 'http', url: CONTEXT7_MCP_URL },
  },

// src/generators/kiro.ts
  mcpConfig: {
    path: '.kiro/settings/mcp.json',
    format: 'json',
    rootKey: 'mcpServers',
    entry: { url: CONTEXT7_MCP_URL },
  },

// src/generators/codex.ts — project scope, never ~/.codex/config.toml (SC19).
  mcpConfig: {
    path: '.codex/config.toml',
    format: 'toml',
    rootKey: 'mcp_servers',
    entry: { url: CONTEXT7_MCP_URL },
  },
```

Rendered output, fresh-file case, Claude Code (`renderJson`, 2-space, one trailing `\n`):

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

Rendered output, fresh-file case, Codex (`renderTomlComments` + `renderTomlTable`):

```toml
# generated by harny: the default Context7 MCP server backing the docs-lookup capability
# harny writes this entry only; approving the server and its tool calls stays Codex's own prompt
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
```

The four JSON files carry **no** provenance comment: strict JSON has no comment syntax,
and emitting JSONC would risk a file the tool's own parser rejects. This matches the
existing precedent — `.claude/settings.json`, `.kiro/hooks/harny-feedback.json` and
`hooks.json` carry no provenance either. Provenance for the JSON files lives in
`templates/mcp/README.md` and the repo `README.md` instead (`SC20`).

### State Changes

| Path | Owner | Write model |
|---|---|---|
| `.mcp.json` | co-owned (user + harny) | merge-marked; JSON merge |
| `.cursor/mcp.json` | co-owned | merge-marked; JSON merge |
| `.vscode/mcp.json` | co-owned (also every other VS Code MCP user) | merge-marked; JSON merge |
| `.kiro/settings/mcp.json` | co-owned | merge-marked; JSON merge |
| `.codex/config.toml` | **user-owned**, not an MCP-only file | merge-marked; append-if-absent, never rewritten |

Unchanged: no `.claude/settings.json` key is added or modified (`SC12`); no file under
`templates/` is ever written to (`cli-init.md` invariant 1); nothing is written outside
`targetDir` (`SC19`); `--dry-run` writes nothing (`SC10`).

New file under `templates/`: `templates/mcp/README.md` (documentation only — not
scaffolded into target repos, packaged only; `CLI-10` count 30 → 31, `SC20`).

## Behavior Guarantees

1. **MC-1 — Out-of-the-box wiring.** (`G1`, `SC1`, `SC2`) For every resolved generator
   whose `mcpConfig` is defined, `runInit` in a repo with no file at that path writes
   that file containing a `context7` server entry whose `url` is `CONTEXT7_MCP_URL`,
   under that tool's own `rootKey`.

2. **MC-2 — All five, or a compile error.** (`G2`, `SC13`) `mcpConfig` is a required
   (not optional) member of `Generator`. All five shipped generators declare a
   non-`undefined` value matching § "Verified per-tool MCP facts" exactly.

3. **MC-3 — Resolved generators only.** (`SC3`) MCP files are derived from the
   `resolvedGenerators` list, so a tool the user did not select, and a selected tool with
   no generator (`CLI-7`'s skip path), each contribute zero MCP files.

4. **MC-4 — Nothing else in the file is touched.** (`G3`, `SC4`, `SC5`) On the JSON
   path, every top-level key other than `rootKey` survives with its value and relative
   order intact, and every server under `rootKey` other than `context7` survives
   likewise. On the TOML path, the pre-existing file's bytes appear unmodified as a
   prefix of the result.

5. **MC-5 — An existing `context7` entry is never silently replaced.** (`G3`, `G5`,
   `SC6`) When the target already contains a `context7` entry, the outcome is
   `unchanged`: no `GeneratedFile` is produced, the file keeps its exact bytes, and
   exactly one warning naming the path is emitted.

6. **MC-6 — A file we cannot parse is never mangled.** (`G3`, `SC7`) When the existing
   JSON does not parse, or parses to a non-object, or has a `rootKey` whose value is not
   an object, the outcome is `skipped`: nothing is written to that path, one warning
   naming the path and carrying the exact snippet is emitted, and **the run still
   succeeds**, writing every other artifact. `skipped` is never a `HarnessError` —
   `runInit`'s exit code is unaffected (`S2`).

7. **MC-7 — `CLI-5` is preserved everywhere except the merge paths.** (`G4`, `SC8`) A
   merge-marked path never enters `WritePlan.conflicts`. Any other pre-existing planned
   path still raises `HarnessError('CONFLICT')` (exit 3) without `--force`, and
   `--dry-run` still writes nothing at all (`SC10`).

8. **MC-8 — Idempotent.** (`G5`, `SC9`) Running `runInit` twice over the same target
   directory leaves every MCP config file byte-identical between run 1 and run 2: run 2
   finds the `context7` entry present and takes the `unchanged` branch on all five.

9. **MC-9 — `--force` semantics, stated including the asymmetry.** With `--force`, the
   JSON path replaces the value at `<rootKey>.context7` and nothing else. The TOML path
   is **unaffected by `--force`**: an existing `[mcp_servers.context7]` table is never
   rewritten, because removing it safely needs a TOML parser this feature deliberately
   does not add (`S4`; `intent.md` § "The write model", OQ3).

10. **MC-10 — No credential, ever.** (`G9`, `SC11`) No generated MCP artifact contains
    `Authorization`, `headers`, `bearer_token_env_var`, `http_headers`,
    `env_http_headers`, `env`, an `${…}` expansion, or the string `CONTEXT7_API_KEY`;
    no code path under `src/` reads `process.env.CONTEXT7_API_KEY`. The generated
    configuration uses the anonymous endpoint.

11. **MC-11 — No permission widening.** (`G6`, `SC12`, `TG-8` lineage) No generated MCP
    artifact contains `enabledMcpjsonServers`, `disabledMcpjsonServers`, `autoApprove`,
    `disabledTools`, `trust_level`, or `[projects]`. `.claude/settings.json` continues to
    carry exactly the two hook registrations `agent-feedback-controls` put there and is
    not read or written by this feature.

12. **MC-12 — Shared serializers only.** (`G7`, `SC14`, `TG-5`) No JSON or TOML syntax
    literal for MCP output exists outside `src/generators/json.ts` and
    `src/generators/toml.ts`. In particular no generator file, and not `src/mcp.ts`,
    contains a `[mcp_servers.` literal or a hand-built JSON string; `src/mcp.ts` builds
    plain objects and a dotted header string and delegates.

13. **MC-13 — Single source of the external facts.** (`G7`, `SC15`, `S5`)
    `MCP_SERVER_NAME` and `CONTEXT7_MCP_URL` each appear as a literal exactly once in
    `src/`, in `src/mcp.ts`, and are imported at every other site including all five
    generators.

14. **MC-14 — Determinism, containment, trailing newline.** (`SC19`, `CLI-4` amendment,
    `S3`) Given the same config, the same templates, and the same pre-existing contents
    at the merge-owned paths, two runs produce byte-identical output. Every MCP path is
    relative and resolves inside `targetDir`; every written MCP artifact ends in exactly
    one `\n`. `mergeJsonMcpConfig` and `mergeTomlMcpConfig` are pure — no `Date`, no
    `process.env`, no filesystem access; only `buildMcpFiles` reads, and it never writes.

15. **MC-15 — The stale claim is retracted in the same change.** (`G8`, `SC16`)
    `src/generators/kiro.ts`'s `DOCS_LOOKUP_NOTE` no longer contains "harny does not
    write MCP configuration". Its replacement names `.kiro/settings/mcp.json` as the
    file harny now writes and states that Kiro still prompts per tool call because harny
    does not write `autoApprove` (`MC-11`). It stays a `CapabilityMapping.notes` entry
    and still reaches rendered output (`CLI-9`).

16. **MC-16 — Empty is absent.** A config file that exists but contains only whitespace
    is treated exactly like a missing file: the fresh-file content is written. This
    keeps `MC-8` true after a user truncates a config, and avoids emitting a file whose
    only content is a leading blank line.

17. **MC-17 — Warning order is deterministic.** Warnings are emitted in
    `resolvedGenerators` order (which is `config.tools` order), one per non-`written`
    outcome, so two runs over identical inputs produce an identical warning stream.

### Amendments to shipped current-truth statements

| Statement | Today | Amended form |
|---|---|---|
| `TG-1` | `Generator` members: `id … guidancePath` | adds `mcpConfig`, declarative (ADR 0011/0025 lineage, not ADR 0014) |
| `TG-10` | 30 tool artifacts + 5 hooks + runner + CI + schema + `harness.json` | adds **one MCP config artifact per resolved generator declaring `mcpConfig`** — 5 more with all five tools, minus any path taking the `unchanged`/`skipped` branch |
| `CLI-1` | 13 steps; step 11 renders roles/conductor/shared/skills/hooks/doctor | unchanged at 13 steps; step 11 also builds MCP configs, and is now the one step that reads from `targetDir` |
| `CLI-4` | "two runs with the same config and templates" | "…the same config, the same templates, **and the same pre-existing contents at the merge-owned paths**"; containment and trailing-newline clauses unchanged |
| `CLI-5` | write nothing if any planned path exists, unless `--force` | unchanged, **except** that merge-marked paths never enter `conflicts`; `--dry-run` clause unchanged |
| `CLI-10` | tarball holds all **thirty** `templates/**` files | **thirty-one** (`templates/mcp/README.md`) |

`TG-3`, `TG-4`, `TG-5`, `TG-6`, `TG-7`, `TG-8`, `TG-9`, `TG-11`, `TG-12`, `CLI-2`,
`CLI-3`, `CLI-6`, `CLI-7`, `CLI-8`, `CLI-9`, `CLI-11` and `PR-4` are **unchanged** and
must still hold. `tool-generators.md` invariants 1–3 and `cli-init.md` invariants 1–3
are unchanged; invariant 3 of `cli-init.md` (dependency set is exhaustive) is
re-affirmed below under § Dependencies.

### Verified per-tool MCP facts

All retrieved **2026-09-15**. These carry the same re-verification caveat already on
record as `AL-30` (Cursor/Kiro/Copilot) and `CG-1`/`O4` (Codex): verified against
first-party documentation, never against a live tool install. Cross-checked against
`plan.md:140–146`, which independently lists the same five files and root keys.

| Tool | Config file (project scope) | Root key | Entry shape | Approval gate harny leaves in place |
|---|---|---|---|---|
| Claude Code | `.mcp.json` (repo root) | `mcpServers` | `{"type":"http","url":…}` | Workspace-trust + per-project-server approval prompt on first interactive use. `claude -p`, Agent SDK and cloud sessions load without prompting. |
| Cursor | `.cursor/mcp.json` | `mcpServers` | `{"url":…}` (no `type` field) | Cursor's own server-enable step. See reservation `R-Cursor`. |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` | **`servers`** | `{"type":"http","url":…}` | VS Code's own MCP server trust prompt. |
| Kiro | `.kiro/settings/mcp.json` (workspace; `~/.kiro/settings/mcp.json` is the user file and is **not** written) | `mcpServers` | `{"url":…}` | Per-tool-call approval, because harny does not write `autoApprove` (`MC-11`). Workspace config takes precedence over user config. |
| Codex CLI | `.codex/config.toml` (project; `~/.codex/config.toml` is the user file and is **not** written) | `mcp_servers` → `[mcp_servers.context7]` | `url = "…"` | Codex's own project-trust decision: project `.codex/` layers load only for a project the user has trusted. When trusted, project config takes precedence over user config. |

**Context7 endpoint and authentication.** The hosted streamable-HTTP endpoint is
`https://mcp.context7.com/mcp`. An API key is **optional**: without one the client
connects anonymously and shares the anonymous rate limits. When used, it travels as an
`Authorization: Bearer <key>` header, conventionally sourced from `CONTEXT7_API_KEY`.
harny writes the anonymous form and never the key (`MC-10`).

**Sources.** Context7 client documentation (`docs/resources/all-clients.mdx`) and
Context7's Copilot CLI plugin README, both retrieved through the Context7 MCP server on
2026-09-15 — the `docs-lookup` mechanism this feature exists to enable, used per `PR-4`
rather than relying on memory. Claude Code MCP documentation
(`https://code.claude.com/docs/en/mcp`) for `.mcp.json`, `${VAR}` expansion, workspace
trust and `enabledMcpjsonServers`. VS Code MCP configuration documentation for the
`servers` root key. Kiro MCP configuration documentation
(`https://kiro.dev/docs/mcp/configuration/`) for workspace/user paths, precedence,
remote `url` support and `autoApprove`. Codex configuration and MCP documentation for
`[mcp_servers.<name>]`, the streamable-HTTP keys, project-trust gating, and
`codex mcp add`'s user-global write target.

**Why no per-role artifact changes are needed.** Claude Code subagents do not inherit
MCP tools automatically — they need explicit `mcp__<server>__<tool>` names in `tools:`,
which `src/generators/claude-code.ts:30` already emits. Cursor and Codex agent files have
no tool-allowlist field at all (`TG-6`, `TG-8`), so any configured server reaches every
agent. `github-copilot.ts` deliberately leaves `tools:` unset because Copilot grants all
available tools. Kiro's `@context7` category tag is already emitted by
`src/generators/kiro.ts:33`. The only role-facing edit in this feature is `MC-15`'s note
text.

**Carried reservations.** `R-Cursor` (a low-confidence secondary claim that MCP support
in some Cursor installs is behind a settings toggle defaulting off; Cursor's own docs
were unreachable during exploration) and `R-Codex` (open upstream issue
`openai/codex#13025`: Codex Desktop reportedly ignores project `.codex/config.toml` MCP
servers and loads only the global file). Both are `AL-30`-class: the generated file is
correct, but a tool that never reads it fails at exit code 0. Documented in
`templates/mcp/README.md`; not blocking.

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| MCP config path does not exist | Fresh file written, merge-marked | Server configured; nothing to notice |
| Path exists, JSON parses, no `context7` entry | Entry inserted under `rootKey`; all other keys preserved (`MC-4`) | Their servers intact, Context7 added |
| Path exists, JSON parses, `context7` already present, no `--force` | `unchanged`; file byte-identical; one `io.warn` (`MC-5`) | Warned that their existing entry was kept |
| Same, with `--force` | That one entry replaced; all others preserved (`MC-9`) | Entry reset to harny's default |
| Path exists, `JSON.parse` throws (e.g. JSONC comments) | `skipped`; nothing written; one `io.warn` with the exact snippet (`MC-6`) | Run still succeeds; told exactly what to paste |
| Path exists, JSON parses to a non-object, or `rootKey` is a non-object | `skipped`, same as above (`MC-6`) | Same |
| Path exists, whitespace only | Treated as absent; fresh file written (`MC-16`) | Server configured |
| `.codex/config.toml` exists without `[mcp_servers.context7]` | Table appended after a blank line; prior bytes untouched (`MC-4`) | Their Codex settings intact, Context7 added |
| `.codex/config.toml` already has `[mcp_servers.context7]` (with or without `--force`) | `unchanged`; one `io.warn` (`MC-9`) | Told their entry was kept and why `--force` did not apply |
| A *non*-MCP planned path already exists, no `--force` | `HarnessError('CONFLICT')`, exit 3, nothing written (`MC-7`) | Unchanged from today |
| `--dry-run` | Nothing written to any path; MCP paths that would be written appear in the planned list (`SC10`) | Unchanged from today |
| A generator declares an `mcpConfig.path` that is absolute or escapes `targetDir` | `assertContained` throws a plain `Error` — a generator bug, not a user-facing `HarnessError` (`writer.ts:19–29`, unchanged) | Bug report, exit 1 |
| `renderTomlTable` receives a header needing quoting | `HarnessError('TEMPLATE')`, exit 5, naming the header, before any write | Template/packaging bug report |
| Filesystem error while reading an existing config (e.g. EACCES) | Treated as `skipped` with a warning naming the path and the reason; never a thrown error, never silently treated as "absent" (which would overwrite an unreadable file) | Run succeeds; told to configure that one file by hand |
| Filesystem error while writing | Existing `applyWrites` disclosure path, unchanged: plain `Error` naming already-written paths, exit 1 | Unchanged from today |

## Dependencies

**No new runtime or dev dependency** (`S4`; `cli-init.md` invariant 3). The pinned set
stays exactly `commander@15.0.0`, `@clack/prompts@1.7.0` (runtime) and
`typescript@7.0.2`, `vitest@4.1.10`, `@types/node@26.1.2` (dev).

Internal, runtime:
- `src/mcp.ts` → `src/generators/json.ts` (`renderJson`), `src/generators/toml.ts`
  (`renderTomlComments`, `renderTomlKeyValues`, `renderTomlTable`, `tomlBasicString`),
  `src/errors.ts`, `node:fs/promises`, `node:path`.
- `src/generators/{claude-code,cursor,kiro,github-copilot,codex}.ts` → `src/mcp.ts`
  (`CONTEXT7_MCP_URL` only), mirroring how each already imports `FEEDBACK_RUNNER_PATH`
  from `src/feedback.ts`.
- `src/init.ts` → `src/mcp.ts` (`buildMcpFiles`).

Internal, type-only (erased; irrelevant to `CLI-11`'s cycle rule):
- `src/mcp.ts` → `src/generators/types.ts` (`Generator`, `McpConfig`, `GeneratedFile`).

No cycle is introduced: `src/mcp.ts` imports the two serializer modules, never a
generator implementation; `src/generators/index.ts` is not imported by `src/mcp.ts`
(`CLI-11`, `SC18`).

External (not a package dependency — a runtime network endpoint reached by the *agent
tool*, never by harny): `https://mcp.context7.com/mcp`. `npx harny init` makes no network
request; the default test run stays offline (`S6`).

## Integration Points

- **`src/init.ts` step 11** — one `await buildMcpFiles(...)` call plus a warning loop,
  alongside the existing `buildSkillFiles` / `renderHook` / `buildDoctorFiles` /
  `buildRuntimeSharedFiles` calls. The 13-step sequence and `InitResult` shape are
  unchanged; the new paths flow into `InitResult.planned` / `.written` like any other.
- **`src/writer.ts`** — one condition in `planWrites`' conflict loop. `applyWrites`,
  `assertContained` and `WritePlan` are untouched.
- **`src/generators/types.ts`** — two additions (`McpConfig`, the `mcpConfig` member) and
  one optional field on `GeneratedFile`.
- **All five generator files** — one declarative member each; `kiro.ts` additionally gets
  its `DOCS_LOOKUP_NOTE` rewritten (`MC-15`).
- **`src/generators/toml.ts`** — one new exported helper.
- **`src/doctor.ts`** — untouched. No readiness check is added for the MCP files
  (`intent.md` § Non-Goals).
- **`src/feedback.ts`, `src/engine.ts`, `src/config.ts`, `src/cli.ts`,
  `src/prompts.ts`, `src/vocabulary.ts`** — untouched. No new flag, no new prompt, no new
  config key, no new vocabulary member.
- **`templates/`** — one new documentation file, `templates/mcp/README.md`, written
  tool-neutrally under `S7`: it names the behavior ("the harness writes the default
  docs-lookup MCP server into each selected tool's own configuration file") before naming
  any tool, records the five-row fact table, states the trust posture (`G6`), documents
  the optional `CONTEXT7_API_KEY` upgrade as a manual step (`G9`), and records `R-Cursor`
  and `R-Codex` with their manual workarounds. It is packaged, not scaffolded
  (`CLI-10`: 30 → 31).
- **Downstream docs (documentation role, post-audit)** — `README.md` § "Generated files
  per `init` run", `AGENTS.md`, `CHANGELOG.md`, and the `plan.md:138` "future scope"
  paragraph, whose first clause this feature discharges.
