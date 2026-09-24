/**
 * The permissions baseline (specs/permissions-baseline): the single owner of the
 * guard's and the policy's install paths, the policy's parsing, and the one
 * derivation that turns the policy into a tool's static rules (PB-1, S5).
 *
 * Tool-neutral by construction — it lives beside `src/feedback.ts` and `src/mcp.ts`,
 * outside `src/generators/`. The rules themselves live only in
 * `templates/permissions/policy.json`; nothing here re-literals one.
 */
import type { HarnessPayload } from './engine.js';
import { HarnessError } from './errors.js';
import type { GeneratedFile } from './generators/types.js';

/** Where the tool-neutral guard runner is installed. */
export const PERMISSIONS_GUARD_PATH = '.sdd/permissions/run-guard.mjs';
/** Where the editable baseline is installed, beside the guard that reads it. */
export const PERMISSIONS_POLICY_PATH = '.sdd/permissions/policy.json';

export interface CommandRule {
  readonly pattern: string;
  readonly reason: string;
}

export interface PermissionPolicy {
  readonly version: 1;
  readonly git: { readonly protectedBranches: readonly string[] };
  readonly read: { readonly deny: readonly string[]; readonly allow: readonly string[] };
  readonly commands: { readonly deny: readonly CommandRule[]; readonly ask: readonly CommandRule[] };
}

const POLICY_KEYS = ['commands', 'git', 'read', 'version'];

function invalid(field: string, detail: string): HarnessError {
  return new HarnessError('TEMPLATE', `Invalid permissions policy: ${field} ${detail}.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw invalid(field, 'must be an array of strings');
  }
  return value;
}

function ruleArray(value: unknown, field: string): readonly CommandRule[] {
  if (!Array.isArray(value)) {
    throw invalid(field, 'must be an array of rules');
  }
  return value.map((rule, index) => {
    if (!isRecord(rule) || typeof rule.pattern !== 'string') {
      throw invalid(`${field}[${index}].pattern`, 'must be a string');
    }
    if (typeof rule.reason !== 'string' || rule.reason.length === 0) {
      throw invalid(`${field}[${index}].reason`, 'must be a non-empty string');
    }
    return { pattern: rule.pattern, reason: rule.reason };
  });
}

/** Parses and validates policy JSON. The same shape check the guard applies at
 *  runtime, so a policy harny accepts is one the guard accepts. */
export function parsePermissionPolicy(source: string): PermissionPolicy {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw invalid('source', 'is not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw invalid('root', 'must be an object');
  }
  const extra = Object.keys(parsed).filter((key) => !POLICY_KEYS.includes(key));
  if (extra.length > 0) {
    throw invalid(extra.join(', '), 'is not a recognized key');
  }
  if (parsed.version !== 1) {
    throw invalid('version', 'must be 1');
  }
  const { git, read, commands } = parsed;
  if (!isRecord(git) || !isRecord(read) || !isRecord(commands)) {
    throw invalid('git/read/commands', 'must each be an object');
  }
  return {
    version: 1,
    git: { protectedBranches: stringArray(git.protectedBranches, 'git.protectedBranches') },
    read: { deny: stringArray(read.deny, 'read.deny'), allow: stringArray(read.allow, 'read.allow') },
    commands: { deny: ruleArray(commands.deny, 'commands.deny'), ask: ruleArray(commands.ask, 'commands.ask') },
  };
}

/** Claude Code's static `permissions` block (PB-9). The policy's pattern language
 *  is Claude Code's own Bash and gitignore rule syntax, so each entry maps
 *  one-to-one; a `read.allow` entry becomes a same-list `!` carve-out, which
 *  Claude Code honors only after the rules it carves from, hence the order. */
export function claudeCodePermissions(policy: PermissionPolicy): {
  readonly deny: readonly string[];
  readonly ask: readonly string[];
} {
  return {
    deny: [
      ...policy.read.deny.map((pattern) => `Read(${pattern})`),
      ...policy.read.allow.map((pattern) => `Read(!${pattern})`),
      ...policy.commands.deny.map((rule) => `Bash(${rule.pattern})`),
    ],
    ask: policy.commands.ask.map((rule) => `Bash(${rule.pattern})`),
  };
}

/** The guard and the policy, verbatim, exactly once per run (PB-2). `[]` when the
 *  loaded templates root carries no permissions subsystem (lean test fixtures) —
 *  never for the real, packaged templates root. */
export function buildPermissionsFiles(payload: HarnessPayload): readonly GeneratedFile[] {
  if (!payload.permissionsGuard || !payload.permissionsPolicy) {
    return [];
  }
  return [
    { path: PERMISSIONS_GUARD_PATH, contents: payload.permissionsGuard.contents },
    { path: PERMISSIONS_POLICY_PATH, contents: payload.permissionsPolicy.contents },
  ];
}
