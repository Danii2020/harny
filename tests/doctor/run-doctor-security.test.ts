/**
 * Spec: specs/doctor-security-checks
 * Covers: contract.md DS-1 (family placement and label), DS-2 (recommended only: WARN,
 * exit unchanged), DS-3 (the four assertion kinds), DS-4 (git-backed entries skip
 * outside git), DS-5 (gate first), DS-7 (`--only security`), DS-8 (compatibility);
 * § Error Handling (unknown assertion kind); intent.md SC2–SC5.
 *
 * Drives `templates/doctor/run-doctor.mjs` as a real subprocess with inline `--checks`
 * JSON, in throwaway directories that are or are not git repositories.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

const RUNNER = path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs');
const PROBES = path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs');

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function makeDir(options: { git?: boolean } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-doctor-sec-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, '.sdd', 'doctor'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.sdd', 'shared'), { recursive: true });
  fs.copyFileSync(RUNNER, path.join(dir, '.sdd', 'doctor', 'run-doctor.mjs'));
  fs.copyFileSync(PROBES, path.join(dir, '.sdd', 'shared', 'probes.mjs'));
  if (options.git !== false) execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function baseChecks(extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    specs: { dir: 'specs', reservedDirs: ['current', 'archived'], schemaFiles: [], shippedMarker: 'Shipped:', approvedVerdicts: ['APPROVED'] },
    require: [{ id: 'harness-file', description: 'x', anyOf: ['README.md'], remediation: 'add README' }],
    repoReadiness: [],
    repoReadinessLabel: 'repo readiness',
    commands: [],
    ...extra,
  };
}

function entry(id: string, assert: unknown, rest: Record<string, unknown> = {}) {
  return { id, description: id, anyOf: [], remediation: `fix ${id}`, tier: 'recommended', assert, ...rest };
}

function doctor(dir: string, checks: unknown, args: string[] = []) {
  const result = spawnSync('node', ['.sdd/doctor/run-doctor.mjs', '--checks', JSON.stringify(checks), ...args], {
    cwd: dir,
    env: { ...process.env, PATH: process.env.PATH },
  });
  return { code: result.status, out: result.stdout.toString() + result.stderr.toString() };
}

describe('the security family: placement, label, recommended-only (DS-1, DS-2)', () => {
  it('prints its label after repo readiness and before spec state, and warns without changing the exit code', () => {
    const dir = makeDir();
    fs.writeFileSync(path.join(dir, 'README.md'), 'x\n');
    const checks = baseChecks({
      security: [entry('security:needs-file', undefined, { anyOf: ['missing.txt'], assert: undefined })],
      securityLabel: 'security',
    });
    const withFamily = doctor(dir, checks);
    const without = doctor(dir, baseChecks());

    expect(withFamily.out).toMatch(/-- repo readiness --[\s\S]*-- security --\nWARN security:needs-file - fix security:needs-file/);
    expect(withFamily.code).toBe(without.code);
    expect(without.out).not.toContain('-- security --');
  });
});

describe('assertion kinds (DS-3) and git skips (DS-4)', () => {
  it('gitIgnored passes only when git ignores every path', () => {
    const dir = makeDir();
    const checks = (paths: string[]) =>
      baseChecks({ security: [entry('security:env-ignored', { kind: 'gitIgnored', paths })], securityLabel: 'security' });
    expect(doctor(dir, checks(['.env'])).out).toContain('WARN security:env-ignored');
    fs.writeFileSync(path.join(dir, '.gitignore'), '.env\n');
    expect(doctor(dir, checks(['.env'])).out).toContain('OK security:env-ignored');
    expect(doctor(dir, checks(['.env', '.env.local'])).out).toContain('WARN security:env-ignored');
    fs.writeFileSync(path.join(dir, '.gitignore'), '.env*\n!.env.example\n');
    expect(doctor(dir, checks(['.env', '.env.local'])).out).toContain('OK security:env-ignored');
  });

  it('gitConfig compares the exact value', () => {
    const dir = makeDir();
    const checks = baseChecks({
      security: [entry('security:hooks', { kind: 'gitConfig', key: 'core.hooksPath', equals: '.sdd/git-hooks' })],
      securityLabel: 'security',
    });
    expect(doctor(dir, checks).out).toContain('WARN security:hooks');
    execFileSync('git', ['config', 'core.hooksPath', '.husky'], { cwd: dir });
    expect(doctor(dir, checks).out).toContain('WARN security:hooks');
    execFileSync('git', ['config', 'core.hooksPath', '.sdd/git-hooks'], { cwd: dir });
    expect(doctor(dir, checks).out).toContain('OK security:hooks');
  });

  it('fileContains needs the file and the text', () => {
    const dir = makeDir();
    const checks = baseChecks({
      security: [entry('security:ci', { kind: 'fileContains', path: 'wf.yml', text: 'Secret scan (gitleaks)' })],
      securityLabel: 'security',
    });
    expect(doctor(dir, checks).out).toContain('WARN security:ci');
    fs.writeFileSync(path.join(dir, 'wf.yml'), 'steps: []\n');
    expect(doctor(dir, checks).out).toContain('WARN security:ci');
    fs.writeFileSync(path.join(dir, 'wf.yml'), '- name: Secret scan (gitleaks)\n');
    expect(doctor(dir, checks).out).toContain('OK security:ci');
  });

  it('probe reuses the shared ToolProbe evaluator', () => {
    const dir = makeDir();
    const checks = (binary: string) =>
      baseChecks({ security: [entry('security:bin', { kind: 'probe', probe: { binary } })], securityLabel: 'security' });
    expect(doctor(dir, checks('node')).out).toContain('OK security:bin');
    expect(doctor(dir, checks('definitely-not-a-binary-xyz')).out).toContain('WARN security:bin');
  });

  it('skips git-backed assertions outside a git repository, and applies the requires gate first', () => {
    const dir = makeDir({ git: false });
    const checks = baseChecks({
      security: [
        entry('security:env-ignored', { kind: 'gitIgnored', paths: ['.env'] }),
        entry('security:hooks', { kind: 'gitConfig', key: 'core.hooksPath', equals: '.sdd/git-hooks' }),
        entry('security:gated', { kind: 'probe', probe: { binary: 'node' } }, { requires: { anyFile: ['.sdd/harness.json'] } }),
      ],
      securityLabel: 'security',
    });
    const { out } = doctor(dir, checks);
    expect(out).toMatch(/SKIP security:env-ignored - not a git repository/);
    expect(out).toMatch(/SKIP security:hooks - not a git repository/);
    expect(out).toMatch(/SKIP security:gated/);
  });

  it('warns, never crashes, on an assertion kind it does not know', () => {
    const dir = makeDir();
    const checks = baseChecks({ security: [entry('security:future', { kind: 'fromTheFuture' })], securityLabel: 'security' });
    const { out } = doctor(dir, checks);
    expect(out).toMatch(/WARN security:future - .*fromTheFuture/);
  });
});

describe('--only security (DS-7)', () => {
  it('runs just the security family and still rejects unknown families', () => {
    const dir = makeDir();
    const checks = baseChecks({
      security: [entry('security:bin', { kind: 'probe', probe: { binary: 'node' } })],
      securityLabel: 'security',
    });
    const only = doctor(dir, checks, ['--only', 'security']);
    expect(only.out).toContain('OK security:bin');
    expect(only.out).not.toContain('harness-file');
    expect(only.out).not.toContain('node-version');
    const bad = doctor(dir, checks, ['--only', 'nope']);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('security');
  });
});
