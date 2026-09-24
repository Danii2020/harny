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
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes "Packaging" (CLI-10 amended again,
 * twenty-six → thirty `templates/**` files); intent.md SC14; audit.md Test
 * Coverage T18.
 *
 * Red-phase note: `EXPECTED_TEMPLATE_FILES` gains
 * `templates/skills/harny-doctor/SKILL.md`, `templates/doctor/run-doctor.mjs`,
 * `templates/doctor/README.md`, and `templates/shared/probes.mjs`. None of
 * these four files exist yet, so the `npm pack` assertion below is expected
 * to fail on the new count and the missing paths, not on a wrong assumption
 * about `npm pack`'s own output shape.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md "Amendments to shipped current-truth statements"
 * (CLI-10, thirty → thirty-one `templates/**` files, for the new
 * `templates/mcp/README.md`); intent.md SC20; audit.md Test Coverage T28.
 *
 * `templates/mcp/README.md` does not exist yet at red time, so the packaged
 * count assertion below is expected to fail on thirty vs. the contracted
 * thirty-one, and the membership assertion is expected to fail on the missing
 * path, not on a wrong assumption about `npm pack`'s own output shape.
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
  // (readiness-doctor)
  'templates/skills/harny-doctor/SKILL.md',
  'templates/doctor/run-doctor.mjs',
  'templates/doctor/README.md',
  'templates/shared/probes.mjs',
  // (context7-mcp)
  'templates/mcp/README.md',
];

async function packedFilePaths(): Promise<string[]> {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPO_ROOT,
  });
  const [result] = JSON.parse(stdout);
  return (result.files as Array<{ path: string }>).map((f) => f.path);
}

describe('npm pack --dry-run (guarantee 20) (T42)', () => {
  it('includes bin/, dist/, and all thirty-one templates/** files (Gu 26, S4) (context7-mcp amendment: 30 -> 31)', async () => {
    const files = await packedFilePaths();

    expect(files.some((f) => f.startsWith('bin/'))).toBe(true);
    expect(files.some((f) => f.startsWith('dist/'))).toBe(true);
    expect(EXPECTED_TEMPLATE_FILES).toHaveLength(31);
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

    // Guarantee 16 is about the dependency *set*, not the pinned versions: a
    // routine version bump is not drift, a new package is. Asserting version
    // strings here only made this a change-detector for every upgrade.
    expect(Object.keys(pkg.dependencies ?? {}).sort()).toEqual(['@clack/prompts', 'commander']);
    expect(Object.keys(pkg.devDependencies ?? {}).sort()).toEqual([
      '@types/node',
      'typescript',
      'vitest',
    ]);
  });
});
