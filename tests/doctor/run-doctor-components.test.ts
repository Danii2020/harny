/**
 * Spec: specs/component-level-docs
 * Covers: contract.md CL-3 (dynamic repo-readiness entries: component doc, then one
 * bridge entry per bridged tool, recommended, exact remediation; bridges skipped
 * while AGENTS.md is missing), CL-4 (no `componentDocs` or no shipped module: no
 * entries, no error); intent.md SC2.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';
import { COMPONENT_DISCOVERY } from '../../src/component-docs.js';

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function install(files: Record<string, string>, options: { module?: boolean } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-doctor-comp-'));
  tempDirs.push(dir);
  for (const [file, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), contents);
  }
  fs.mkdirSync(path.join(dir, '.sdd', 'doctor'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.sdd', 'shared'), { recursive: true });
  fs.copyFileSync(path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs'), path.join(dir, '.sdd', 'doctor', 'run-doctor.mjs'));
  fs.copyFileSync(path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs'), path.join(dir, '.sdd', 'shared', 'probes.mjs'));
  if (options.module !== false) {
    fs.copyFileSync(path.join(REAL_TEMPLATES_ROOT, 'shared', 'components.mjs'), path.join(dir, '.sdd', 'shared', 'components.mjs'));
  }
  return dir;
}

function checks(withComponentDocs = true) {
  return {
    version: 1,
    specs: { dir: 'specs', reservedDirs: [], schemaFiles: [], shippedMarker: 'Shipped:', approvedVerdicts: [] },
    require: [],
    repoReadiness: [],
    repoReadinessLabel: 'repo readiness',
    commands: [],
    ...(withComponentDocs
      ? {
          componentDocs: {
            discovery: { ...COMPONENT_DISCOVERY, declared: [] },
            docName: 'AGENTS.md',
            bridges: [
              { tool: 'claude-code', path: '{dir}/CLAUDE.md', contents: '@AGENTS.md\n', marker: '@AGENTS.md' },
              { tool: 'kiro', path: '.kiro/steering/agents-{slug}.md', contents: 'k\n', marker: '#[[file:{dir}/AGENTS.md]]' },
            ],
          },
        }
      : {}),
  };
}

function doctor(dir: string, checksFile: unknown) {
  const r = spawnSync('node', ['.sdd/doctor/run-doctor.mjs', '--checks', JSON.stringify(checksFile), '--only', 'repo-readiness'], { cwd: dir });
  return { code: r.status, out: r.stdout.toString() + r.stderr.toString() };
}

describe('component entries in repo readiness (CL-3)', () => {
  it('warns for a missing AGENTS.md and skips its bridges; checks bridges once the doc exists', () => {
    const dir = install({
      'apps/web/package.json': '{}',
      'apps/api/package.json': '{}',
      'apps/api/AGENTS.md': '# api\n',
      'apps/api/CLAUDE.md': '@AGENTS.md\n',
    });
    const { code, out } = doctor(dir, checks());
    expect(code).toBe(0);
    expect(out).toContain('OK repo-readiness:component-doc:apps/api');
    expect(out).toContain('OK repo-readiness:component-bridge:claude-code:apps/api');
    expect(out).toMatch(/WARN repo-readiness:component-bridge:kiro:apps\/api - .*\.kiro\/steering\/agents-apps-api\.md.*#\[\[file:apps\/api\/AGENTS\.md\]\]/);
    expect(out).toMatch(/WARN repo-readiness:component-doc:apps\/web - .*apps\/web\/AGENTS\.md/);
    expect(out).not.toContain('component-bridge:claude-code:apps/web');
    expect(out.indexOf('component-doc:apps/api')).toBeLessThan(out.indexOf('component-doc:apps/web'));
  });
});

describe('compatibility (CL-4)', () => {
  it('emits no component entries without componentDocs or without the shipped module', () => {
    const files = { 'apps/web/package.json': '{}' };
    expect(doctor(install(files), checks(false)).out).not.toContain('component-');
    const noModule = doctor(install(files, { module: false }), checks());
    expect(noModule.code).toBe(0);
    expect(noModule.out).not.toContain('component-');
  });
});
