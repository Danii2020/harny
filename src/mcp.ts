/**
 * The Context7 MCP default wiring: the single source of the server's identity and
 * endpoint (`S5`, `SC15`), and the merge algorithm that extends a target repo's
 * existing MCP configuration without destroying it (`G3`).
 *
 * Tool-neutral by construction — it lives beside `src/feedback.ts` and
 * `src/doctor.ts`, outside `src/generators/`, and derives its work from the
 * *resolved* generators it is handed, never from a hard-coded tool list.
 *
 * Facts verified 2026-09-15 against first-party documentation — see
 * `contract.md` § "Verified per-tool MCP facts". Endpoint re-verified 2026-09-22
 * (`dogfood-quick-fixes`, ADR 0029) against Context7's own OAuth documentation. This
 * module owns every literal occurrence of the server's identity and endpoint: every
 * other site, including every generator, imports the two constants below rather than
 * re-typing them (`MC-13`).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderJson } from './generators/json.js';
import { renderTomlComments, renderTomlTable, tomlBasicString } from './generators/toml.js';
import type { TomlKeyValue } from './generators/toml.js';
import type { Generator, GeneratedFile, McpConfig } from './generators/types.js';

/** The server's key in every tool's configuration, and the server-name half of the
 *  tool-token pairs `src/generators/claude-code.ts` already emits. Literalled
 *  exactly once in `src/` (`SC15`). */
export const MCP_SERVER_NAME = 'context7';

/** Context7's hosted streamable-HTTP endpoint, OAuth variant. Literalled exactly once
 *  in `src/` (`SC15`). Context7 serves the same MCP server at two paths: `/mcp`, which
 *  accepts anonymous requests at a shared rate limit or an `Authorization: Bearer
 *  <key>` header, and `/mcp/oauth`, which negotiates OAuth 2.0 with clients
 *  implementing the MCP authorization specification. harny writes `/mcp/oauth` for
 *  every tool — a deliberate departure from Context7's own per-client examples, which
 *  still show `/mcp`, taken because `/mcp` was observed not to work correctly in
 *  practice (see `intent.md` and ADR 0029). Endpoint re-verified 2026-09-22 against
 *  `/upstash/context7` `docs/howto/oauth.mdx` and `docs/resources/all-clients.mdx`.
 *  harny still writes no credential, credential placeholder, or env-var reference
 *  alongside it (`G9`, `SC11`) — the OAuth handshake, if a client performs one, is
 *  entirely between that client and Context7, and harny neither stores nor mediates
 *  any token. */
export const CONTEXT7_MCP_URL = 'https://mcp.context7.com/mcp/oauth';

/** The result of reconciling one tool's desired server entry with whatever was
 *  already on disk at that tool's MCP config path. Exhaustive and closed: every
 *  path through the merger lands on exactly one of these three. */
export type McpMergeOutcome =
  /** Write `contents` at the config's `path`, as a merge-marked `GeneratedFile`. */
  | { readonly kind: 'written'; readonly contents: string }
  /** An entry is already present. The file is left byte-identical and no
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
  /** `--force`. Replaces an existing entry in a JSON config; has no effect on an
   *  existing Codex TOML table (§ MC-9 below). */
  readonly force: boolean;
}

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

/** A file that exists but holds only whitespace is treated exactly like a missing
 *  file (`MC-16`) — checked once, in one place, rather than twice (`S5`). */
function isAbsentOrWhitespace(existing: string | undefined): existing is undefined {
  return existing === undefined || existing.trim().length === 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- Warning-message builders (S5: written once, never re-literalled at a call site) ---

function jsonUnchangedWarning(configPath: string): string {
  return (
    `A "${MCP_SERVER_NAME}" entry already exists at ${configPath}; left unchanged. ` +
    'Re-run with --force to replace that one entry.'
  );
}

function tomlUnchangedWarning(configPath: string): string {
  return (
    `A [${MCP_SERVER_NAME}] table already exists at ${configPath}; left unchanged. ` +
    '--force does not replace an existing Codex MCP table (no TOML parser is added for this); ' +
    'edit the file by hand if you want to change it.'
  );
}

function jsonSkippedWarning(config: McpConfig): string {
  const snippet = renderJson({ [config.rootKey]: { [MCP_SERVER_NAME]: config.entry } });
  return (
    `Could not safely extend ${config.path}: its existing contents are not valid JSON, or the ` +
    `value at "${config.rootKey}" is not an object. Nothing was written there. Add this entry by ` +
    `hand:\n${snippet}`
  );
}

function readErrorWarning(configPath: string, reason: string): string {
  return (
    `Could not read ${configPath} (${reason}); left untouched. Configure the "${MCP_SERVER_NAME}" ` +
    'server there by hand.'
  );
}

// --- JSON merge (Claude Code, Cursor, Kiro, GitHub Copilot) ---

function renderFreshJson(config: McpConfig): string {
  return renderJson({ [config.rootKey]: { [MCP_SERVER_NAME]: config.entry } });
}

/** JSON path (Claude Code, Cursor, Kiro, GitHub Copilot). Pure: no filesystem
 *  access, no `Date`, no `process.env`. Uses `JSON.parse`/`renderJson` only — both
 *  language builtins, not a dependency (`S4`). */
export function mergeJsonMcpConfig(input: McpMergeInput): McpMergeOutcome {
  const { config, existing, force } = input;

  if (isAbsentOrWhitespace(existing)) {
    return { kind: 'written', contents: renderFreshJson(config) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(existing);
  } catch {
    return { kind: 'skipped', warning: jsonSkippedWarning(config) };
  }

  if (!isPlainObject(parsed)) {
    return { kind: 'skipped', warning: jsonSkippedWarning(config) };
  }

  const root = parsed;
  const rootKeyValue = root[config.rootKey];
  if (rootKeyValue !== undefined && !isPlainObject(rootKeyValue)) {
    return { kind: 'skipped', warning: jsonSkippedWarning(config) };
  }

  const servers = isPlainObject(rootKeyValue) ? rootKeyValue : {};
  const alreadyPresent = MCP_SERVER_NAME in servers;
  if (alreadyPresent && !force) {
    return { kind: 'unchanged', warning: jsonUnchangedWarning(config.path) };
  }

  const newServers = { ...servers, [MCP_SERVER_NAME]: { ...config.entry } };
  const newRoot = { ...root, [config.rootKey]: newServers };
  return { kind: 'written', contents: renderJson(newRoot) };
}

// --- TOML merge (Codex) ---

function tomlTableSection(config: McpConfig): string {
  const header = `${config.rootKey}.${MCP_SERVER_NAME}`;
  const fields: TomlKeyValue[] = Object.entries(config.entry).map(([key, value]) => ({
    key,
    value: tomlBasicString(value),
  }));
  return renderTomlTable(header, fields);
}

function renderFreshToml(config: McpConfig): string {
  const comments = renderTomlComments([
    'generated by harny: the default Context7 MCP server backing the docs-lookup capability',
    "harny writes this entry only; approving the server and its tool calls stays Codex's own prompt",
  ]);
  return comments + tomlTableSection(config);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Detects an existing `[<rootKey>.<serverName>]` table by a line-start scan,
 *  never by parsing — this codebase has no TOML parser and this feature adds no
 *  dependency (`S4`). Tolerates leading whitespace, extra inner spacing around the
 *  dot and brackets, and a quoted or bare server name — biased toward detecting,
 *  since a false positive is a harmless `unchanged` while a false negative would
 *  duplicate a table. */
function hasExistingTomlTable(existing: string, rootKey: string): boolean {
  const pattern = new RegExp(
    `^\\[\\s*${escapeRegExp(rootKey)}\\s*\\.\\s*"?${escapeRegExp(MCP_SERVER_NAME)}"?\\s*\\]`,
  );
  for (const rawLine of existing.split('\n')) {
    const line = rawLine.replace(/^[ \t]+/, '');
    if (pattern.test(line)) return true;
  }
  return false;
}

/** TOML path (Codex). Pure, same constraints. Detects an existing table by
 *  line-start header scan, never by parsing. */
export function mergeTomlMcpConfig(input: McpMergeInput): McpMergeOutcome {
  const { config, existing } = input;

  if (isAbsentOrWhitespace(existing)) {
    return { kind: 'written', contents: renderFreshToml(config) };
  }

  // `--force` is a documented no-op here (`MC-9`): removing an existing table
  // safely would need the TOML parser this feature deliberately does not add.
  if (hasExistingTomlTable(existing, config.rootKey)) {
    return { kind: 'unchanged', warning: tomlUnchangedWarning(config.path) };
  }

  const prefix = existing.endsWith('\n') ? existing : existing + '\n';
  const contents = prefix + '\n' + tomlTableSection(config);
  return { kind: 'written', contents };
}

// --- Composition ---

/** Composition entry point, called from `runInit` step 11. The only impure
 *  function in this module: it reads (never writes) each resolved generator's MCP
 *  config path. A generator whose `mcpConfig` is `undefined` contributes nothing. */
export async function buildMcpFiles(
  generators: readonly Generator[],
  options: McpBuildOptions,
): Promise<McpBuildResult> {
  const files: GeneratedFile[] = [];
  const warnings: string[] = [];

  for (const generator of generators) {
    const config = generator.mcpConfig;
    if (config === undefined) continue;

    const absolutePath = path.join(options.targetDir, config.path);
    let existing: string | undefined;
    try {
      existing = await fs.readFile(absolutePath, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        existing = undefined;
      } else {
        const reason = err instanceof Error ? err.message : String(err);
        warnings.push(readErrorWarning(config.path, reason));
        continue;
      }
    }

    const outcome =
      config.format === 'json'
        ? mergeJsonMcpConfig({ config, existing, force: options.force })
        : mergeTomlMcpConfig({ config, existing, force: options.force });

    if (outcome.kind === 'written') {
      files.push({ path: config.path, contents: outcome.contents, merge: true });
    } else {
      warnings.push(outcome.warning);
    }
  }

  return { files, warnings };
}
