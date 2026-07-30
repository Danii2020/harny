/**
 * Spec: specs/cli-skeleton
 * Covers: intent.md SC4/SC12/SC13, contract.md Behavior Guarantees 13, 14, 16;
 * T36, T37, T38, T39.
 *
 * These tests spawn the real, built CLI (`bin/harness.js` -> `dist/cli.js`) as a
 * child process, proving the packaging/build wiring end to end — not just the
 * in-process `main()` surface already covered by tests/cli.test.ts. Per
 * intent.md's own success-criteria ordering ("npm install && npm run build &&
 * npm test"), `dist/` and `bin/harness.js` are expected to exist by the time
 * this file runs; in the red phase neither exists yet, so spawning fails with a
 * missing-entry-point error, which is the correct red-phase failure.
 *
 * AL-2 amendment round: `--roles` actually deselects, asserted end to end
 * through the real spawned CLI, on the emitted file set itself and
 * independently of `--gates` — Behavior Guarantee 22, Task 5.16, T5.16.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

const execFileAsync = promisify(execFile);
const CLI_ENTRY = path.join(REPO_ROOT, 'bin', 'harness.js');

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-e2e-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function runCli(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI_ENTRY, ...args], {
      env: { ...process.env },
    });
    return { code: 0, stdout, stderr };
  } catch (err: any) {
    return { code: typeof err.code === 'number' ? err.code : 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

async function listFilesRecursively(dir: string, root: string = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(full, root)));
    } else {
      files.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return files;
}

describe('init --yes --tools claude-code end to end (R4) (T36)', () => {
  it('exits 0 with no TTY and produces exactly the twelve contracted files', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli(['init', targetDir, '--yes', '--tools', 'claude-code']);

    expect(code).toBe(0);

    const files = await listFilesRecursively(targetDir);
    expect(files.sort()).toEqual(
      [
        '.claude/agents/sdd-architect.md',
        '.claude/agents/sdd-test-writer.md',
        '.claude/agents/sdd-executor.md',
        '.claude/agents/sdd-auditor.md',
        '.claude/agents/sdd-documentation.md',
        '.claude/skills/sdd-conductor/SKILL.md',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
  });
});

describe('init --roles deselects independently of --gates (AL-2, guarantee 22, replaces the weak T32) (T5.16)', () => {
  it('writes exactly one .claude/agents/*.md file for --roles sdd-architect, with --gates left unset', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code',
      '--roles',
      'sdd-architect',
    ]);
    expect(code).toBe(0);

    const files = await listFilesRecursively(targetDir);
    const agentFiles = files.filter((f) => f.startsWith('.claude/agents/'));
    expect(agentFiles).toEqual(['.claude/agents/sdd-architect.md']);
  });
});

describe('--dry-run (guarantee 14) (T37)', () => {
  it('writes nothing at all — not even .sdd/ — and prints the planned file list', async () => {
    const targetDir = await makeTempDir();

    const { code, stdout } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code',
      '--dry-run',
    ]);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    expect(files).toEqual([]);

    expect(stdout).toContain('.claude/agents/sdd-architect.md');
    expect(stdout).toContain('.sdd/harness.json');
  });
});

describe('re-run over existing output (guarantee 13) (T38)', () => {
  it('exits 3 listing collisions and writes nothing without --force; succeeds with --force', async () => {
    const targetDir = await makeTempDir();

    const firstRun = await runCli(['init', targetDir, '--yes', '--tools', 'claude-code']);
    expect(firstRun.code).toBe(0);

    const secondRun = await runCli(['init', targetDir, '--yes', '--tools', 'claude-code']);
    expect(secondRun.code).toBe(3);
    const combinedOutput = secondRun.stdout + secondRun.stderr;
    expect(combinedOutput).toContain('.claude/agents/sdd-architect.md');

    const thirdRun = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code',
      '--force',
    ]);
    expect(thirdRun.code).toBe(0);
  });
});

describe('determinism (guarantee 16) (T39)', () => {
  it('produces byte-identical output across two independent runs with the same config', async () => {
    const targetDirA = await makeTempDir();
    const targetDirB = await makeTempDir();

    const runA = await runCli(['init', targetDirA, '--yes', '--tools', 'claude-code']);
    const runB = await runCli(['init', targetDirB, '--yes', '--tools', 'claude-code']);
    expect(runA.code).toBe(0);
    expect(runB.code).toBe(0);

    const filesA = (await listFilesRecursively(targetDirA)).sort();
    const filesB = (await listFilesRecursively(targetDirB)).sort();
    expect(filesA.length).toBeGreaterThan(0);
    expect(filesA).toEqual(filesB);

    for (const relativePath of filesA) {
      const contentsA = await fs.readFile(path.join(targetDirA, relativePath), 'utf8');
      const contentsB = await fs.readFile(path.join(targetDirB, relativePath), 'utf8');
      expect(contentsA).toBe(contentsB);
    }
  });
});
