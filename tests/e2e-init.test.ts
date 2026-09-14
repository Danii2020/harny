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
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantees 1, 2, 3, 9, 13, 22; intent.md SC6,
 * SC7, SC12, SC18; roadmap.md Phase 4.3; tasks.md Task 4.4. Every expected
 * file set below is amended (S3/S4) to include the default skill-library
 * artifacts this feature adds; the artifact-count table in `contract.md` §
 * Data Models is the oracle for every total asserted here (21 / 33 / 63 / 69
 * / 60). `.agents/skills/`, `.claude/skills/` and `.kiro/skills/` are new
 * distinct roots that must be told apart from the tool-specific conductor
 * artifact directory of the same name where they coincide (Claude Code,
 * Kiro, Codex) — see `skillLibraryRelativePaths` and `isSkillLibraryPath`
 * below.
 *
 * Red-phase note: at red time, none of the new skill-library file sets exist
 * (no `templates/skills/`, no `skillsDir`, no `buildSkillFiles`), so every
 * expected-path assertion below fails by omission — the actual written set
 * is the old, pre-feature set, missing every `harny-*`/`README.md` path. That
 * is the correct red-phase failure: a behavioral assertion failure naming
 * exactly what is missing, not a spawn or typo error.
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

/** A path is part of the shared skill-library artifact set (as opposed to a
 *  tool's own `sdd-conductor/SKILL.md`, which can live in the same top-level
 *  `skills/` directory for Claude Code, Kiro and Codex) when its second path
 *  segment is `README.md` or a `harny-*` directory, never `sdd-conductor`. */
function isSkillLibraryPath(relativePath: string): boolean {
  return /^\.(agents|claude|kiro)\/skills\/(harny-[^/]+\/|README\.md$)/.test(relativePath);
}

/** The ten default-selection skill-library relative sub-paths (seven core
 *  skills — including `harny-feedback`, `agent-feedback-controls` Phase 3 —
 *  plus the default optional `harny-standards`, the shape-contract README and
 *  harny-sync's bundled resource), rooted under `rootDir`. Mirrors
 *  `contract.md`'s per-root file count for the default selection (1 + 8 + 1
 *  = 10), independent of `src/vocabulary.ts`. */
function defaultSkillLibraryPaths(rootDir: string): string[] {
  return [
    `${rootDir}/README.md`,
    `${rootDir}/harny-audit/SKILL.md`,
    `${rootDir}/harny-document/SKILL.md`,
    `${rootDir}/harny-feedback/SKILL.md`,
    `${rootDir}/harny-implement/SKILL.md`,
    `${rootDir}/harny-propose/SKILL.md`,
    `${rootDir}/harny-standards/SKILL.md`,
    `${rootDir}/harny-sync/SKILL.md`,
    `${rootDir}/harny-sync/capability-template.md`,
    `${rootDir}/harny-test/SKILL.md`,
  ];
}

/** **(NEW — agent-feedback-controls, Phase 2/4.)** The tool-neutral feedback
 *  artifacts every real `harny init` run now writes exactly once, regardless
 *  of tool selection (BG-10): the shared runner, the CI workflow, and the
 *  scratch-directory `.gitignore` that keeps runtime turn files out of
 *  `git status` in the target repo (contract.md § State Changes). */
const SHARED_FEEDBACK_PATHS = [
  '.sdd/feedback/run-feedback.mjs',
  '.sdd/feedback/.turns/.gitignore',
  '.github/workflows/harny-feedback.yml',
];

describe('init --yes --tools claude-code end to end (R4) (T36)', () => {
  it('exits 0 with exactly the contracted twenty-one files (contract.md artifact-count table, default row)', async () => {
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
        ...defaultSkillLibraryPaths('.claude/skills'),
        // (agent-feedback-controls, Phase 2.) Claude Code is the only resolved
        // generator whose `renderHook` emits an artifact at this phase (BG-2);
        // the runner + CI workflow are tool-neutral, written exactly once
        // (BG-10).
        '.claude/settings.json',
        ...SHARED_FEEDBACK_PATHS,
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(26);
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
  it('writes nothing at all — not even .sdd/ — and prints the planned file list, including skill artifacts (Gu 14, SC14)', async () => {
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
    expect(stdout).toContain('.claude/skills/harny-sync/SKILL.md');
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
  it('exits 0 and produces exactly the contracted Cursor file set, with skills under .agents/skills (D2)', async () => {
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
        ...defaultSkillLibraryPaths('.agents/skills'),
        // (agent-feedback-controls, Phase 6.) Cursor's own hook now ships for
        // real (`.cursor/hooks.json`, BG-2); the runner + CI workflow are
        // tool-neutral and still written once (BG-10).
        '.cursor/hooks.json',
        ...SHARED_FEEDBACK_PATHS,
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(26);
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
        ...defaultSkillLibraryPaths('.kiro/skills'),
        // (agent-feedback-controls, Phase 6.) Kiro's own hook now ships for
        // real (`.kiro/hooks/harny-feedback.json`, BG-2); the runner + CI
        // workflow are tool-neutral and still written once (BG-10).
        '.kiro/hooks/harny-feedback.json',
        ...SHARED_FEEDBACK_PATHS,
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(26);
  });
});

describe('init --yes --tools github-copilot end to end (intent.md success criteria) (Gu 11) (T22)', () => {
  it('exits 0 and produces exactly the contracted Copilot file set, under .github/ with <role>.agent.md naming, skills under .agents/skills (D2)', async () => {
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
        ...defaultSkillLibraryPaths('.agents/skills'),
        // (agent-feedback-controls, Phase 6.) Copilot's own hook now ships
        // for real (`.github/hooks/harny-feedback.json`, BG-2); the runner +
        // CI workflow are tool-neutral and still written once (BG-10).
        '.github/hooks/harny-feedback.json',
        ...SHARED_FEEDBACK_PATHS,
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(26);
  });
});

describe('init --yes --tools codex end to end (contract.md SC2, Gu 14, 15) (Task 4.4)', () => {
  it('exits 0 and produces exactly the contracted Codex file set: 7 tool artifacts + 9 skill artifacts + 6 shared files', async () => {
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
      ...defaultSkillLibraryPaths('.agents/skills'),
      // (agent-feedback-controls, Phase 6.) Codex's own hook now ships for
      // real (`hooks.json`, BG-2); the runner + CI workflow are tool-neutral
      // and still written once (BG-10).
      'hooks.json',
      ...SHARED_FEEDBACK_PATHS,
      '.sdd/spec-schema/intent.md',
      '.sdd/spec-schema/contract.md',
      '.sdd/spec-schema/roadmap.md',
      '.sdd/spec-schema/tasks.md',
      '.sdd/spec-schema/audit.md',
      '.sdd/harness.json',
    ];
    expect(files.sort()).toEqual(expectedFiles.sort());
    expect(files).toHaveLength(26);

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
  //
  // specs/templates-skill-library-parity extends this again: the default
  // skill selection now writes 27 more artifacts (9 files x 3 distinct
  // roots), for a new total of 63 (contract.md § Data Models, "all
  // (default skills)" row). Tool artifacts and skill-library artifacts must
  // be told apart via `isSkillLibraryPath`, not by a "starts with .sdd/"
  // filter alone, because Claude Code's, Kiro's and Codex's conductor
  // artifacts share a top-level `skills/` directory with the new skill
  // library files for those three tools.
  //
  // (agent-feedback-controls extends this again.) `harny-feedback` joining
  // CORE_SKILL_IDS (Phase 3) adds one file per root (27 -> 30). Phase 2 adds
  // three more non-skill-library artifacts: `.claude/settings.json` (the only
  // resolved generator whose `renderHook` emitted one at that phase, BG-14) and
  // the tool-neutral `.sdd/feedback/run-feedback.mjs` +
  // `.github/workflows/harny-feedback.yml` (BG-10) — the runner lands under
  // `.sdd/`, so it joins `sharedFiles`'s count, not `toolArtifacts`'s. Phase 4
  // adds one more shared file, `.sdd/feedback/.turns/.gitignore` (also under
  // `.sdd/`), bringing shared from 7 to 8. Phase 6 ships the remaining four
  // generators' real `renderHook` implementations, adding one hook artifact
  // each (`.cursor/hooks.json`, `.kiro/hooks/harny-feedback.json`,
  // `.github/hooks/harny-feedback.json`, `hooks.json`): 32 -> 36 tool
  // artifacts. New total: 36 tool artifacts + 30 skill-library artifacts + 8
  // shared = 74.
  it('emits 36 tool artifacts, 30 skill-library artifacts (3 roots x 10 files), and 8 shared files — 74 total', async () => {
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
    expect(files).toHaveLength(74);

    const sharedFiles = files.filter((f) => f.startsWith('.sdd/'));
    expect(sharedFiles).toHaveLength(8);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(30);
    expect(new Set(skillLibraryFiles.map((f) => f.split('/').slice(0, 2).join('/')))).toEqual(
      new Set(['.agents/skills', '.claude/skills', '.kiro/skills']),
    );
    // Never under a fourth or fifth root.
    expect(skillLibraryFiles.some((f) => f.startsWith('.cursor/skills/'))).toBe(false);
    expect(skillLibraryFiles.some((f) => f.startsWith('.github/skills/'))).toBe(false);

    const toolArtifacts = files.filter((f) => !f.startsWith('.sdd/') && !isSkillLibraryPath(f));
    expect(toolArtifacts).toHaveLength(36);
    expect(toolArtifacts).toContain('.claude/settings.json');
    expect(toolArtifacts).toContain('.cursor/hooks.json');
    expect(toolArtifacts).toContain('.kiro/hooks/harny-feedback.json');
    expect(toolArtifacts).toContain('.github/hooks/harny-feedback.json');
    expect(toolArtifacts).toContain('hooks.json');
    expect(toolArtifacts).toContain('.github/workflows/harny-feedback.yml');

    const specSchemaFiles = files.filter((f) => f.startsWith('.sdd/spec-schema/'));
    expect(specSchemaFiles).toHaveLength(5);
    expect(files.filter((f) => f === '.sdd/harness.json')).toHaveLength(1);
    expect(files.filter((f) => f === '.sdd/feedback/run-feedback.mjs')).toHaveLength(1);
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

  it('every skill-library file under .agents/skills is byte-identical to its counterpart under .claude/skills and .kiro/skills (Gu 10)', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code,cursor,kiro,github-copilot,codex',
    ]);
    expect(code).toBe(0);

    const agentsFiles = (await listFilesRecursively(path.join(targetDir, '.agents', 'skills'))).filter(
      (f) => f === 'README.md' || f.startsWith('harny-'),
    );
    expect(agentsFiles.length).toBeGreaterThan(0);

    for (const relative of agentsFiles) {
      const agentsContents = await fs.readFile(path.join(targetDir, '.agents', 'skills', relative), 'utf8');
      const claudeContents = await fs.readFile(path.join(targetDir, '.claude', 'skills', relative), 'utf8');
      const kiroContents = await fs.readFile(path.join(targetDir, '.kiro', 'skills', relative), 'utf8');
      expect(claudeContents).toBe(agentsContents);
      expect(kiroContents).toBe(agentsContents);
    }
  });
});

describe('--skills all and --skills none amend the default skill-library artifact count (Gu 16, 17; contract.md artifact-count table)', () => {
  it('--tools all --skills all writes 36 skill-library artifacts (3 roots x 12 files) for 75 total', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code,cursor,kiro,github-copilot,codex',
      '--skills',
      'all',
    ]);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    // (agent-feedback-controls.) +3 skill-library files (harny-feedback x 3
    // roots) and +8 non-skill-library artifacts over the pre-feature 69:
    // `.claude/settings.json`, `.sdd/feedback/run-feedback.mjs`,
    // `.sdd/feedback/.turns/.gitignore`, `.github/workflows/harny-feedback.yml`
    // (Phase 2/4), plus Phase 6's four remaining hook artifacts
    // (`.cursor/hooks.json`, `.kiro/hooks/harny-feedback.json`,
    // `.github/hooks/harny-feedback.json`, `hooks.json`).
    expect(files).toHaveLength(80);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(36);
  });

  it('--tools all --skills none writes 27 skill-library artifacts (3 roots x 9 files) for 66 total, core skills still present', async () => {
    const targetDir = await makeTempDir();

    const { code } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code,cursor,kiro,github-copilot,codex',
      '--skills',
      'none',
    ]);

    expect(code).toBe(0);
    const files = await listFilesRecursively(targetDir);
    // (agent-feedback-controls.) Same +3/+8 shift as the --skills all case
    // above, over the pre-feature 60.
    expect(files).toHaveLength(71);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(27);
    // Core skills are never deselectable (Gu 14): harny-sync must still be present.
    expect(skillLibraryFiles.some((f) => f.endsWith('harny-sync/SKILL.md'))).toBe(true);
    // The optional harny-standards must be absent under --skills none.
    expect(skillLibraryFiles.some((f) => f.includes('harny-standards'))).toBe(false);
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
