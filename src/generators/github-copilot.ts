/**
 * The GitHub Copilot generator. Copilot documents two divergent tool
 * vocabularies (cloud-agent aliases vs. VS Code chat tool names) and `target`
 * defaults to both surfaces at once, so `tools` is deliberately left unset
 * rather than emitted as a partially-correct allowlist (contract.md
 * "Verified per-tool facts" § GitHub Copilot).
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
} from './markdown-yaml.js';
import { renderJson, wrapPosixShellArg } from './json.js';
import { PERMISSIONS_GUARD_PATH } from '../permissions.js';
import { emitJson, guardCommand } from './guard.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'Claude Opus 5',
  mid: 'Claude Sonnet 4.5',
  cheapest: 'Claude Haiku 4.5',
};

const MODEL_CAVEAT_NOTE =
  'model is honored in VS Code / JetBrains / Eclipse / Xcode and ignored on github.com';

const COPILOT_SKILL_DESCRIPTION_LIMIT = 1024;
const COPILOT_ROLE_BODY_LIMIT = 30_000;

function mapModel(tier: CostTier, override?: string): string {
  return override ?? MODEL_BY_TIER[tier];
}

function mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping {
  const notes: string[] = [];
  const seen = new Set<string>();

  const addNote = (note: string): void => {
    if (!seen.has(note)) {
      seen.add(note);
      notes.push(note);
    }
  };

  for (const capability of capabilities) {
    if (capability.known) {
      addNote(`${capability.name} (tools intentionally unset: Copilot grants all available tools; see contract.md)`);
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  return { tokens: [], notes };
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.agent.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const renderedBody = `${provenance}\n${template.body}\n\n${pointerBlock}`;

  if (renderedBody.length > COPILOT_ROLE_BODY_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `GitHub Copilot role body for ${template.metadata.id} is ${renderedBody.length} characters, ` +
        `exceeding the documented ${COPILOT_ROLE_BODY_LIMIT}-character prompt limit.`,
    );
  }

  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const comments = [
    ...mapping.notes.map((note) => `capability note: ${note}`),
    `harny note: ${MODEL_CAVEAT_NOTE}`,
  ];

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
      { key: 'model', value: model },
    ],
    comments,
  );
  const contents = `${frontmatter}${renderedBody}`;

  return { path: `${githubCopilotGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;
  const description = template.metadata.purpose;

  if (description.length > COPILOT_SKILL_DESCRIPTION_LIMIT) {
    throw new HarnessError(
      'TEMPLATE',
      `GitHub Copilot conductor skill description for ${githubCopilotGenerator.conductorPath} is ` +
        `${description.length} characters, exceeding the documented ${COPILOT_SKILL_DESCRIPTION_LIMIT}-character limit.`,
    );
  }

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: description },
    ],
    [
      'harny note: Copilot skills are model-invoked, not user-invoked; ask Copilot to "use the ' +
        'sdd-conductor skill" to start the pipeline explicitly.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: githubCopilotGenerator.conductorPath, contents };
}

/** Copilot hooks run with `cwd` already at the project root; no project-dir
 *  macro is documented (V1), so the runner is addressed by its plain
 *  repo-relative path. */
function runnerInvocation(): string {
  return FEEDBACK_RUNNER_PATH;
}

/** `postToolUse`'s bash script (V3): Copilot's tool-input payload already
 *  matches the shape the shared, byte-frozen runner reads, so no reshaping
 *  wrapper is needed. */
function accumulateCommand(runner: string): string {
  return `node "${runner}" accumulate`;
}

/**
 * `agentStop`'s inline wrapper (V4/BG-6). Copilot's only channel is
 * `{"decision":"block","reason":…}` — a forced continuation, since Copilot
 * documents no non-blocking option on `agentStop` (V4). Copilot's own
 * `agentStop` payload carries `stop_hook_active` under that exact name (V2) —
 * the same field the shared runner already reads and suppresses on — so this
 * wrapper simply forwards its own stdin unmodified and lets the runner's
 * already-tested suppression do the loop-safety work (BG-5), rather than a
 * second, wrapper-owned re-entry check duplicating it.
 */
const COPILOT_AGENT_STOP_WRAPPER_SCRIPT = [
  'const cp=require("child_process");',
  'const fs=require("fs");',
  'const runner=process.argv[1];',
  'const commands=process.argv[2];',
  'let input;',
  'try{input=fs.readFileSync(0);}catch(e){input=Buffer.from("");}',
  'const r=cp.spawnSync("node",[runner,"run","--commands",commands],{input});',
  'if(r.status===2){',
  'const out=((r.stdout?r.stdout.toString():"")+(r.stderr?r.stderr.toString():"")).trim();',
  'const reason=out.length>0?out:"harny-feedback: a mapped command reported a finding.";',
  'process.stdout.write(JSON.stringify({decision:"block",reason:reason})+String.fromCharCode(10));',
  '}',
  'process.exit(0);',
].join('');

function agentStopScript(runner: string, commands: unknown): string {
  const commandsJson = JSON.stringify(commands);
  return (
    `node --input-type=commonjs -e ${wrapPosixShellArg(COPILOT_AGENT_STOP_WRAPPER_SCRIPT)} ` +
    `-- "${runner}" ${wrapPosixShellArg(commandsJson)}`
  );
}

/** (NEW — permissions-baseline, PB-8.) Copilot's `preToolUse` channel:
 *  `{"permissionDecision":…,"permissionDecisionReason":…}` on stdout, admitting
 *  `deny` and `ask` (verified 2026-09-24 against github/copilot-sdk
 *  docs/hooks/pre-tool-use.md). Allow prints nothing. */
const COPILOT_GUARD_CHANNEL = {
  deny: emitJson('{permissionDecision:"deny",permissionDecisionReason:reason}'),
  ask: emitJson('{permissionDecision:"ask",permissionDecisionReason:reason}'),
  allow: '',
};

/**
 * `.github/hooks/harny-feedback.json`, carrying both registrations BG-2
 * requires: a `postToolUse` accumulator and an `agentStop` runner, in the
 * `{"version":1,"hooks":{"<event>":[{"type":"command","bash":…}]}}` shape
 * (V1) — note the `"bash"` script key, not `"command"`. The escape hatch
 * (BG-8) registers the identical shape with a zero-command `run` invocation —
 * inert, never absent.
 */
function renderHook(payload: HookPayload): GeneratedFile {
  const { profile } = payload;
  const runner = runnerInvocation();
  const commands = payload.commands ?? (profile ? profile.commands : []);

  // (NEW — permissions-baseline.) Absent without a permissions payload (PB-12).
  const guard = payload.permissions
    ? { preToolUse: [{ type: 'command', bash: guardCommand(PERMISSIONS_GUARD_PATH, COPILOT_GUARD_CHANNEL) }] }
    : {};

  const settings = {
    version: 1,
    hooks: {
      ...guard,
      postToolUse: [{ type: 'command', bash: accumulateCommand(runner) }],
      agentStop: [{ type: 'command', bash: agentStopScript(runner, commands) }],
    },
  };

  return { path: githubCopilotGenerator.hooksPath, contents: renderJson(settings) };
}

export const githubCopilotGenerator: Generator = {
  id: 'github-copilot',
  displayName: 'GitHub Copilot',
  agentsDir: '.github/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.github/skills/sdd-conductor/SKILL.md',
  skillsDir: '.agents/skills',
  hooksPath: '.github/hooks/harny-feedback.json',
  // Copilot's repository custom-instructions file (contract.md § "Verified per-tool
  // root instruction files"). Verified against vendor documentation 2026-09-14;
  // carries the AL-30 re-verification caveat.
  guidancePath: '.github/copilot-instructions.md',
  // VS Code's own MCP config file — not Copilot's; it is shared with every other
  // MCP user of that editor (contract.md § "Verified per-tool MCP facts").
  // Verified against vendor documentation 2026-09-15. The root key is `servers`,
  // the one fact that differs from every other of the five tools, which all use
  // `mcpServers`/`mcp_servers`.
  mcpConfig: {
    path: '.vscode/mcp.json',
    format: 'json',
    rootKey: 'servers',
    entry: { type: 'http', url: CONTEXT7_MCP_URL },
  },
  roleFileName,
  mapModel,
  mapCapabilities,
  renderRole,
  renderConductor,
  renderHook,
};
