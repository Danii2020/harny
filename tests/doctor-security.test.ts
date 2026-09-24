/**
 * Spec: specs/doctor-security-checks
 * Covers: contract.md § Public API (`buildSecurityChecks`, `DoctorChecksFile.security`,
 * `CI_SECRET_SCAN_STEP_NAME`), § Data Models (the family table), DS-6 (one wiring
 * entry per resolved generator), DS-9 (pure; paths imported from their owners);
 * intent.md SC1.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';
import { SECURITY_FAMILY_LABEL, buildDoctorChecks, buildSecurityChecks } from '../src/doctor.js';
import { CI_SECRET_SCAN_STEP_NAME, GIT_HOOKS_DIR } from '../src/git-hooks.js';
import { PERMISSIONS_GUARD_PATH, PERMISSIONS_POLICY_PATH } from '../src/permissions.js';
import { generators } from '../src/generators/index.js';
import { HARNESS_CONFIG_PATH } from '../src/engine.js';

const allFive = [...generators.values()];

describe('buildSecurityChecks (DS-6, DS-9)', () => {
  it('emits the contracted family, all recommended, in order, with one wiring entry per tool', () => {
    const checks = buildSecurityChecks(allFive);
    expect(checks.map((c) => c.id)).toEqual([
      'security:permissions-policy',
      'security:permissions-guard',
      ...allFive.map((g) => `security:permissions-wired:${g.id}`),
      'security:env-ignored',
      'security:git-hooks',
      'security:git-hooks-active',
      'security:gitleaks',
      'security:ci-secret-scan',
    ]);
    for (const check of checks) {
      expect(check.tier, check.id).toBe('recommended');
      expect(check.remediation.length, check.id).toBeGreaterThan(0);
    }
    const byId = new Map(checks.map((c) => [c.id, c]));
    expect(byId.get('security:permissions-policy')!.anyOf).toEqual([PERMISSIONS_POLICY_PATH]);
    expect(byId.get('security:permissions-guard')!.anyOf).toEqual([PERMISSIONS_GUARD_PATH]);
    for (const g of allFive) {
      expect(byId.get(`security:permissions-wired:${g.id}`)!.assert).toEqual({
        kind: 'fileContains',
        path: g.hooksPath,
        text: path.posix.basename(PERMISSIONS_GUARD_PATH),
      });
    }
    expect(byId.get('security:env-ignored')!.assert).toEqual({ kind: 'gitIgnored', paths: ['.env', '.env.local'] });
    expect(byId.get('security:env-ignored')!.requires).toBeUndefined();
    expect(byId.get('security:git-hooks')!.anyOf).toEqual([`${GIT_HOOKS_DIR}/pre-commit`]);
    expect(byId.get('security:git-hooks-active')!.assert).toEqual({
      kind: 'gitConfig',
      key: 'core.hooksPath',
      equals: GIT_HOOKS_DIR,
    });
    expect(byId.get('security:gitleaks')!.assert).toEqual({ kind: 'probe', probe: { binary: 'gitleaks' } });
    expect(byId.get('security:ci-secret-scan')!.assert).toEqual({
      kind: 'fileContains',
      path: '.github/workflows/harny-feedback.yml',
      text: CI_SECRET_SCAN_STEP_NAME,
    });
    for (const id of ['security:permissions-policy', 'security:git-hooks', 'security:ci-secret-scan']) {
      expect(byId.get(id)!.requires, id).toEqual({ anyFile: [HARNESS_CONFIG_PATH] });
    }
    expect(buildSecurityChecks(allFive)).toEqual(checks);
  });

  it('points the hooks and workflow checks at a subdirectory install correctly', () => {
    const checks = buildSecurityChecks(allFive.slice(0, 1), { prefix: 'apps/api' });
    const byId = new Map(checks.map((c) => [c.id, c]));
    expect(byId.get('security:git-hooks-active')!.assert).toMatchObject({ equals: `apps/api/${GIT_HOOKS_DIR}` });
    expect(byId.get('security:ci-secret-scan')!.assert).toMatchObject({
      path: '../../.github/workflows/harny-feedback-apps-api.yml',
    });
  });

  it('names a CI step that the canonical workflow template really contains', () => {
    const template = fs.readFileSync(path.join(REAL_TEMPLATES_ROOT, 'ci', 'harny-feedback.yml'), 'utf8');
    expect(template).toContain(`- name: ${CI_SECRET_SCAN_STEP_NAME}\n`);
  });
});

describe('buildDoctorChecks carries the family', () => {
  it('adds security and its label beside the existing families', () => {
    const file = buildDoctorChecks({ tools: ['claude-code'] } as any, allFive.slice(0, 1));
    expect(file.securityLabel).toBe(SECURITY_FAMILY_LABEL);
    expect(SECURITY_FAMILY_LABEL).toBe('security');
    expect(file.security).toEqual(buildSecurityChecks(allFive.slice(0, 1)));
    expect(file.version).toBe(1);
  });
});
