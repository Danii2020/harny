/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Data Models — build and packaging" (G1, G10);
 * Behavior Guarantee 20; R15; C38; T42.
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
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
