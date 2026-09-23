/**
 * The `Generator` adapter interface — the contract every per-tool generator
 * implements. Interface only; no implementation lives here.
 */
import type { Capability } from '../templates.js';
import type { CostTier, RoleId, ToolId } from '../vocabulary.js';
import type { ConductorPayload, HookPayload, RolePayload } from '../engine.js';

export type WrapperFormat = 'markdown-yaml' | 'toml';

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
   *  TOML table prefix. `mcpServers` for Claude Code, Cursor and Kiro; `servers`
   *  for GitHub Copilot's `.vscode/mcp.json`; `mcp_servers` for Codex, where the
   *  rendered header is `<rootKey>.<serverName>`. */
  readonly rootKey: string;
  /** The server entry's own fields, exactly as this tool expects them — the one
   *  place per-tool shape divergence lives (e.g. Claude Code and VS Code carry
   *  `type: 'http'`; Cursor, Kiro and Codex take a bare `url`). Values are strings
   *  only: the five verified entries need nothing else, and restricting the type
   *  keeps the TOML key/value renderer total over it. */
  readonly entry: Readonly<Record<string, string>>;
}

export interface GeneratedFile {
  /** POSIX-style path relative to the target repo root. Never absolute, never `..`. */
  readonly path: string;
  /** Full file contents, ending in exactly one `\n`. */
  readonly contents: string;
  /** **(NEW — context7-mcp.)** Marks a path harny co-owns with the user and with
   *  other tools, whose `contents` were already computed by extending whatever was
   *  on disk. `planWrites` keeps such a path out of `WritePlan.conflicts`, so a
   *  pre-existing MCP config file never makes the whole run refuse (`G4`).
   *  Deliberately `true | undefined` rather than `boolean`: absent is the default
   *  for every artifact written before this feature, and no call site has to opt
   *  out. */
  readonly merge?: true;
  /** **(NEW — ci-workflow-root.)** Which root `path` is relative to. Absent — the
   *  default for every artifact written before this feature and for every
   *  artifact except one — means the install directory (`targetDir`). The other
   *  member means the enclosing git repository's root, which may be `targetDir`
   *  itself or an ancestor of it, and never anything else (WR-4).
   *
   *  Deliberately a one-member union with `undefined` rather than a two-member
   *  enum with a default, for the same reason `merge` is `true | undefined`
   *  (context7-mcp, MC-7): no existing call site has to opt out, and the
   *  non-default capability is a single greppable token. Exactly one expression
   *  in all of `src/` assigns it (WR-5). */
  readonly root?: 'repo';
}

export interface CapabilityMapping {
  /** Tool-native tool/permission names, deduped, in a stable order. */
  readonly tokens: readonly string[];
  /** Anything the target format cannot express natively — scoped capabilities and
   *  unknown tokens. MUST be surfaced in the rendered output, never dropped. */
  readonly notes: readonly string[];
}

/**
 * The contract every per-tool generator implements. Deliberately sufficient for all
 * five known targets: `.claude/agents/<role>.md`, `.cursor/agents/<role>.md`,
 * `.kiro/agents/<role>.md`, `.github/agents/<role>.agent.md` (markdown-yaml), and
 * `.codex/agents/<role>.toml` (toml).
 */
export interface Generator {
  readonly id: ToolId;
  readonly displayName: string;
  /** Target directory for role files, POSIX, relative to the target repo root. */
  readonly agentsDir: string;
  readonly wrapperFormat: WrapperFormat;
  /** Full path for the conductor artifact — deliberately NOT derived from
   *  `agentsDir`, because at least one target places it elsewhere entirely
   *  (Claude Code: `.claude/skills/sdd-conductor/SKILL.md`). */
  readonly conductorPath: string;
  /** **(NEW — templates-skill-library-parity.)** This tool's own skill-discovery
   *  root, POSIX, relative to the target repo root. A fixed per-generator constant:
   *  it never varies with which other tools are selected (D2). Several generators
   *  deliberately share one value — `.agents/skills` is read by Cursor (V9), Codex
   *  (V13) and GitHub Copilot (V10) — which is what `buildSkillFiles`' dedup keys
   *  on. */
  readonly skillsDir: string;
  /** **(NEW — agent-feedback-controls.)** Where this tool reads its hook config,
   *  POSIX, relative to the target repo root. A fixed per-generator constant (V1).
   *  Unlike `skillsDir`, no two generators share a value. */
  readonly hooksPath: string;
  /** **(NEW — ai-sdlc-readiness.)** This tool's own root instruction file, POSIX,
   *  relative to the target repo root — the file it reads for project-wide guidance
   *  before any task. `undefined` means this tool's root guidance file *is* the
   *  cross-tool `AGENTS.md`, so it needs no entry of its own.
   *
   *  A declarative member, not a method: a fixed per-tool path fact, exactly like
   *  `skillsDir` (ADR 0011) and `hooksPath` — nothing is rendered, so the `renderHook`
   *  departure (ADR 0014) does not apply. Generators may share a value or share
   *  `undefined`, which is what `dedupePreserveOrder` keys on. */
  readonly guidancePath: string | undefined;

  /** **(NEW — context7-mcp.)** This tool's MCP configuration file and the shape it
   *  expects a server entry in. `undefined` means this tool has no MCP
   *  configuration surface harny writes. Required-but-possibly-`undefined`, exactly
   *  like `guidancePath`: omitting the member is a `tsc` error, so a sixth
   *  generator cannot skip the question (`SC13`). All five shipped generators
   *  declare a real value; none is `undefined` today. */
  readonly mcpConfig: McpConfig | undefined;

  /** File name only. Accommodates `<role>.md`, `<role>.agent.md`, and `<role>.toml`. */
  roleFileName(roleId: RoleId): string;

  /** cost_tier → this tool's own model id. `override`, when present, is returned
   *  verbatim: the user's literal model id always wins over the tier mapping. */
  mapModel(tier: CostTier, override?: string): string;

  mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping;

  renderRole(payload: RolePayload): GeneratedFile;
  renderConductor(payload: ConductorPayload): GeneratedFile;

  /** **(NEW — agent-feedback-controls.)** Renders this tool's native hook config.
   *  Returns `undefined` when the tool's hook surface is unavailable for the
   *  resolved profile, in which case the generator contributes no hook artifact
   *  (never an empty or placeholder file at a path the tool would read).
   *
   *  A method, not a declarative member — a conscious departure from ADR 0011
   *  (see contract.md § Interfaces): hook configs vary structurally per tool
   *  (nested vs. flat, `command` vs. `bash`, …), which is exactly what
   *  `renderRole`/`renderConductor` already exist for. */
  renderHook(payload: HookPayload): GeneratedFile | undefined;
}
