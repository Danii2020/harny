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
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes ("Packaging: `templates/**` goes from
 * 26 files to 30"; the new `.sdd/doctor/run-doctor.mjs`,
 * `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs` artifacts); Behavior
 * Guarantees 11, 12, 17; intent.md SC4; audit.md Test Coverage T21.
 *
 * `defaultSkillLibraryPaths` gains `harny-doctor/SKILL.md` (10 -> 11 files per
 * root) and every scenario below gains the three tool-neutral doctor/shared
 * artifacts (`SHARED_DOCTOR_PATHS`) alongside the existing
 * `SHARED_FEEDBACK_PATHS`. Every `toHaveLength(26)` below becomes 30 (one new
 * skill-library file plus three new tool-neutral files, per scenario). At red
 * time none of these four new files exist yet, so every expected-path/count
 * assertion below fails by omission, not by a wrong assumption about the
 * spawned CLI's behavior.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md Behavior Guarantee MC-1 (`buildMcpFiles` joining `runInit`
 * step 11); the `TG-10` amendment (one MCP config artifact per resolved
 * generator declaring `mcpConfig`). Every single-tool scenario below gains
 * exactly one MCP file at that tool's own path (`.mcp.json`, `.cursor/mcp.json`,
 * `.kiro/settings/mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`), and
 * every `toHaveLength(30)` below becomes 31; the five-tool and `--skills`
 * scenarios each gain all five MCP files (80 -> 85, 86 -> 91, 77 -> 82). This
 * amendment is consequential test maintenance for a declared `TG-10`/`CLI-10`
 * amendment, not part of context7-mcp's own approved 55-test red phase — see
 * the executor's final report for why it was made here rather than left red.
 *
 * ---
 * Spec: specs/ci-workflow-root
 * Covers: intent.md SC1, SC3, SC8, SC9, SC11; contract.md Behavior Guarantees
 * CW-6, CW-7, WR-6, WR-9, DR-1; audit.md Test Coverage T24-T29. These describe
 * blocks spawn the real, built CLI against a real temporary git repository (a
 * `.git` directory created by `git init`), the shape every downstream
 * subdirectory install actually runs in.
 *
 * At red time, `dist/cli.js` still writes the CI workflow to
 * `<installDir>/.github/workflows/harny-feedback.yml` unconditionally (no
 * git-root discovery exists in `src/` at all yet, per contract.md C3) — every
 * test below is expected to fail because the workflow never appears at the
 * repository root, and a file named `harny-feedback.yml` appears inside the
 * install directory instead, not because of a wrong assumption about the CLI's
 * exit codes or output shape.
 *
 * The final describe block below (`npx harny doctor` and the direct runner
 * agree...) additionally covers Behavior Guarantee DR-3 and intent.md SC12
 * (RD-7 preserved for a subdirectory install) beyond `audit.md`'s own
 * Test Coverage table, which does not enumerate a dedicated id for the
 * verb-vs-direct-runner agreement specifically — added because both are
 * mechanically testable and cheap given the fixtures T29 already needed.
 *
 * ---
 * Spec: specs/monorepo-mode
 * Covers: intent.md SC1, SC2, SC10; contract.md Behavior Guarantees MC-1,
 * MC-3, MC-5, MC-6, MC-13, MC-20, MC-23; audit.md Test Coverage T1, T2, T23,
 * T36.
 *
 * ## The golden-byte regression (T1, T2) — the declared PASS exception
 *
 * `tests/fixtures/golden/monorepo-mode/{ts-root,py-sub}/` were captured from
 * this exact CLI, on this exact commit, BEFORE any implementation edit for
 * this feature exists (roadmap.md Phase 4 step 1: "capture the full generated
 * tree... before any change"). The two describe blocks that compare against
 * them are therefore expected to PASS already, right now, at red time —
 * there is nothing yet that could have drifted. This is deliberate and is
 * the single most load-bearing test in this feature (roadmap.md's own
 * words): it is what proves, mechanically rather than by inspection, that a
 * `components`-free install's bytes do not drift as the rest of this feature
 * lands. It stays live and reported (not skipped) so it starts protecting
 * the instant any single-repo rendering path is touched.
 *
 * ## The two-component end-to-end install (T36) and the doctor verb/direct
 * agreement (T23, MC-23)
 *
 * `--component` is not a registered flag yet at red time (see this file's
 * `--component <path>=<stack>` cli.test.ts note for the identical reason), so
 * every test below that passes it is expected to fail on commander's own
 * "unknown option" usage error (exit 1), not a wrong assumption about the
 * artifact set a real two-component install should produce.
 *
 * ## Post-audit amendment (audit.md row A2, finding F1)
 *
 * Also covers MC-21 end to end for the one-component boundary: an install
 * declaring a single component that is NOT the repository root. The last
 * describe block drives the real CLI and then the real
 * `.sdd/doctor/run-doctor.mjs` it generated, in a fixture where the install
 * root and `apps/web` give opposite probe answers. Expected red until
 * `buildDoctorChecks` stops gating `dir` on `components.length > 1`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, REPO_ROOT, TESTS_DIR } from './helpers/paths.js';
import { assertNoRepoAbove } from './helpers/git.js';

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

/** Like `listFilesRecursively`, but never descends into a `.git` directory —
 *  for listing a real git repository's working tree (specs/monorepo-mode's
 *  golden-byte fixtures below spawn `git init` at the repo root). */
async function listFilesRecursivelyExcludingGit(dir: string, root: string = dir): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursivelyExcludingGit(full, root)));
    } else {
      files.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
  return files;
}

/** Compares two directory trees (excluding `.git`) for exact path-SET equality
 *  and byte-for-byte content equality of every file — the golden-byte
 *  regression oracle for specs/monorepo-mode's SC2. Raw `Buffer`s, not `utf8`
 *  strings: a byte-identity guarantee should not be laundered through a text
 *  decode/re-encode step.
 *
 *  `contractedExceptions` names paths whose bytes this feature's own
 *  `roadmap.md` File Change Map contracts as changing; they are excluded from
 *  the byte comparison ONLY. The path-set equality above still covers them (no
 *  file may appear or vanish), each is asserted to actually be present (a stale
 *  or misspelled exception cannot quietly vacate the guard), and each test
 *  below re-asserts something specific about every file it excludes — see the
 *  declared-exception docblock on the describe block. */
async function assertTreesByteIdentical(
  actualRoot: string,
  goldenRoot: string,
  contractedExceptions: readonly string[] = [],
): Promise<void> {
  const actualFiles = (await listFilesRecursivelyExcludingGit(actualRoot)).sort();
  const goldenFiles = (await listFilesRecursivelyExcludingGit(goldenRoot)).sort();
  expect(actualFiles).toEqual(goldenFiles);

  for (const exception of contractedExceptions) {
    expect(
      actualFiles,
      `declared byte-comparison exception ${exception} is not in the tree; the exception list is stale`,
    ).toContain(exception);
  }

  let compared = 0;
  for (const relativePath of actualFiles) {
    if (contractedExceptions.includes(relativePath)) continue;
    const actualBytes = await fs.readFile(path.join(actualRoot, relativePath));
    const goldenBytes = await fs.readFile(path.join(goldenRoot, relativePath));
    expect(
      actualBytes.equals(goldenBytes),
      `${relativePath} differs from its golden byte-for-byte`,
    ).toBe(true);
    compared += 1;
  }

  // Non-vacuity, two ways. The exception list may not grow past the three
  // files roadmap.md's File Change Map contracts without someone re-reading
  // this docblock, and the tree that remains under byte comparison must still
  // be a real tree — an exception list that swallowed the install would leave
  // a guard that looks like coverage and is not.
  expect(
    contractedExceptions.length,
    'more than three files are excluded from byte comparison; see the declared-exception docblock',
  ).toBeLessThanOrEqual(3);
  expect(compared, 'almost nothing was byte-compared').toBeGreaterThan(20);
}

/** Asserts `actual` is `golden` with exactly ONE contiguous block of lines
 *  inserted, every inserted line being a YAML comment. That is precisely
 *  specs/monorepo-mode MC-14's claim about the generated workflow: the header
 *  comment gains one paragraph and nothing functional moves, is removed or is
 *  rewritten. Computed from a common prefix/suffix rather than by greedy
 *  line matching, so repeated `#` lines at the seam cannot mis-align it. */
function assertDiffersOnlyByInsertedCommentLines(actual: string, golden: string, label: string): void {
  const actualLines = actual.split('\n');
  const goldenLines = golden.split('\n');
  expect(actualLines.length, `${label}: golden has more lines than the generated file`).toBeGreaterThanOrEqual(
    goldenLines.length,
  );

  let prefix = 0;
  while (prefix < goldenLines.length && actualLines[prefix] === goldenLines[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < goldenLines.length - prefix &&
    actualLines[actualLines.length - 1 - suffix] === goldenLines[goldenLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  expect(
    prefix + suffix,
    `${label}: the difference from the golden is not a single contiguous insertion (no line may be removed, reordered or rewritten)`,
  ).toBe(goldenLines.length);

  const inserted = actualLines.slice(prefix, actualLines.length - suffix);
  const nonComment = inserted.filter((line) => !line.startsWith('#'));
  expect(nonComment, `${label}: inserted non-comment line(s):\n${nonComment.join('\n')}`).toEqual([]);
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
    // (readiness-doctor) the eleventh default-selection file: harny-doctor is
    // core, always scaffolded, exactly like every other core skill.
    `${rootDir}/harny-doctor/SKILL.md`,
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

/** **(NEW — readiness-doctor.)** The tool-neutral readiness-check artifacts
 *  every real `harny init` run now also writes exactly once, regardless of
 *  tool selection: the canonical runner, its generated checks data, and the
 *  shared probe module both the feedback runner and the doctor runner import
 *  (contract.md § State Changes; C27). */
const SHARED_DOCTOR_PATHS = [
  '.sdd/doctor/run-doctor.mjs',
  '.sdd/doctor/checks.json',
  '.sdd/shared/probes.mjs',
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
        ...SHARED_DOCTOR_PATHS,
        // (context7-mcp.) The default Context7 MCP server, written to Claude
        // Code's own project-scope config file.
        '.mcp.json',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(31);
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
        ...SHARED_DOCTOR_PATHS,
        // (context7-mcp.) The default Context7 MCP server, written to Cursor's
        // own project-scope config file.
        '.cursor/mcp.json',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(31);
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
        ...SHARED_DOCTOR_PATHS,
        // (context7-mcp.) The default Context7 MCP server, written to Kiro's
        // own workspace-scope config file.
        '.kiro/settings/mcp.json',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(31);
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
        ...SHARED_DOCTOR_PATHS,
        // (context7-mcp.) The default Context7 MCP server, written to VS
        // Code's own MCP config file — Copilot's `mcpConfig`, root key `servers`.
        '.vscode/mcp.json',
        '.sdd/spec-schema/intent.md',
        '.sdd/spec-schema/contract.md',
        '.sdd/spec-schema/roadmap.md',
        '.sdd/spec-schema/tasks.md',
        '.sdd/spec-schema/audit.md',
        '.sdd/harness.json',
      ].sort(),
    );
    expect(files).toHaveLength(31);
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
      ...SHARED_DOCTOR_PATHS,
      // (context7-mcp.) The default Context7 MCP server, appended to Codex's
      // own project-scope config file — not an MCP-only file (contract.md §
      // "The write model"), but empty here since no `.codex/config.toml`
      // pre-existed.
      '.codex/config.toml',
      '.sdd/spec-schema/intent.md',
      '.sdd/spec-schema/contract.md',
      '.sdd/spec-schema/roadmap.md',
      '.sdd/spec-schema/tasks.md',
      '.sdd/spec-schema/audit.md',
      '.sdd/harness.json',
    ];
    expect(files.sort()).toEqual(expectedFiles.sort());
    expect(files).toHaveLength(31);

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
  // artifacts. New total (pre-readiness-doctor): 36 tool artifacts + 30
  // skill-library artifacts + 8 shared = 74.
  //
  // (specs/readiness-doctor extends this again.) `harny-doctor` joining
  // CORE_SKILL_IDS adds one skill-library file per root (30 -> 33). Three new
  // tool-neutral shared artifacts join `.sdd/`: `.sdd/doctor/run-doctor.mjs`,
  // `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs` (8 -> 11). Tool
  // artifacts are unaffected (still 36). New total: 36 + 33 + 11 = 80.
  //
  // (specs/context7-mcp extends this again.) All five resolved generators
  // declare an `mcpConfig`, so all five MCP files join `toolArtifacts` (36 ->
  // 41; none is a skill-library path and none lives under `.sdd/`). New total:
  // 41 + 33 + 11 = 85.
  it('emits 41 tool artifacts, 33 skill-library artifacts (3 roots x 11 files), and 11 shared files — 85 total', async () => {
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
    expect(files).toHaveLength(85);

    const sharedFiles = files.filter((f) => f.startsWith('.sdd/'));
    expect(sharedFiles).toHaveLength(11);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(33);
    expect(new Set(skillLibraryFiles.map((f) => f.split('/').slice(0, 2).join('/')))).toEqual(
      new Set(['.agents/skills', '.claude/skills', '.kiro/skills']),
    );
    // Never under a fourth or fifth root.
    expect(skillLibraryFiles.some((f) => f.startsWith('.cursor/skills/'))).toBe(false);
    expect(skillLibraryFiles.some((f) => f.startsWith('.github/skills/'))).toBe(false);

    const toolArtifacts = files.filter((f) => !f.startsWith('.sdd/') && !isSkillLibraryPath(f));
    expect(toolArtifacts).toHaveLength(41);
    expect(toolArtifacts).toContain('.claude/settings.json');
    expect(toolArtifacts).toContain('.cursor/hooks.json');
    expect(toolArtifacts).toContain('.kiro/hooks/harny-feedback.json');
    expect(toolArtifacts).toContain('.github/hooks/harny-feedback.json');
    expect(toolArtifacts).toContain('hooks.json');
    expect(toolArtifacts).toContain('.github/workflows/harny-feedback.yml');
    // (context7-mcp.) One MCP config file per resolved generator.
    expect(toolArtifacts).toContain('.mcp.json');
    expect(toolArtifacts).toContain('.cursor/mcp.json');
    expect(toolArtifacts).toContain('.kiro/settings/mcp.json');
    expect(toolArtifacts).toContain('.vscode/mcp.json');
    expect(toolArtifacts).toContain('.codex/config.toml');

    const specSchemaFiles = files.filter((f) => f.startsWith('.sdd/spec-schema/'));
    expect(specSchemaFiles).toHaveLength(5);
    expect(files.filter((f) => f === '.sdd/harness.json')).toHaveLength(1);
    expect(files.filter((f) => f === '.sdd/feedback/run-feedback.mjs')).toHaveLength(1);
    // (readiness-doctor) the three new tool-neutral doctor/shared artifacts,
    // each written exactly once regardless of the five-tool selection.
    expect(files.filter((f) => f === '.sdd/doctor/run-doctor.mjs')).toHaveLength(1);
    expect(files.filter((f) => f === '.sdd/doctor/checks.json')).toHaveLength(1);
    expect(files.filter((f) => f === '.sdd/shared/probes.mjs')).toHaveLength(1);
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
    //
    // (readiness-doctor.) +3 skill-library files (harny-doctor x 3 roots,
    // 36 -> 39) and +3 tool-neutral artifacts (`.sdd/doctor/run-doctor.mjs`,
    // `.sdd/doctor/checks.json`, `.sdd/shared/probes.mjs`) over the
    // pre-readiness-doctor 80.
    //
    // (context7-mcp.) +5 tool artifacts (one MCP config file per resolved
    // generator) over the pre-context7-mcp 86.
    expect(files).toHaveLength(91);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(39);
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
    //
    // (readiness-doctor.) harny-doctor is core, so it is present under
    // --skills none too: +3 skill-library files (27 -> 30) and the same +3
    // tool-neutral artifacts as every other scenario, over the
    // pre-readiness-doctor 71.
    //
    // (context7-mcp.) +5 tool artifacts (one MCP config file per resolved
    // generator) over the pre-context7-mcp 77.
    expect(files).toHaveLength(82);

    const skillLibraryFiles = files.filter(isSkillLibraryPath);
    expect(skillLibraryFiles).toHaveLength(30);
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

/** Runs `node <scriptPath>` and never rejects — a non-zero exit becomes part of
 *  the resolved value, mirroring `runCli`'s own convention above. Used for the
 *  direct `run-doctor.mjs` invocation (T29), which legitimately exits 2 on a
 *  red readiness result. */
async function runNodeScript(
  scriptPath: string,
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [scriptPath], { cwd });
    return { code: 0, stdout, stderr };
  } catch (err: any) {
    return { code: typeof err.code === 'number' ? err.code : 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

describe('ci-workflow-root — a subdirectory install lands the workflow at the repository root (SC1, CW-6) (T24)', () => {
  it('writes .github/workflows/harny-feedback-apps-web.yml at the repo root and nothing named harny-feedback*.yml under apps/web', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });

    const { code } = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(code).toBe(0);

    const rootWorkflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-apps-web.yml');
    await expect(fs.access(rootWorkflowPath)).resolves.toBeUndefined();

    const installFiles = await listFilesRecursively(installDir);
    expect(installFiles.some((f) => /harny-feedback.*\.yml$/.test(f))).toBe(false);
  });
});

describe('ci-workflow-root — every non-workflow artifact path is unaffected by placement (CW-7) (T25)', () => {
  it('a subdirectory install\'s file set, minus the workflow, equals a root install\'s file set, minus the workflow', async () => {
    const rootTarget = await makeTempDir();
    const rootRun = await runCli(['init', rootTarget, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(rootRun.code).toBe(0);
    const rootFiles = (await listFilesRecursively(rootTarget)).filter((f) => !/harny-feedback.*\.yml$/.test(f));

    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });
    const subRun = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(subRun.code).toBe(0);
    const subFiles = (await listFilesRecursively(installDir)).filter((f) => !/harny-feedback.*\.yml$/.test(f));

    expect(subFiles.length).toBeGreaterThan(0);
    expect(subFiles.sort()).toEqual(rootFiles.sort());
  });
});

describe('ci-workflow-root — two installs at two different subdirectories never collide (SC8) (T26)', () => {
  it('produces two differently-named workflows at the repo root and leaves the first byte-unchanged', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const webDir = path.join(repoDir, 'apps', 'web');
    const apiDir = path.join(repoDir, 'services', 'api');
    await fs.mkdir(webDir, { recursive: true });
    await fs.mkdir(apiDir, { recursive: true });

    const first = await runCli(['init', webDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(first.code).toBe(0);
    const webWorkflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-apps-web.yml');
    const webWorkflowBefore = await fs.readFile(webWorkflowPath, 'utf8');

    const second = await runCli(['init', apiDir, '--yes', '--tools', 'claude-code', '--stack', 'python']);
    expect(second.code).toBe(0);
    const apiWorkflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-services-api.yml');
    await expect(fs.access(apiWorkflowPath)).resolves.toBeUndefined();

    const webWorkflowAfter = await fs.readFile(webWorkflowPath, 'utf8');
    expect(webWorkflowAfter).toBe(webWorkflowBefore);
  });
});

describe('ci-workflow-root — a name collision refuses loudly rather than overwriting silently (SC9, WR-6, WR-9) (T27)', () => {
  it('a second install at the same subdirectory exits 3 naming the workflow, writing nothing at either root; --force overwrites', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });

    const first = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(first.code).toBe(0);

    const workflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-apps-web.yml');
    const workflowBefore = await fs.readFile(workflowPath, 'utf8');
    const installFilesBefore = (await listFilesRecursively(installDir)).sort();

    const second = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(second.code).toBe(3);
    const combinedOutput = second.stdout + second.stderr;
    expect(combinedOutput).toContain('harny-feedback-apps-web.yml');

    // Nothing changed at either root.
    expect(await fs.readFile(workflowPath, 'utf8')).toBe(workflowBefore);
    expect((await listFilesRecursively(installDir)).sort()).toEqual(installFilesBefore);

    const third = await runCli([
      'init',
      installDir,
      '--yes',
      '--tools',
      'claude-code',
      '--stack',
      'typescript',
      '--force',
    ]);
    expect(third.code).toBe(0);
  });
});

describe('ci-workflow-root — an install with no repository above it behaves like today\'s, plus a warning (SC3, CW-3, CW-9) (T28)', () => {
  it('writes the workflow inside the install directory, exits 0, and warns', async () => {
    const targetDir = await makeTempDir();
    await assertNoRepoAbove(targetDir);

    const { code, stdout, stderr } = await runCli([
      'init',
      targetDir,
      '--yes',
      '--tools',
      'claude-code',
      '--stack',
      'typescript',
    ]);
    expect(code).toBe(0);

    const workflowPath = path.join(targetDir, '.github', 'workflows', 'harny-feedback.yml');
    await expect(fs.access(workflowPath)).resolves.toBeUndefined();

    const combined = stdout + stderr;
    expect(/not.*(inside|in a).*(git )?repository/i.test(combined)).toBe(true);
  });
});

describe('ci-workflow-root — the direct readiness runner agrees with the workflow\'s real location (SC11, DR-1) (T29)', () => {
  it('node run-doctor.mjs reports OK for ci-workflow when the root file exists, and FAIL once it is removed', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });

    const initResult = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(initResult.code).toBe(0);

    const runnerPath = path.join(installDir, '.sdd', 'doctor', 'run-doctor.mjs');
    const workflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-apps-web.yml');

    // Scoped to the single `ci-workflow` report line, deliberately NOT the
    // runner's overall exit code: a bare scaffold has other, unrelated
    // must-have gaps (no README.md, no AGENTS.md) that make the WHOLE run
    // report not-ready regardless of this feature — asserting the overall
    // exit code here would fail for that unrelated reason, not for anything
    // this feature is responsible for (contract.md DR-1 is about this one
    // check's report, not the aggregate verdict).
    const before = await runNodeScript(runnerPath, installDir);
    expect(before.stdout).toContain('OK ci-workflow');
    expect(before.stdout).not.toContain('FAIL ci-workflow');

    await fs.rm(workflowPath);

    const after = await runNodeScript(runnerPath, installDir);
    expect(after.stdout).toContain('FAIL ci-workflow');
    expect(after.stdout).not.toContain('OK ci-workflow');
  });
});

describe('ci-workflow-root — npx harny doctor and the direct runner agree for a subdirectory install (RD-7, SC12, DR-3)', () => {
  it('the doctor verb and node run-doctor.mjs give the same ci-workflow answer, both before and after removing the root workflow', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(installDir, { recursive: true });

    const initResult = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(initResult.code).toBe(0);

    const runnerPath = path.join(installDir, '.sdd', 'doctor', 'run-doctor.mjs');
    const workflowPath = path.join(repoDir, '.github', 'workflows', 'harny-feedback-apps-web.yml');

    const directBefore = await runNodeScript(runnerPath, installDir);
    const verbBefore = await runCli(['doctor', installDir]);
    expect(directBefore.stdout).toContain('OK ci-workflow');
    expect(verbBefore.stdout + verbBefore.stderr).not.toContain('FAIL ci-workflow');

    await fs.rm(workflowPath);

    const directAfter = await runNodeScript(runnerPath, installDir);
    const verbAfter = await runCli(['doctor', installDir]);
    expect(directAfter.stdout).toContain('FAIL ci-workflow');
    expect(verbAfter.stdout + verbAfter.stderr).toContain('FAIL ci-workflow');
  });
});

// ---------------------------------------------------------------------------
// specs/monorepo-mode
// ---------------------------------------------------------------------------

/**
 * ## Declared exception (green-phase narrowing of T1/T2)
 *
 * The two golden trees under `tests/fixtures/golden/monorepo-mode/` were
 * captured from this repository's `templates/` and `src/` BEFORE
 * specs/monorepo-mode's implementation phase, and they stay frozen — they are
 * not re-baselined here. SC2's guarantee is "a config with no `components`
 * produces a write plan whose paths and whose every file's bytes are identical
 * to the pre-change build's", and that is what these two tests assert.
 *
 * Three files per tree legitimately differ, and they are exactly the three
 * `roadmap.md`'s File Change Map contracts as carrying this feature's changes:
 *
 *   - `.sdd/feedback/run-feedback.mjs` — per-component dispatch (MC-9, MC-11,
 *     MC-12, MC-17, MC-18, MC-19)
 *   - `.sdd/doctor/run-doctor.mjs`     — `command.dir` resolution (MC-21)
 *   - the generated workflow            — MC-14's one new header paragraph
 *
 * They are excluded from the tree-wide byte comparison and re-asserted
 * individually instead, so none of the three is left unguarded:
 *
 *   - each runner is asserted byte-identical to the `templates/` file it is
 *     scaffolded from, which is the real invariant for a file `init` copies
 *     verbatim, and whose behavior is covered by
 *     `tests/hooks/run-feedback.test.ts` and `tests/doctor-runner.test.ts`;
 *   - the workflow is asserted to differ from its golden by exactly one
 *     contiguous insertion of YAML comment lines — MC-14's own claim that the
 *     header comment is the only canonical-region change and that nothing
 *     functional moved.
 *
 * Everything else — 28 of 31 files per tree — stays under the original
 * frozen-golden byte comparison, and `assertTreesByteIdentical` still asserts
 * full path-set equality across all 31 plus a cap of three exceptions.
 */
describe('golden-byte regression — a components-free install is byte-identical to the pre-feature capture, outside three contracted files (SC2, MC-5) (T1, T2)', () => {
  /** `templates/` source → scaffolded destination, for the two runner files
   *  excluded from the byte comparison above. `init` copies each verbatim, so
   *  this pins the excluded file's bytes to a file that IS under review. */
  const RUNNER_TEMPLATE_SOURCES: ReadonlyArray<readonly [string, string]> = [
    ['hooks/run-feedback.mjs', '.sdd/feedback/run-feedback.mjs'],
    ['doctor/run-doctor.mjs', '.sdd/doctor/run-doctor.mjs'],
  ];

  async function assertScaffoldedRunnersMatchTemplates(installDir: string): Promise<void> {
    for (const [templateRelative, scaffoldedRelative] of RUNNER_TEMPLATE_SOURCES) {
      const templateBytes = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, templateRelative));
      const scaffoldedBytes = await fs.readFile(path.join(installDir, ...scaffoldedRelative.split('/')));
      expect(
        scaffoldedBytes.equals(templateBytes),
        `${scaffoldedRelative} is not a verbatim copy of templates/${templateRelative}`,
      ).toBe(true);
    }
  }

  it('--stack typescript at a git repository root matches the ts-root golden, byte for byte, outside the three contracted files', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const goldenRoot = path.join(TESTS_DIR, 'fixtures', 'golden', 'monorepo-mode', 'ts-root');
    const workflowRelative = '.github/workflows/harny-feedback.yml';

    const { code } = await runCli(['init', repoDir, '--yes', '--tools', 'claude-code', '--stack', 'typescript']);
    expect(code).toBe(0);

    await assertTreesByteIdentical(repoDir, goldenRoot, [
      '.sdd/feedback/run-feedback.mjs',
      '.sdd/doctor/run-doctor.mjs',
      workflowRelative,
    ]);

    await assertScaffoldedRunnersMatchTemplates(repoDir);
    assertDiffersOnlyByInsertedCommentLines(
      await fs.readFile(path.join(repoDir, ...workflowRelative.split('/')), 'utf8'),
      await fs.readFile(path.join(goldenRoot, ...workflowRelative.split('/')), 'utf8'),
      workflowRelative,
    );
  });

  it('--stack python at a subdirectory of a git repository matches the py-sub golden, byte for byte, from the repository root down, outside the three contracted files', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const installDir = path.join(repoDir, 'apps', 'api');
    await fs.mkdir(installDir, { recursive: true });
    const goldenRoot = path.join(TESTS_DIR, 'fixtures', 'golden', 'monorepo-mode', 'py-sub');
    const workflowRelative = '.github/workflows/harny-feedback-apps-api.yml';

    const { code } = await runCli(['init', installDir, '--yes', '--tools', 'claude-code', '--stack', 'python']);
    expect(code).toBe(0);

    await assertTreesByteIdentical(repoDir, goldenRoot, [
      'apps/api/.sdd/feedback/run-feedback.mjs',
      'apps/api/.sdd/doctor/run-doctor.mjs',
      workflowRelative,
    ]);

    await assertScaffoldedRunnersMatchTemplates(installDir);
    assertDiffersOnlyByInsertedCommentLines(
      await fs.readFile(path.join(repoDir, ...workflowRelative.split('/')), 'utf8'),
      await fs.readFile(path.join(goldenRoot, ...workflowRelative.split('/')), 'utf8'),
      workflowRelative,
    );
  });
});

describe('a two-component install produces one .sdd/, one spec-schema set, one CI workflow, and correct per-component data (SC1, MC-1, MC-6, MC-13, MC-20) (T36)', () => {
  it('exits 0, writes exactly one of every tool-neutral/shared artifact, and records both components in .sdd/harness.json', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    await fs.mkdir(path.join(repoDir, 'apps', 'web'), { recursive: true });

    const { code } = await runCli([
      'init',
      repoDir,
      '--yes',
      '--tools',
      'claude-code',
      '--component',
      '.=python',
      '--component',
      'apps/web=typescript',
    ]);
    expect(code).toBe(0);

    const files = await listFilesRecursivelyExcludingGit(repoDir);

    // Exactly one of every tool-neutral/shared artifact family — never one per
    // component (SC1, G1).
    for (const singleton of [
      '.sdd/harness.json',
      '.sdd/feedback/run-feedback.mjs',
      '.sdd/doctor/run-doctor.mjs',
      '.sdd/doctor/checks.json',
      '.sdd/shared/probes.mjs',
      '.claude/settings.json',
      '.claude/skills/sdd-conductor/SKILL.md',
      '.github/workflows/harny-feedback.yml',
    ]) {
      expect(files.filter((f) => f === singleton), `expected exactly one ${singleton}`).toHaveLength(1);
    }

    const harnessJson = JSON.parse(await fs.readFile(path.join(repoDir, '.sdd', 'harness.json'), 'utf8'));
    expect(harnessJson.components).toEqual([
      { path: '.', stack: 'python' },
      { path: 'apps/web', stack: 'typescript' },
    ]);
    expect(harnessJson.stack).toBeUndefined();

    // The generated CI workflow's block carries both components' real
    // commands (SC9's "one runner call covering multiple installs").
    const workflow = await fs.readFile(
      path.join(repoDir, '.github', 'workflows', 'harny-feedback.yml'),
      'utf8',
    );
    expect(workflow).toContain('ruff');
    expect(workflow).toContain('eslint');

    // checks.json carries both components' readiness commands, dir-scoped.
    const checks = JSON.parse(await fs.readFile(path.join(repoDir, '.sdd', 'doctor', 'checks.json'), 'utf8'));
    const commandIds: string[] = checks.commands.map((c: { id: string }) => c.id);
    expect(commandIds.some((id) => id.includes('apps/web'))).toBe(true);
    expect(commandIds.some((id) => id === 'pytest:.' || id === 'pytest')).toBe(true);
  });
});

describe('npx harny doctor and the direct runner agree on a two-component install (SC10, RD-7, MC-23)', () => {
  it('both invocation paths report the same set of readiness command ids', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    await fs.mkdir(path.join(repoDir, 'apps', 'web'), { recursive: true });

    const initResult = await runCli([
      'init',
      repoDir,
      '--yes',
      '--tools',
      'claude-code',
      '--component',
      '.=python',
      '--component',
      'apps/web=typescript',
    ]);
    expect(initResult.code).toBe(0);

    const runnerPath = path.join(repoDir, '.sdd', 'doctor', 'run-doctor.mjs');
    const direct = await runNodeScript(runnerPath, repoDir);
    const verb = await runCli(['doctor', repoDir]);

    // Both invocation paths must mention BOTH components' readiness ids (or
    // neither, for either invocation) — the verb re-derives the same
    // component set from the same .sdd/harness.json the direct runner's own
    // generated checks.json already encodes (RD-7 preserved for monorepo).
    const verbOutput = verb.stdout + verb.stderr;
    for (const token of ['npm-test', 'pytest']) {
      expect(direct.stdout.includes(token)).toBe(verbOutput.includes(token));
    }
  });
});

/** (specs/monorepo-mode MC-20, MC-21; audit.md row A2, finding F1.) The chain
 *  from a lone NON-ROOT component through the generated `checks.json` and into
 *  the shipped runner. `tests/doctor.test.ts` pins the generator's output shape
 *  for this boundary; this test is what proves the scoping is real work rather
 *  than a field nobody acts on — the readiness command's probe AND its spawned
 *  process both have to land in `apps/web`, in an install whose ROOT would give
 *  the opposite answer. Expected red until `buildDoctorChecks` stops gating
 *  `dir` on `components.length > 1`: with `dir` absent the runner resolves
 *  `path.resolve(cwd, '.')`, finds no `test` script in the root `package.json`,
 *  and SKIPs — the silent false-readiness verdict F1 describes. */
describe('a lone non-root component scopes readiness to that directory, end to end (MC-20, MC-21) (A2)', () => {
  it('writes a dir-scoped npm-test entry and the runner probes and runs it inside apps/web, not at the install root', async () => {
    const repoDir = await makeTempDir();
    execFileSync('git', ['init', '-q'], { cwd: repoDir });
    const webDir = path.join(repoDir, 'apps', 'web');
    await fs.mkdir(webDir, { recursive: true });

    // The discriminator. Only apps/web declares a "test" script, so a probe
    // evaluated at the install root skips the command outright; and the script
    // itself drops a marker in whatever directory npm was spawned from, so a
    // command that runs from the wrong directory is caught too.
    await fs.writeFile(
      path.join(repoDir, 'package.json'),
      JSON.stringify({ name: 'root-no-test-script', private: true, scripts: { build: 'node -e ""' } }),
      'utf8',
    );
    await fs.writeFile(
      path.join(webDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        private: true,
        scripts: { test: `node -e "require('fs').writeFileSync('ran-here.txt', 'x')"` },
      }),
      'utf8',
    );

    const { code } = await runCli([
      'init',
      repoDir,
      '--yes',
      '--tools',
      'claude-code',
      '--component',
      'apps/web=typescript',
    ]);
    expect(code).toBe(0);

    const checks = JSON.parse(await fs.readFile(path.join(repoDir, '.sdd', 'doctor', 'checks.json'), 'utf8'));
    const entry = checks.commands.find((c: { id: string }) => c.id === 'npm-test:apps/web');
    expect(
      entry,
      `expected a dir-scoped npm-test:apps/web entry; got ${JSON.stringify(checks.commands)}`,
    ).toBeDefined();
    expect(entry.dir).toBe('apps/web');

    const runner = await runNodeScript(path.join(repoDir, '.sdd', 'doctor', 'run-doctor.mjs'), repoDir);

    // OK, never SKIP: the probe found apps/web/package.json's "test" script.
    expect(runner.stdout.toLowerCase()).toMatch(/ok\s+npm-test:apps\/web/);
    // And the command itself ran there, not at the install root.
    await expect(fs.access(path.join(webDir, 'ran-here.txt'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(repoDir, 'ran-here.txt'))).rejects.toThrow();
  });
});
