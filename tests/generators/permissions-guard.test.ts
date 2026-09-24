/**
 * Spec: specs/permissions-baseline
 * Covers: contract.md PB-8 (native registration and channel per tool, fail-closed
 * where `ask` is unavailable), PB-9 (Claude Code static rules in the same file), PB-12
 * (backward compatibility of `renderHook`); intent.md SC2, SC3, SC4, SC5.
 *
 * Every generated guard command is driven as a real `sh -c` subprocess against the
 * real guard and canonical policy installed in a throwaway git repository, fed that
 * tool's own documented pre-tool payload shape, so what is asserted is the tool-facing
 * output — not the command string.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';
import { claudeCodeGenerator } from '../../src/generators/claude-code.js';
import { cursorGenerator } from '../../src/generators/cursor.js';
import { githubCopilotGenerator } from '../../src/generators/github-copilot.js';
import { codexGenerator } from '../../src/generators/codex.js';
import { kiroGenerator } from '../../src/generators/kiro.js';
import { claudeCodePermissions, parsePermissionPolicy } from '../../src/permissions.js';
import type { Generator } from '../../src/generators/types.js';

const GUARD_SOURCE = path.join(REAL_TEMPLATES_ROOT, 'permissions', 'run-guard.mjs');
const POLICY_SOURCE = path.join(REAL_TEMPLATES_ROOT, 'permissions', 'policy.json');
const policy = parsePermissionPolicy(fs.readFileSync(POLICY_SOURCE, 'utf8'));

function hookPayload(withPermissions: boolean) {
  return {
    project: {
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
      components: [],
    },
    profile: undefined,
    runner: { name: 'run-feedback.mjs', contents: '', sourcePath: 'hooks/run-feedback.mjs' },
    commands: [],
    ...(withPermissions ? { permissions: { policy } } : {}),
  } as any;
}

function render(generator: Generator, withPermissions = true): any {
  return JSON.parse(generator.renderHook(hookPayload(withPermissions))!.contents);
}

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function makeRepo(branch = 'feature/x'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-guard-gen-'));
  tempDirs.push(dir);
  execFileSync('git', ['init', '-q', '-b', branch], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'i'], {
    cwd: dir,
  });
  const guardDir = path.join(dir, '.sdd', 'permissions');
  fs.mkdirSync(guardDir, { recursive: true });
  fs.copyFileSync(GUARD_SOURCE, path.join(guardDir, 'run-guard.mjs'));
  fs.copyFileSync(POLICY_SOURCE, path.join(guardDir, 'policy.json'));
  return dir;
}

interface Run {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function run(command: string, dir: string, payload: unknown): Run {
  const result = spawnSync('sh', ['-c', command], {
    cwd: dir,
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    input: JSON.stringify(payload),
  });
  return { code: result.status, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

const DENIED_SHELL = ['git push origin main', 'git push --force', 'git commit --no-verify -m x', 'rm -rf build', 'cat .env'];
const ALLOWED_SHELL = ['git push origin feature/x', 'git commit -m x', 'npm test'];
const ASKED_SHELL = 'vercel deploy --prod';

describe('Claude Code: PreToolUse + static permissions (PB-8, PB-9)', () => {
  const settings = render(claudeCodeGenerator);
  const group = settings.hooks.PreToolUse[0];
  const command: string = group.hooks[0].command;

  it('registers on Bash and Read and carries the static rules derived from the policy', () => {
    expect(group.matcher).toBe('Bash|Read');
    expect(settings.permissions).toEqual(claudeCodePermissions(policy));
  });

  it('answers deny, ask and allow through hookSpecificOutput', () => {
    const dir = makeRepo();
    const decide = (payload: unknown) => {
      const r = run(command, dir, payload);
      expect(r.code).toBe(0);
      return r.stdout.trim() === '' ? undefined : JSON.parse(r.stdout).hookSpecificOutput;
    };
    for (const c of DENIED_SHELL) {
      const out = decide({ tool_name: 'Bash', tool_input: { command: c } });
      expect(out, c).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
      expect(out.permissionDecisionReason.length).toBeGreaterThan(0);
    }
    expect(decide({ tool_name: 'Read', tool_input: { file_path: path.join(dir, '.env') } })).toMatchObject({
      permissionDecision: 'deny',
    });
    expect(decide({ tool_name: 'Bash', tool_input: { command: ASKED_SHELL } })).toMatchObject({
      permissionDecision: 'ask',
    });
    for (const c of ALLOWED_SHELL) {
      expect(decide({ tool_name: 'Bash', tool_input: { command: c } }), c).toBeUndefined();
    }
  });
});

describe('Cursor: beforeShellExecution + beforeReadFile, always valid JSON (PB-8)', () => {
  const hooks = render(cursorGenerator).hooks;

  it('answers every outcome with a permission JSON object on stdout', () => {
    const dir = makeRepo();
    const shell = hooks.beforeShellExecution[0].command as string;
    const read = hooks.beforeReadFile[0].command as string;
    const decide = (command: string, payload: unknown) => {
      const r = run(command, dir, payload);
      expect(r.code).toBe(0);
      return JSON.parse(r.stdout);
    };
    for (const c of DENIED_SHELL) {
      expect(decide(shell, { hook_event_name: 'beforeShellExecution', command: c, cwd: dir }), c).toMatchObject({
        permission: 'deny',
      });
    }
    expect(decide(shell, { hook_event_name: 'beforeShellExecution', command: ASKED_SHELL, cwd: dir })).toMatchObject({
      permission: 'ask',
    });
    expect(decide(shell, { hook_event_name: 'beforeShellExecution', command: 'npm test', cwd: dir })).toEqual({
      permission: 'allow',
    });
    expect(decide(read, { hook_event_name: 'beforeReadFile', file_path: path.join(dir, '.env') })).toMatchObject({
      permission: 'deny',
    });
    expect(decide(read, { hook_event_name: 'beforeReadFile', file_path: path.join(dir, 'README.md') })).toEqual({
      permission: 'allow',
    });
  });
});

describe('GitHub Copilot: preToolUse (PB-8)', () => {
  it('answers with permissionDecision, accepting toolArgs as object or string', () => {
    const hooks = render(githubCopilotGenerator).hooks;
    const command = hooks.preToolUse[0].bash as string;
    expect(hooks.preToolUse[0].type).toBe('command');
    const dir = makeRepo();
    const decide = (payload: unknown) => {
      const r = run(command, dir, payload);
      expect(r.code).toBe(0);
      return r.stdout.trim() === '' ? undefined : JSON.parse(r.stdout);
    };
    expect(decide({ toolName: 'bash', toolArgs: { command: 'git push origin main' }, cwd: dir })).toMatchObject({
      permissionDecision: 'deny',
    });
    expect(decide({ toolName: 'view', toolArgs: JSON.stringify({ path: path.join(dir, '.env') }) })).toMatchObject({
      permissionDecision: 'deny',
    });
    expect(decide({ toolName: 'bash', toolArgs: { command: ASKED_SHELL }, cwd: dir })).toMatchObject({
      permissionDecision: 'ask',
    });
    expect(decide({ toolName: 'bash', toolArgs: { command: 'npm test' }, cwd: dir })).toBeUndefined();
  });
});

describe('Codex: PreToolUse, ask fails closed (PB-8)', () => {
  it('denies both deny and ask rules, the latter naming human approval', () => {
    const hooks = render(codexGenerator).hooks;
    const group = hooks.PreToolUse[0];
    expect(group.matcher).toBe('Bash');
    expect(group.hooks[0].timeout).toBe(hooks.Stop[0].hooks[0].timeout);
    const dir = makeRepo();
    const decide = (c: string) => {
      const r = run(group.hooks[0].command, dir, { tool_name: 'Bash', tool_input: { command: c }, cwd: dir, turn_id: 't' });
      expect(r.code).toBe(0);
      return r.stdout.trim() === '' ? undefined : JSON.parse(r.stdout).hookSpecificOutput;
    };
    for (const c of DENIED_SHELL) expect(decide(c), c).toMatchObject({ permissionDecision: 'deny' });
    const asked = decide(ASKED_SHELL);
    expect(asked).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'deny' });
    expect(asked.permissionDecisionReason).toMatch(/^requires human approval:/);
    for (const c of ALLOWED_SHELL) expect(decide(c), c).toBeUndefined();
  });
});

describe('Kiro: preToolUse, exit 2 blocks, ask fails closed (PB-8)', () => {
  it('blocks with the reason on stderr and allows with exit 0', () => {
    const entry = render(kiroGenerator).hooks.find((h: any) => h.name === 'harny-permissions');
    expect(entry).toMatchObject({ trigger: 'preToolUse', action: { type: 'command' } });
    const dir = makeRepo();
    const decide = (c: string) => run(entry.action.command, dir, { tool_name: 'execute_bash', tool_input: { command: c }, cwd: dir });
    for (const c of DENIED_SHELL) {
      const r = decide(c);
      expect(r.code, c).toBe(2);
      expect(r.stderr.trim().length).toBeGreaterThan(0);
    }
    const asked = decide(ASKED_SHELL);
    expect(asked.code).toBe(2);
    expect(asked.stderr).toMatch(/requires human approval:/);
    for (const c of ALLOWED_SHELL) expect(decide(c).code, c).toBe(0);
  });
});

describe('renderHook without a permissions payload is unchanged; with it, existing registrations are untouched (PB-12)', () => {
  const generators: Array<[Generator, (settings: any) => unknown]> = [
    [claudeCodeGenerator, (s) => ({ PostToolUse: s.hooks.PostToolUse, Stop: s.hooks.Stop, SubagentStop: s.hooks.SubagentStop })],
    [cursorGenerator, (s) => ({ afterFileEdit: s.hooks.afterFileEdit, stop: s.hooks.stop, subagentStop: s.hooks.subagentStop })],
    [githubCopilotGenerator, (s) => ({ postToolUse: s.hooks.postToolUse, agentStop: s.hooks.agentStop })],
    [codexGenerator, (s) => ({ PostToolUse: s.hooks.PostToolUse, Stop: s.hooks.Stop, SubagentStop: s.hooks.SubagentStop })],
    [kiroGenerator, (s) => s.hooks.filter((h: any) => h.name !== 'harny-permissions')],
  ];

  it.each(generators)('%s', (generator, existing) => {
    const without = generator.renderHook(hookPayload(false))!.contents;
    expect(without).not.toContain('run-guard.mjs');
    expect(without).not.toContain('"permissions"');
    expect(existing(render(generator, true))).toEqual(existing(JSON.parse(without)));
  });
});
