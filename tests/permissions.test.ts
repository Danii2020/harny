/**
 * Spec: specs/permissions-baseline
 * Covers: contract.md § Public API (`src/permissions.ts`), PB-1 (one canonical policy),
 * PB-2 (verbatim install), PB-9 (Claude Code static rules derived from the policy),
 * PB-11 (determinism); § Error Handling row 1 (invalid canonical policy);
 * intent.md SC1, SC5.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';
import { HarnessError } from '../src/errors.js';
import {
  PERMISSIONS_GUARD_PATH,
  PERMISSIONS_POLICY_PATH,
  buildPermissionsFiles,
  claudeCodePermissions,
  parsePermissionPolicy,
} from '../src/permissions.js';
import { loadCanonicalTemplates } from '../src/templates.js';
import { buildPayload } from '../src/engine.js';
import { defaultConfig } from '../src/config.js';

const POLICY_SOURCE = fs.readFileSync(path.join(REAL_TEMPLATES_ROOT, 'permissions', 'policy.json'), 'utf8');

describe('parsePermissionPolicy', () => {
  it('accepts the canonical baseline with the plan-mandated defaults', () => {
    const policy = parsePermissionPolicy(POLICY_SOURCE);
    expect(policy.git.protectedBranches).toEqual(['main', 'master', 'production', 'release/*']);
    expect(policy.read.deny).toEqual(expect.arrayContaining(['.env', '.env.*', '*.pem', 'secrets/**']));
    expect(policy.read.allow).toContain('.env.example');
    expect(policy.commands.deny.length).toBeGreaterThan(0);
    expect(policy.commands.ask.length).toBeGreaterThan(0);
    for (const rule of [...policy.commands.deny, ...policy.commands.ask]) {
      expect(rule.pattern.trim()).toBe(rule.pattern);
      expect(rule.reason.length).toBeGreaterThan(0);
    }
  });

  it('rejects a malformed policy with a TEMPLATE error naming the field', () => {
    const cases: Array<[string, string]> = [
      ['{', 'JSON'],
      [JSON.stringify({ ...JSON.parse(POLICY_SOURCE), version: 2 }), 'version'],
      [JSON.stringify({ ...JSON.parse(POLICY_SOURCE), extra: true }), 'extra'],
      [JSON.stringify({ ...JSON.parse(POLICY_SOURCE), git: { protectedBranches: 'main' } }), 'protectedBranches'],
      [
        JSON.stringify({ ...JSON.parse(POLICY_SOURCE), commands: { deny: [{ pattern: 'x' }], ask: [] } }),
        'reason',
      ],
    ];
    for (const [source, field] of cases) {
      let caught: unknown;
      try {
        parsePermissionPolicy(source);
      } catch (error) {
        caught = error;
      }
      expect(caught, field).toBeInstanceOf(HarnessError);
      expect((caught as HarnessError).code).toBe('TEMPLATE');
      expect((caught as HarnessError).message).toContain(field);
    }
  });
});

describe('claudeCodePermissions derives static rules from the policy, in policy order', () => {
  it('maps reads, carve-outs, denies and asks to Claude Code rule syntax', () => {
    const policy = parsePermissionPolicy(POLICY_SOURCE);
    const rules = claudeCodePermissions(policy);
    expect(rules.deny).toEqual([
      ...policy.read.deny.map((p) => `Read(${p})`),
      ...policy.read.allow.map((p) => `Read(!${p})`),
      ...policy.commands.deny.map((r) => `Bash(${r.pattern})`),
    ]);
    expect(rules.ask).toEqual(policy.commands.ask.map((r) => `Bash(${r.pattern})`));
  });
});

describe('buildPermissionsFiles', () => {
  it('writes the guard and the policy verbatim at the owned paths, once', async () => {
    const templates = await loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
    const payload = buildPayload(defaultConfig(templates), templates);
    const files = buildPermissionsFiles(payload);
    expect(files.map((f) => f.path)).toEqual([PERMISSIONS_GUARD_PATH, PERMISSIONS_POLICY_PATH]);
    expect(PERMISSIONS_GUARD_PATH).toBe('.sdd/permissions/run-guard.mjs');
    expect(PERMISSIONS_POLICY_PATH).toBe('.sdd/permissions/policy.json');
    expect(files[0]!.contents).toBe(
      fs.readFileSync(path.join(REAL_TEMPLATES_ROOT, 'permissions', 'run-guard.mjs'), 'utf8'),
    );
    expect(files[1]!.contents).toBe(POLICY_SOURCE);
    for (const file of files) {
      expect(file.contents.endsWith('\n') && !file.contents.endsWith('\n\n')).toBe(true);
    }
  });
});
