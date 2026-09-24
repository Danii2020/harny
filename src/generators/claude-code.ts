/**
 * The one reference generator, proving the `Generator` interface end to end
 * against this repo's own live `.claude/` instance as an empirical oracle.
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, HookPayload, RolePayload } from '../engine.js';
import { SPEC_SCHEMA_DIR } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import { FEEDBACK_RUNNER_PATH } from '../feedback.js';
import { CONTEXT7_MCP_URL } from '../mcp.js';
import {
  renderFrontmatter,
  renderProjectConfigBlock,
  renderProvenance,
  renderSpecSchemaPointerBlock,
} from './markdown-yaml.js';
import { renderJson, wrapPosixShellArg } from './json.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'opus',
  mid: 'sonnet',
  cheapest: 'haiku',
};

const CAPABILITY_TOKENS: Record<string, readonly string[]> = {
  'read-files': ['Read', 'Glob', 'Grep', 'LS'],
  'write-files': ['Write', 'Edit'],
  'run-shell': ['Bash'],
  'web-search': ['WebSearch', 'WebFetch'],
  'docs-lookup': ['mcp__context7__resolve-library-id', 'mcp__context7__query-docs'],
  'task-tracking': ['TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate'],
};

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const tokens: string[] = [];
  const seen = new Set<string>();
  const notes: string[] = [];

  for (const capability of capabilities) {
    if (capability.known) {
      for (const token of CAPABILITY_TOKENS[capability.name] ?? []) {
        if (!seen.has(token)) {
          seen.add(token);
          tokens.push(token);
        }
      }
    } else {
      notes.push(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      notes.push(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  return { tokens, notes };
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;
  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
      { key: 'model', value: model, raw: true },
      { key: 'tools', value: mapping.tokens.join(', ') },
    ],
    mapping.notes.map((note) => `capability note: ${note}`),
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${pointerBlock}`;

  return { path: `${claudeCodeGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;

  const frontmatter = renderFrontmatter([
    { key: 'name', value: template.metadata.id },
    { key: 'description', value: template.metadata.purpose },
  ]);

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: claudeCodeGenerator.conductorPath, contents };
}

/** `${CLAUDE_PROJECT_DIR}`-relative path to the shared runner (V5): resolves
 *  project-relative script paths regardless of Claude Code's own cwd. */
function runnerInvocation(): string {
  return `\${CLAUDE_PROJECT_DIR}/${FEEDBACK_RUNNER_PATH}`;
}

/**
 * The `Stop` hook's inline wrapper (V4/BG-6): spawns the shared runner in `run`
 * mode, forwarding this process's own stdin (the tool's raw hook event JSON) so
 * the runner still resolves its turn key and `stop_hook_active` exactly as it
 * does today. This generator never modifies `templates/hooks/run-feedback.mjs`
 * (or its sibling `templates/shared/probes.mjs`) — both stay byte-for-byte
 * tool-neutral (BG-11); all Claude-Code-specific adaptation lives here, in the
 * generated `command` string, per `renderHook`'s own contract (one
 * `GeneratedFile`, never a second file for this).
 *
 * - Runner exit `2` (a blocking-worthy finding): the wrapper captures the
 *   runner's combined stdout/stderr and prints exactly one line of JSON —
 *   `{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"…"}}` —
 *   to its **own** stdout, then exits `0`. Claude Code treats this as
 *   non-blocking informational context (V4's non-blocking channel), never a
 *   forced continuation (BG-6).
 * - Runner exit `0` (clean pass or skip-only): no output, exit `0`.
 *
 * `--input-type=commonjs` pins the inline script's module system regardless of
 * the target repo's own `package.json` `"type"` field — this script is never
 * written to disk, so it has no `package.json` of its own to inherit from.
 * Built with `String.fromCharCode(10)` rather than an escaped `"\n"` literal so
 * no ambiguity survives this string's three layers of embedding (TS source ->
 * shell argument -> `node -e` source).
 */
const STOP_WRAPPER_SCRIPT = [
  'const cp=require("child_process");',
  'const fs=require("fs");',
  'const runner=process.argv[1];',
  'const commands=process.argv[2];',
  'let input;',
  'try{input=fs.readFileSync(0);}catch(e){input=Buffer.from("");}',
  'const r=cp.spawnSync("node",[runner,"run","--commands",commands],{input});',
  'if(r.status===2){',
  'const out=((r.stdout?r.stdout.toString():"")+(r.stderr?r.stderr.toString():"")).trim();',
  'const context=out.length>0?out:"harny-feedback: a mapped command reported a finding.";',
  'process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"Stop",additionalContext:context}})+String.fromCharCode(10));',
  '}',
  'process.exit(0);',
].join('');

function stopCommand(runner: string, commands: unknown): string {
  const commandsJson = JSON.stringify(commands);
  return (
    `node --input-type=commonjs -e ${wrapPosixShellArg(STOP_WRAPPER_SCRIPT)} ` +
    `-- "${runner}" ${wrapPosixShellArg(commandsJson)}`
  );
}

/**
 * `.claude/settings.json`, carrying both registrations BG-2 requires: a
 * `PostToolUse` accumulator (matched to `Edit|Write` only, V3) and a `Stop`
 * runner (V1), in the nested
 * `{"hooks":{"<Event>":[{"hooks":[{"type":"command","command":…}]}]}}` shape,
 * via `renderJson` (TG-5). The escape hatch (BG-8) registers the identical
 * shape with a zero-command `run` invocation — inert, never absent.
 *
 * The resolved profile's commands travel from `src/feedback.ts` to the target
 * repo as inline JSON on the `Stop` registration's own `--commands` argument
 * (BG-7: never a literal command string in this generator) — never hard-coded
 * here, and never duplicated into a second generated file, since `renderHook`
 * returns exactly one `GeneratedFile` (contract.md § Interfaces). The `Stop`
 * command itself is `stopCommand`'s non-blocking wrapper (V4/BG-6), not a bare
 * runner invocation.
 */
function renderHook(payload: HookPayload): GeneratedFile {
  const { profile } = payload;
  const runner = runnerInvocation();
  const commands = payload.commands ?? (profile ? profile.commands : []);

  const settings = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: `node "${runner}" accumulate` }],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: stopCommand(runner, commands),
            },
          ],
        },
      ],
    },
  };

  return { path: claudeCodeGenerator.hooksPath, contents: renderJson(settings) };
}

export const claudeCodeGenerator: Generator = {
  id: 'claude-code',
  displayName: 'Claude Code',
  agentsDir: '.claude/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.claude/skills/sdd-conductor/SKILL.md',
  skillsDir: '.claude/skills',
  hooksPath: '.claude/settings.json',
  // Claude Code's own root instruction file (contract.md § "Verified per-tool root
  // instruction files"). Verified against vendor documentation 2026-09-14; this
  // repo's own CLAUDE.md is the worked example.
  guidancePath: 'CLAUDE.md',
  // Claude Code's own project-scope MCP config file (contract.md § "Verified
  // per-tool MCP facts"). Verified against vendor documentation 2026-09-15.
  // `type: 'http'` is Claude Code's own field for a streamable-HTTP remote server.
  mcpConfig: {
    path: '.mcp.json',
    format: 'json',
    rootKey: 'mcpServers',
    entry: { type: 'http', url: CONTEXT7_MCP_URL },
  },
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
  renderHook,
};
