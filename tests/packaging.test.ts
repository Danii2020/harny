/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Data Models — build and packaging" (G1, G10);
 * Behavior Guarantee 20; R15; C38; T42.
 *
 * Spec: specs/codex-generator
 * Covers: contract.md Behavior Guarantee 16 ("No dependency drift");
 * intent.md Non-Goals ("A general-purpose TOML serializer or a TOML
 * dependency"); roadmap.md Phase 4.3; tasks.md Task 4.3.
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

const execFileAsync = promisify(execFile);

const EXPECTED_TEMPLATE_FILES = [
  'templates/roles/sdd-architect.md',
  'templates/roles/sdd-test-writer.md',
  'templates/roles/sdd-executor.md',
  'templates/roles/sdd-auditor.md',
  'templates/roles/sdd-documentation.md',
  'templates/conductor/sdd-conductor.md',
  'templates/spec-schema/intent.md',
  'templates/spec-schema/contract.md',
  'templates/spec-schema/roadmap.md',
  'templates/spec-schema/tasks.md',
  'templates/spec-schema/audit.md',
];

async function packedFilePaths(): Promise<string[]> {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPO_ROOT,
  });
  const [result] = JSON.parse(stdout);
  return (result.files as Array<{ path: string }>).map((f) => f.path);
}

describe('npm pack --dry-run (guarantee 20) (T42)', () => {
  it('includes bin/, dist/, and all eleven templates/** files', async () => {
    const files = await packedFilePaths();

    expect(files.some((f) => f.startsWith('bin/'))).toBe(true);
    expect(files.some((f) => f.startsWith('dist/'))).toBe(true);
    for (const expected of EXPECTED_TEMPLATE_FILES) {
      expect(files).toContain(expected);
    }
  });

  it('excludes src/, tests/, and specs/ entirely', async () => {
    const files = await packedFilePaths();

    expect(files.some((f) => f.startsWith('src/'))).toBe(false);
    expect(files.some((f) => f.startsWith('tests/'))).toBe(false);
    expect(files.some((f) => f.startsWith('specs/'))).toBe(false);
  });
});

describe('no dependency drift for the Codex generator (guarantee 16) (Task 4.3)', () => {
  it('package.json dependencies and devDependencies are byte-identical (git-tracked, unchanged)', async () => {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', 'package.json'], {
      cwd: REPO_ROOT,
    });
    expect(stdout.trim()).toBe('');
  });

  it('adds no TOML parsing or serialization package to either dependencies or devDependencies', async () => {
    const raw = await fs.readFile(path.join(REPO_ROOT, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const allPackageNames = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];

    for (const name of allPackageNames) {
      expect(/toml/i.test(name), `${name} looks like a TOML package`).toBe(false);
    }

    expect(pkg.dependencies).toEqual({ commander: '15.0.0', '@clack/prompts': '1.7.0' });
    expect(pkg.devDependencies).toEqual({
      typescript: '7.0.2',
      vitest: '4.1.10',
      '@types/node': '26.1.2',
    });
  });
});
