/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Data Models — build and packaging" (G1, G10);
 * Behavior Guarantee 20; R15; C38; T42.
 *
 * Spec: specs/codex-generator
 * Covers: contract.md Behavior Guarantee 16 ("No dependency drift");
 * intent.md Non-Goals ("A general-purpose TOML serializer or a TOML
 * dependency"); roadmap.md Phase 4.3; tasks.md Task 4.3.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantee 26 ("Packaging manifest is closed
 * and correct"), Supersession S4 (CLI-10's manifest grows from eleven to
 * twenty-two `templates/**` files); intent.md SC15; roadmap.md Phase 4.2;
 * tasks.md Tasks 4.2, 4.3. `EXPECTED_TEMPLATE_FILES` gains the eleven
 * `templates/skills/**` paths listed in `contract.md` § Data Models — the
 * `templates/skills/` file manifest.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Amendments to shipped current-truth statements"
 * (CLI-10, eleven/twenty-two → twenty-six `templates/**` files); intent.md
 * SC19; roadmap.md Phase 5.4; tasks.md Task 5.6. `EXPECTED_TEMPLATE_FILES`
 * gains `templates/skills/harny-feedback/SKILL.md`, `templates/hooks/README.md`,
 * `templates/hooks/run-feedback.mjs`, and `templates/ci/harny-feedback.yml`.
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
  'templates/skills/README.md',
  'templates/skills/harny-propose/SKILL.md',
  'templates/skills/harny-test/SKILL.md',
  'templates/skills/harny-implement/SKILL.md',
  'templates/skills/harny-audit/SKILL.md',
  'templates/skills/harny-document/SKILL.md',
  'templates/skills/harny-sync/SKILL.md',
  'templates/skills/harny-sync/capability-template.md',
  'templates/skills/harny-adr/SKILL.md',
  'templates/skills/harny-adr/adr-template.md',
  'templates/skills/harny-standards/SKILL.md',
  'templates/skills/harny-feedback/SKILL.md',
  'templates/hooks/README.md',
  'templates/hooks/run-feedback.mjs',
  'templates/ci/harny-feedback.yml',
];

async function packedFilePaths(): Promise<string[]> {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPO_ROOT,
  });
  const [result] = JSON.parse(stdout);
  return (result.files as Array<{ path: string }>).map((f) => f.path);
}

describe('npm pack --dry-run (guarantee 20) (T42)', () => {
  it('includes bin/, dist/, and all twenty-six templates/** files (Gu 26, S4)', async () => {
    const files = await packedFilePaths();

    expect(files.some((f) => f.startsWith('bin/'))).toBe(true);
    expect(files.some((f) => f.startsWith('dist/'))).toBe(true);
    expect(EXPECTED_TEMPLATE_FILES).toHaveLength(26);
    for (const expected of EXPECTED_TEMPLATE_FILES) {
      expect(files).toContain(expected);
    }
  });

  it('excludes src/, tests/, and specs/ entirely, even after the manifest grows (Gu 26)', async () => {
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
