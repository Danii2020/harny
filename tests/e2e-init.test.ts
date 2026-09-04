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
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: intent.md success criteria for per-tool and multi-tool `init` runs;
 * contract.md Behavior Guarantees 11, 13; roadmap.md Phase 3.4/4.4, tasks.md
 * Task 3.6, 3.7, 4.4; T22, T23, T26.
 *
 * Per roadmap.md's "Build coupling" note (AL-20), `dist/` must be freshly
 * built (`npm run build`) before these additions are trusted: this file
 * spawns `bin/harness.js`, which imports `dist/`, never `src/` directly. At
 * red time, `dist/` reflects the pre-feature registry (`claude-code` only),
 * so `--tools cursor` / `kiro` / `github-copilot` correctly resolve to
 * NO_GENERATOR (exit 4) until the executor registers the three new
 * generators — that is the expected red-phase failure here, not a spawn or
 * packaging error.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, REPO_ROOT } from './helpers/paths.js';

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

describe('init --yes --tools cursor end to end (intent.md success criteria) (Gu 11) (T22)', () => {
  it('exits 0 and produces exactly the contracted Cursor file set', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli(['init', targetDir, '--yes', '--tools', 'cursor']);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    expect(files.sort()).toEqual(
      [
        '.cursor/agents/sdd-architect.md',
        '.cursor/agents/sdd-test-writer.md',
        '.cursor/agents/sdd-executor.md',
        '.cursor/agents/sdd-auditor.md',
        '.cursor/agents/sdd-documentation.md',
        '.cursor/skills/sdd-conductor/SKILL.md',
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

describe('init --yes --tools kiro end to end (intent.md success criteria) (Gu 11) (T22)', () => {
  it('exits 0 and produces exactly the contracted Kiro file set, under .kiro/ with <role>.md naming', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli(['init', targetDir, '--yes', '--tools', 'kiro']);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    expect(files.sort()).toEqual(
      [
        '.kiro/agents/sdd-architect.md',
        '.kiro/agents/sdd-test-writer.md',
        '.kiro/agents/sdd-executor.md',
        '.kiro/agents/sdd-auditor.md',
        '.kiro/agents/sdd-documentation.md',
        '.kiro/skills/sdd-conductor/SKILL.md',
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

describe('init --yes --tools github-copilot end to end (intent.md success criteria) (Gu 11) (T22)', () => {
  it('exits 0 and produces exactly the contracted Copilot file set, under .github/ with <role>.agent.md naming', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli(['init', targetDir, '--yes', '--tools', 'github-copilot']);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    expect(files.sort()).toEqual(
      [
        '.github/agents/sdd-architect.agent.md',
        '.github/agents/sdd-test-writer.agent.md',
        '.github/agents/sdd-executor.agent.md',
        '.github/agents/sdd-auditor.agent.md',
        '.github/agents/sdd-documentation.agent.md',
        '.github/skills/sdd-conductor/SKILL.md',
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

describe('init --yes --tools codex end to end (contract.md SC2, Gu 14, 15) (Task 4.4)', () => {
  it('exits 0 and produces exactly the contracted Codex file set: 6 tool artifacts + 6 shared files', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli(['init', targetDir, '--yes', '--tools', 'codex']);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    const expectedFiles = [
      '.codex/agents/sdd-architect.toml',
      '.codex/agents/sdd-test-writer.toml',
      '.codex/agents/sdd-executor.toml',
      '.codex/agents/sdd-auditor.toml',
      '.codex/agents/sdd-documentation.toml',
      '.agents/skills/sdd-conductor/SKILL.md',
      '.sdd/spec-schema/intent.md',
      '.sdd/spec-schema/contract.md',
      '.sdd/spec-schema/roadmap.md',
      '.sdd/spec-schema/tasks.md',
      '.sdd/spec-schema/audit.md',
      '.sdd/harness.json',
    ];
    expect(files.sort()).toEqual(expectedFiles.sort());

    // Every generated path is relative and contained within the target
    // directory -- no absolute path, no ".." segment.
    for (const file of files) {
      expect(path.isAbsolute(file)).toBe(false);
      expect(file.split('/')).not.toContain('..');
    }

    // Every artifact -- TOML and Markdown alike -- ends in exactly one "\n".
    for (const file of files) {
      const contents = await fs.readFile(path.join(targetDir, file), 'utf8');
      expect(contents.endsWith('\n'), `${file} does not end in a newline`).toBe(true);
      expect(contents.endsWith('\n\n'), `${file} ends in more than one newline`).toBe(false);
    }
  });

  it('produces byte-identical output across two independent codex-only runs', async () => {
    const targetDirA = await makeTempDir();
    const targetDirB = await makeTempDir();

    const runA = await runCli(['init', targetDirA, '--yes', '--tools', 'codex']);
    const runB = await runCli(['init', targetDirB, '--yes', '--tools', 'codex']);
    expect(runA.code).toBe(0);
    expect(runB.code).toBe(0);

    const filesA = (await listFilesRecursively(targetDirA)).sort();
    const filesB = (await listFilesRecursively(targetDirB)).sort();
    expect(filesA).toEqual(filesB);

    for (const file of filesA) {
      const contentsA = await fs.readFile(path.join(targetDirA, file), 'utf8');
      const contentsB = await fs.readFile(path.join(targetDirB, file), 'utf8');
      expect(contentsA).toBe(contentsB);
    }
  });
});

describe('init --yes --tools claude-code,cursor,kiro,github-copilot,codex end to end (Gu 10, 11, 14) (T23)', () => {
  // Extended from four tools / 24 tool artifacts to five tools / 30
  // (specs/codex-generator tasks.md Task 3.6, contract.md guarantee 14): codex
  // now ships its own generator too, so "all shipped tools" is five, not four.
  it('emits 30 tool artifacts (5 tools x 5 roles + 1 conductor) plus exactly one copy of each shared artifact', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code,cursor,kiro,github-copilot,codex',
    ]);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);

    const toolArtifacts = files.filter((f) => !f.startsWith('.sdd/'));
    expect(toolArtifacts).toHaveLength(30);

    const specSchemaFiles = files.filter((f) => f.startsWith('.sdd/spec-schema/'));
    expect(specSchemaFiles).toHaveLength(5);
    expect(files.filter((f) => f === '.sdd/harness.json')).toHaveLength(1);
  });

  it('writes .sdd/spec-schema/*.md byte-identical to templates/spec-schema/*.md exactly once', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code,cursor,kiro,github-copilot,codex',
    ]);
    expect(code).toBe(0);

    for (const name of ['intent', 'contract', 'roadmap', 'tasks', 'audit']) {
      const generated = await fs.readFile(
        path.join(targetDir, '.sdd', 'spec-schema', `${name}.md`),
        'utf8',
      );
      const canonical = await fs.readFile(
        path.join(REAL_TEMPLATES_ROOT, 'spec-schema', `${name}.md`),
        'utf8',
      );
      expect(generated).toBe(canonical);
    }
  });
});

describe('determinism for the three new tools (Gu 13) (T26)', () => {
  it.each(['cursor', 'kiro', 'github-copilot'] as const)(
    'produces byte-identical output across two independent %s runs',
    async (tool) => {
      const targetDirA = await makeTempDir();
      const targetDirB = await makeTempDir();

      const runA = await runCli(['init', targetDirA, '--yes', '--tools', tool]);
      const runB = await runCli(['init', targetDirB, '--yes', '--tools', tool]);
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
    },
  );
});
