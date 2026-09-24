/**
 * The Cursor generator. Cursor has no tool-allowlist frontmatter field at all
 * (contract.md "Verified per-tool facts" § Cursor) — every capability is
 * therefore advisory-only and travels entirely through `notes`, and the only
 * permission control Cursor exposes (`readonly: true`) is derived from the
 * capability set rather than mapped token-by-token.
 */
import type { Capability } from '../templates.js';
import type { ConductorPayload, HookPayload, RolePayload } from '../engine.js';
import { SPEC_SCHEMA_DIR } from '../engine.js';
import type { CostTier, RoleId } from '../vocabulary.js';
import { FEEDBACK_RUNNER_PATH } from '../feedback.js';
import { CONTEXT7_MCP_URL } from '../mcp.js';
import type { FrontmatterField } from './markdown-yaml.js';
import {
  renderFrontmatter,
  renderProjectConfigBlock,
  renderProvenance,
  renderSpecSchemaPointerBlock,
} from './markdown-yaml.js';
import { renderJson, wrapPosixShellArg } from './json.js';
import type { CapabilityMapping, GeneratedFile, Generator } from './types.js';

const MODEL_BY_TIER: Record<CostTier, string> = {
  'most-capable': 'claude-opus-5',
  mid: 'claude-4.6-sonnet',
  cheapest: 'gpt-5.4-mini',
};

// Rendered as a "# harny note:" comment rather than a "# capability note:"
// comment (see renderRole below) — it is an adapter-level caveat about how
// Cursor's permission model works, not a per-capability mapping fact.
const READONLY_ADVISORY_NOTE =
  'Cursor expresses permissions only via `readonly`; the capability list above is documentation, not enforcement.';

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
      addNote(`${capability.name} (no Cursor tool-allowlist field; advisory only)`);
    } else {
      addNote(`unmapped capability: ${capability.name}`);
    }
    if (capability.scope) {
      addNote(`${capability.name} is scoped to ${capability.scope}`);
    }
  }

  if (capabilities.length > 0) {
    addNote(READONLY_ADVISORY_NOTE);
  }

  return { tokens: [], notes };
}

/** True when a role declares neither `write-files` nor `run-shell` (base names,
 *  regardless of any scope qualifier), i.e. when Cursor's `readonly: true` is the
 *  faithful rendering of its capability set. Exported for testability; deliberately
 *  NOT part of `Generator` — see contract.md "Interface sufficiency finding". */
export function isReadonlyRole(capabilities: readonly Capability[]): boolean {
  return !capabilities.some((c) => c.name === 'write-files' || c.name === 'run-shell');
}

function roleFileName(roleId: RoleId): string {
  return `${roleId}.md`;
}

function renderRole(payload: RolePayload): GeneratedFile {
  const { template, tier, modelOverride } = payload;
  const model = mapModel(tier, modelOverride);
  const mapping = mapCapabilities(template.metadata.capabilities);

  const fields: FrontmatterField[] = [
    { key: 'name', value: template.metadata.id },
    { key: 'description', value: `${template.metadata.purpose} ${template.metadata.invocation}` },
    { key: 'model', value: model },
  ];
  if (isReadonlyRole(template.metadata.capabilities)) {
    fields.push({ key: 'readonly', value: 'true', raw: true });
  }

  const comments = mapping.notes.map((note) =>
    note === READONLY_ADVISORY_NOTE ? `harny note: ${note}` : `capability note: ${note}`,
  );

  const frontmatter = renderFrontmatter(fields, comments);
  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${pointerBlock}`;

  return { path: `${cursorGenerator.agentsDir}/${roleFileName(template.metadata.id)}`, contents };
}

function renderConductor(payload: ConductorPayload): GeneratedFile {
  const { template, project } = payload;

  const frontmatter = renderFrontmatter(
    [
      { key: 'name', value: template.metadata.id },
      { key: 'description', value: template.metadata.purpose },
    ],
    [
      'harny note: Cursor also loads `.claude/agents/` and `.codex/agents/` as compatibility ' +
        'locations; selecting Claude Code and/or a Codex generator alongside Cursor places the ' +
        'same role names in more than one directory Cursor reads.',
    ],
  );

  const provenance = renderProvenance(`templates/${template.sourcePath}`);
  const block = renderProjectConfigBlock(project);
  const contents = `${frontmatter}${provenance}\n${template.body}\n\n${block}`;

  return { path: cursorGenerator.conductorPath, contents };
}

/** Cursor's documented `loop_limit` default (V4/R3): the wrapper below suppresses
 *  its own `followup_message` at or above this value, since Cursor's shared runner
 *  only knows `stop_hook_active` (V5's field), never Cursor's own `loop_count`. */
const CURSOR_LOOP_LIMIT = 5;

/** Cursor documents a per-entry `timeout` (seconds) on every hook registration
 *  (V1); both entries below share one generous, notice-friendly value. */
const CURSOR_HOOK_TIMEOUT_SECONDS = 60;

/** Cursor hooks run with `cwd` already at the project root, so the runner is
 *  addressed by its plain repo-relative path — unlike Claude Code, Cursor
 *  documents no `${PROJECT_DIR}`-style macro (V1). */
function runnerInvocation(): string {
  return FEEDBACK_RUNNER_PATH;
}

/**
 * The `afterFileEdit` accumulator's inline wrapper (V3). Cursor's own
 * `afterFileEdit` payload is flat — `{file_path, session_id, …}`, no
 * `tool_input` wrapper (unlike Claude Code's `PostToolUse`) — but the shared
 * `run-feedback.mjs`, which this generator never modifies (BG-11), only ever
 * reads `payload.tool_input.file_path` for `accumulate` mode. This wrapper
 * reshapes the payload before piping it to the runner, preserving every other
 * field (the turn-key field included) untouched, rather than modifying the
 * runner itself.
 */
const CURSOR_ACCUMULATE_WRAPPER_SCRIPT = [
  'const cp=require("child_process");',
  'const fs=require("fs");',
  'const runner=process.argv[1];',
  'let raw;',
  'try{raw=fs.readFileSync(0,"utf8");}catch(e){raw="";}',
  'let payload;',
  'try{payload=JSON.parse(raw||"{}");}catch(e){payload={};}',
  'payload.tool_input={file_path:payload.file_path};',
  'cp.spawnSync("node",[runner,"accumulate"],{input:JSON.stringify(payload)});',
  'process.exit(0);',
].join('');

function accumulateCommand(runner: string): string {
  return `node --input-type=commonjs -e ${wrapPosixShellArg(CURSOR_ACCUMULATE_WRAPPER_SCRIPT)} -- "${runner}"`;
}

/**
 * The `stop` hook's inline wrapper (V4/BG-6). Cursor's only `stop` channel is
 * `{"followup_message": …}` — a forced continuation, since Cursor documents no
 * non-blocking option on `stop` (V4) — so the wrapper reads its own incoming
 * `loop_count` and suppresses the followup entirely at or above
 * `CURSOR_LOOP_LIMIT`, so this hook can never itself drive Cursor's own
 * runaway-loop override (BG-5, R3). The runner's own `stop_hook_active` check
 * still applies underneath (forwarded stdin, unmodified).
 */
const CURSOR_STOP_WRAPPER_SCRIPT = [
  'const cp=require("child_process");',
  'const fs=require("fs");',
  'const runner=process.argv[1];',
  'const commands=process.argv[2];',
  'let input;',
  'try{input=fs.readFileSync(0);}catch(e){input=Buffer.from("");}',
  'let loopCount=0;',
  'try{const parsed=JSON.parse(input.toString()||"{}");loopCount=Number(parsed.loop_count)||0;}catch(e){}',
  `const r=cp.spawnSync("node",[runner,"run","--commands",commands],{input});`,
  `if(r.status===2&&loopCount<${CURSOR_LOOP_LIMIT}){`,
  'const out=((r.stdout?r.stdout.toString():"")+(r.stderr?r.stderr.toString():"")).trim();',
  'const message=out.length>0?out:"harny-feedback: a mapped command reported a finding.";',
  'process.stdout.write(JSON.stringify({followup_message:message})+String.fromCharCode(10));',
  '}',
  'process.exit(0);',
].join('');

function stopCommand(runner: string, commands: unknown): string {
  const commandsJson = JSON.stringify(commands);
  return (
    `node --input-type=commonjs -e ${wrapPosixShellArg(CURSOR_STOP_WRAPPER_SCRIPT)} ` +
    `-- "${runner}" ${wrapPosixShellArg(commandsJson)}`
  );
}

/**
 * `.cursor/hooks.json`, carrying both registrations BG-2 requires: an
 * `afterFileEdit` accumulator and a `stop` runner, in the top-level
 * `{"version":1,"hooks":{"<event>":[{"command":…,"type":"command","timeout":…}]}}`
 * shape (V1), via `renderJson`. The escape hatch (BG-8) registers the identical
 * shape with a zero-command `run` invocation — inert, never absent.
 */
function renderHook(payload: HookPayload): GeneratedFile {
  const { profile } = payload;
  const runner = runnerInvocation();
  const commands = payload.commands ?? (profile ? profile.commands : []);

  const settings = {
    version: 1,
    hooks: {
      afterFileEdit: [
        { command: accumulateCommand(runner), type: 'command', timeout: CURSOR_HOOK_TIMEOUT_SECONDS },
      ],
      stop: [{ command: stopCommand(runner, commands), type: 'command', timeout: CURSOR_HOOK_TIMEOUT_SECONDS }],
    },
  };

  return { path: cursorGenerator.hooksPath, contents: renderJson(settings) };
}

export const cursorGenerator: Generator = {
  id: 'cursor',
  displayName: 'Cursor',
  agentsDir: '.cursor/agents',
  wrapperFormat: 'markdown-yaml',
  conductorPath: '.cursor/skills/sdd-conductor/SKILL.md',
  skillsDir: '.agents/skills',
  hooksPath: '.cursor/hooks.json',
  // Cursor reads AGENTS.md (and CLAUDE.md) at the project root alongside
  // .cursor/rules natively (contract.md § "Verified per-tool root instruction
  // files"), so it needs no entry of its own — AGENTS.md is already in every
  // repo-readiness entry's `anyOf`. Verified against vendor documentation
  // 2026-09-14; carries the AL-30 re-verification caveat.
  guidancePath: undefined,
  // Cursor's own project-scope MCP config file (contract.md § "Verified per-tool
  // MCP facts"). Verified against vendor documentation 2026-09-15; no `type`
  // field — Cursor's remote-server shape is a bare `url`. Carries reservation
  // `R-Cursor`: one unverified, low-confidence secondary claim that MCP support in
  // some Cursor installs sits behind a settings toggle defaulting off; Cursor's
  // own documentation was unreachable during exploration. If true, this file is
  // correct but inert until the user flips that toggle (the `AL-30` failure mode).
  mcpConfig: {
    path: '.cursor/mcp.json',
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
