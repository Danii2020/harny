/**
 * The Kiro generator. Kiro's `tools` frontmatter field uses category tags
 * (`read`/`write`/`shell`/`web`) plus `@server` MCP references, rather than a
 * per-tool token list (contract.md "Verified per-tool facts" § Kiro).
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, HookPayload, RolePayload } from '../engine.js';
import { SPEC_SCHEMA_DIR } from '../engine.js';
import { HarnessError } from '../errors.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import { FEEDBACK_RUNNER_PATH } from '../feedback.js';
import { CONTEXT7_MCP_URL } from '../mcp.js';
import {
  renderFrontmatter,
  renderProjectConfigBlock,
  renderProvenance,
  renderSpecSchemaPointerBlock,
  yamlFlowSequence,
} from './markdown-yaml.js';
import { renderJson, wrapPosixShellArg } from './json.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'claude-opus-5',
  mid: 'claude-sonnet-4.6',
  cheapest: 'claude-haiku-4.5',
};

const KIRO_TOKEN_BY_CAPABILITY: Record<string, string | undefined> = {
  'read-files': 'read',
  'write-files': 'write',
  'run-shell': 'shell',
  'web-search': 'web',
  'docs-lookup': '@context7',
  'task-tracking': undefined,
};

const TASK_TRACKING_NOTE =
  "task-tracking has no Kiro-native tool category; the role body's own task discipline applies";
// (context7-mcp, MC-15.) Retracts the earlier "harny does not write MCP
// configuration" claim, which this feature falsifies: harny now writes
// .kiro/settings/mcp.json. Names the file and states why Kiro still prompts per
// tool call — harny deliberately never writes autoApprove (MC-11, G6).
const DOCS_LOOKUP_NOTE =
  'docs-lookup maps to the Context7 MCP server (@context7); harny writes its default configuration to ' +
  '.kiro/settings/mcp.json, so every tool call still prompts for approval because harny does not write autoApprove';

const KIRO_SKILL_DESCRIPTION_LIMIT = 1024;

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const tokens: string[] = [];
  const seenTokens = new Set<string>();
  const notes: string[] = [];
  const seenNotes = new Set<string>();
  let hasTaskTracking = false;
  let hasDocsLookup = false;

  const addNote = (note: string): void => {
    if (!seenNotes.has(note)) {
      seenNotes.add(note);
      notes.push(note);
    }
  };

  for (const capability of capabilities) {
    if (capability.known) {
      const token = KIRO_TOKEN_BY_CAPABILITY[capability.name];
      if (token && !seenTokens.has(token)) {
        seenTokens.add(token);
        tokens.push(token);
      }
      if (capability.name === 'task-tracking') hasTaskTracking = true;
      if (capability.name === 'docs-lookup') hasDocsLookup = true;
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  if (hasTaskTracking) {
    addNote(TASK_TRACKING_NOTE);
  }
  if (hasDocsLookup) {
    addNote(DOCS_LOOKUP_NOTE);
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
      { key: 'model', value: model },
      { key: 'tools', value: yamlFlowSequence(mapping.tokens), raw: true },
    ],
    mapping.notes.map((note) => `capability note: ${note}`),
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${pointerBlock}`;

  return { path: `${kiroGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;
  const description = template.metadata.purpose;

  if (description.length > KIRO_SKILL_DESCRIPTION_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `Kiro conductor skill description for ${kiroGenerator.conductorPath} is ` +
        `${description.length} characters, exceeding the documented ${KIRO_SKILL_DESCRIPTION_LIMIT}-character limit.`,
    );
  }

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: description },
    ],
    [
      'harny note: Kiro custom agents do not load skills by default; run the conductor from the ' +
        'default agent, or add resources: ["skill://.kiro/skills/*/SKILL.md"] to the custom agent ' +
        'that should see it.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: kiroGenerator.conductorPath, contents };
}

/** Kiro hooks run with `cwd` already at the project root; no project-dir macro
 *  is documented (V1), so the runner is addressed by its plain repo-relative
 *  path, same as Cursor. */
function runnerInvocation(): string {
  return FEEDBACK_RUNNER_PATH;
}

/** `postToolUse`'s action (V3): Kiro's own tool-context JSON on STDIN already
 *  matches the shape the shared runner reads, so no reshaping wrapper is
 *  needed — unlike Cursor's flat `afterFileEdit` payload. This generator never
 *  modifies the runner (BG-11). */
function accumulateCommand(runner: string): string {
  return `node "${runner}" accumulate`;
}

/**
 * `agentStop`'s inline wrapper (V4/BG-6). Kiro's only channel is exit 0 +
 * STDOUT — Kiro adds STDOUT directly to the agent's context and treats any
 * non-zero exit as a warning, never context (V4) — so this wrapper always
 * forwards the runner's combined output verbatim to its own STDOUT and always
 * exits 0, regardless of the runner's own exit code. `run-feedback.mjs` itself
 * still honors `stop_hook_active` on re-entry (forwarded stdin, unmodified),
 * so a re-entered turn simply produces no output to forward (BG-5).
 */
const KIRO_AGENT_STOP_WRAPPER_SCRIPT = [
  'const cp=require("child_process");',
  'const fs=require("fs");',
  'const runner=process.argv[1];',
  'const commands=process.argv[2];',
  'let input;',
  'try{input=fs.readFileSync(0);}catch(e){input=Buffer.from("");}',
  'const r=cp.spawnSync("node",[runner,"run","--commands",commands],{input});',
  'const out=((r.stdout?r.stdout.toString():"")+(r.stderr?r.stderr.toString():"")).trim();',
  'if(out.length>0){process.stdout.write(out+String.fromCharCode(10));}',
  'process.exit(0);',
].join('');

function agentStopCommand(runner: string, commands: unknown): string {
  const commandsJson = JSON.stringify(commands);
  return (
    `node --input-type=commonjs -e ${wrapPosixShellArg(KIRO_AGENT_STOP_WRAPPER_SCRIPT)} ` +
    `-- "${runner}" ${wrapPosixShellArg(commandsJson)}`
  );
}

/**
 * `.kiro/hooks/harny-feedback.json`, carrying both registrations BG-2
 * requires: a `postToolUse` accumulator and an `agentStop` runner, in the
 * array-of-hooks `{"version":"v1","hooks":[{"name":…,"trigger":…,"action":
 * {"type":"command","command":…}}]}` shape (V1). Ships the `types/`-page
 * camelCase `agentStop` trigger id per V6's resolution — see R1: this is not
 * yet confirmed against a live Kiro install. The escape hatch (BG-8)
 * registers the identical shape with a zero-command `run` invocation — inert,
 * never absent.
 */
function renderHook(payload: HookPayload): GeneratedFile {
  const { profile } = payload;
  const runner = runnerInvocation();
  const commands = profile ? profile.commands : [];

  const settings = {
    version: 'v1',
    hooks: [
      {
        name: 'harny-feedback-accumulate',
        trigger: 'postToolUse',
        action: { type: 'command', command: accumulateCommand(runner) },
      },
      {
        name: 'harny-feedback-agent-stop',
        trigger: 'agentStop',
        action: { type: 'command', command: agentStopCommand(runner, commands) },
      },
    ],
  };

  return { path: kiroGenerator.hooksPath, contents: renderJson(settings) };
}

export const kiroGenerator: Generator = {
  id: 'kiro',
  displayName: 'Kiro',
  agentsDir: '.kiro/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.kiro/skills/sdd-conductor/SKILL.md',
  skillsDir: '.kiro/skills',
  hooksPath: '.kiro/hooks/harny-feedback.json',
  // Kiro's workspace steering directory (contract.md § "Verified per-tool root
  // instruction files"); Kiro also supports AGENTS.md, which the `anyOf` fallback
  // covers. Verified against vendor documentation 2026-09-14; carries the AL-30
  // re-verification caveat.
  guidancePath: '.kiro/steering',
  // Kiro's workspace MCP config file (contract.md § "Verified per-tool MCP
  // facts"); ~/.kiro/settings/mcp.json is the user file and is never written
  // (SC19) — workspace config takes precedence over it. Verified against vendor
  // documentation 2026-09-15; carries the AL-30 re-verification caveat.
  mcpConfig: {
    path: '.kiro/settings/mcp.json',
    format: 'json',
    rootKey: 'mcpServers',
    entry: { url: CONTEXT7_MCP_URL },
  },
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
  renderHook,
};
