/**
 * Spec: specs/component-level-docs
 * Covers: contract.md § Data Models (per-tool `nestedGuidance` table), CL-5 (init
 * writes missing bridges only for components with an AGENTS.md, never overwrites,
 * warns on a CLAUDE.md without the import), CL-6 (native tools get none), CL-7
 * (bridge contents); intent.md SC3, SC4.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';
import { buildNestedGuidanceBridgeFiles, loadDiscovery } from '../src/component-docs.js';
import { claudeCodeGenerator } from '../src/generators/claude-code.js';
import { kiroGenerator } from '../src/generators/kiro.js';
import { cursorGenerator } from '../src/generators/cursor.js';
import { githubCopilotGenerator } from '../src/generators/github-copilot.js';
import { codexGenerator } from '../src/generators/codex.js';
import { runInit } from '../src/init.js';

const allFive = [claudeCodeGenerator, cursorGenerator, kiroGenerator, githubCopilotGenerator, codexGenerator];

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-cdocs-'));
  tempDirs.push(root);
  for (const [file, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), contents);
  }
  return root;
}

describe('nestedGuidance per tool (CL-6, CL-7)', () => {
  it('only Claude Code and Kiro declare a bridge; the three native tools declare undefined', () => {
    expect(cursorGenerator.nestedGuidance).toBeUndefined();
    expect(githubCopilotGenerator.nestedGuidance).toBeUndefined();
    expect(codexGenerator.nestedGuidance).toBeUndefined();
    expect(claudeCodeGenerator.nestedGuidance).toEqual({
      path: '{dir}/CLAUDE.md',
      contents: '@AGENTS.md\n',
      marker: '@AGENTS.md',
    });
    expect(kiroGenerator.nestedGuidance).toEqual({
      path: '.kiro/steering/agents-{slug}.md',
      contents: '---\ninclusion: fileMatch\nfileMatchPattern: "{dir}/**"\n---\n\n#[[file:{dir}/AGENTS.md]]\n',
      marker: '#[[file:{dir}/AGENTS.md]]',
    });
  });
});

describe('buildNestedGuidanceBridgeFiles (CL-5)', () => {
  it('writes filled bridges for documented components only, never over an existing file', async () => {
    const root = tree({
      'apps/web/package.json': '{}',
      'apps/web/AGENTS.md': '# web\n',
      'apps/api/package.json': '{}', // no AGENTS.md: no bridge
      'apps/admin/package.json': '{}',
      'apps/admin/AGENTS.md': '# admin\n',
      'apps/admin/CLAUDE.md': '# my own notes\n', // exists without import: warn, no write
    });
    const discovery = await loadDiscovery(REAL_TEMPLATES_ROOT);
    const components = discovery.discoverComponents(root, { ...(await import('../src/component-docs.js')).COMPONENT_DISCOVERY, declared: [] });
    const { files, warnings } = await buildNestedGuidanceBridgeFiles(root, components, allFive, discovery);

    expect(files.map((f) => [f.path, f.contents])).toEqual([
      ['.kiro/steering/agents-apps-admin.md', '---\ninclusion: fileMatch\nfileMatchPattern: "apps/admin/**"\n---\n\n#[[file:apps/admin/AGENTS.md]]\n'],
      ['apps/web/CLAUDE.md', '@AGENTS.md\n'],
      ['.kiro/steering/agents-apps-web.md', '---\ninclusion: fileMatch\nfileMatchPattern: "apps/web/**"\n---\n\n#[[file:apps/web/AGENTS.md]]\n'],
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('apps/admin/CLAUDE.md');
    expect(warnings[0]).toContain('@AGENTS.md');
  });

  it('is silent for a CLAUDE.md that already imports AGENTS.md', async () => {
    const root = tree({ 'apps/web/package.json': '{}', 'apps/web/AGENTS.md': 'x\n', 'apps/web/CLAUDE.md': '@AGENTS.md\n\nmore\n' });
    const discovery = await loadDiscovery(REAL_TEMPLATES_ROOT);
    const result = await buildNestedGuidanceBridgeFiles(root, ['apps/web'], [claudeCodeGenerator], discovery);
    expect(result).toEqual({ files: [], warnings: [] });
  });
});

describe('runInit wires existing component docs (CL-5)', () => {
  it('writes the Claude Code bridge and re-running init stays conflict-free', async () => {
    const root = tree({ 'apps/web/package.json': '{}', 'apps/web/AGENTS.md': '# web\n' });
    execFileSync('git', ['init', '-q'], { cwd: root });
    const io = { log: () => {}, warn: () => {} };
    const options = { targetDir: root, overrides: { tools: ['claude-code' as const] }, interactive: false, dryRun: false, force: false, gitHooks: false, io };
    const first = await runInit(options);
    expect(first.written).toContain('apps/web/CLAUDE.md');
    expect(fs.readFileSync(path.join(root, 'apps/web/CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
    const second = await runInit({ ...options, force: true });
    expect(second.written).not.toContain('apps/web/CLAUDE.md');
  });
});
