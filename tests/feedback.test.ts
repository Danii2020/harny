/**
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/feedback.ts (NEW)" (G1) and its
 * § Data Models "The stack→command mapping" (G1, SC1, SC2); Behavior Guarantee 8
 * (escape hatch is inert, never fatal, never silent); intent.md SC1, SC2;
 * tasks.md Task 1.1.
 *
 * `src/feedback.ts` does not exist yet at red time — every test below is expected
 * to fail on module resolution (`Cannot find module '../src/feedback.js'`), not on
 * a typo or a wrong assumption about the mapping's shape.
 *
 * Spec: specs/agent-feedback-controls (Phase 2)
 * Covers: contract.md Behavior Guarantee 7 / intent.md SC1 ("Single source of
 * command strings" — "Enforced by a test grepping the shipped tree for each
 * `argv[0]`", contract.md's own words); roadmap.md Phase 2 step 2; tasks.md
 * Task 2.6. This is a single, global structural guard (`high-value-tests`'s
 * allowance for "a boundary/architecture invariant enforced once globally"), not
 * re-asserted per file elsewhere.
 *
 * Red-phase note: `src/feedback.ts` already exists (Phase 1 shipped) and today
 * nothing outside it references any `STACK_PROFILES` command string yet — no
 * generator, template, or skill body reads the mapping at all before Phase 2's
 * green phase. This test is therefore expected to PASS already (there is nothing
 * to violate yet); it becomes a live regression guard the moment Phase 2 starts
 * threading command strings into generators, templates and the CI workflow. It is
 * still run and reported here (not skipped) because it must keep passing straight
 * through Phase 2's implementation, unlike the other tests in this file's Phase 2
 * addition.
 *
 * Spec: specs/agent-feedback-controls (Post-audit amendment A1)
 * Covers: contract.md § Interfaces `FeedbackInstall` and `StackProfile.ciInstall`
 * (the new CI-only install-candidate type); § Data Models "The stack→command
 * mapping" (`typescript`'s `npm ci` -> `npm install` fallback, `python`'s
 * deliberate absence of `ciInstall`); Behavior Guarantee 7's A1 extension
 * (`ciInstall[].argv` joins BG-7's existing single-source-of-truth grep gate);
 * Behavior Guarantee 21 and reservation R6 (the `python` profile ships no
 * install convention, on purpose). `FeedbackInstall`/`ciInstall` do not exist on
 * `src/feedback.ts` yet at red time, so every test in the `ciInstall` describe
 * block below is expected to fail on `undefined` where an array/object was
 * expected, not on a wrong assumption about the install candidates' shape.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

describe('STACK_PROFILES (contract.md § Data Models, SC1)', () => {
  it('fixes the typescript and python profiles exactly as contract.md pins them, in stable order', async () => {
    const { STACK_PROFILES, STACK_PROFILE_IDS } = await import('../src/feedback.js');

    expect(STACK_PROFILE_IDS).toEqual(['typescript', 'python']);
    expect(STACK_PROFILES.map((profile) => profile.id)).toEqual(['typescript', 'python']);

    const typescript = STACK_PROFILES.find((profile) => profile.id === 'typescript');
    const python = STACK_PROFILES.find((profile) => profile.id === 'python');

    expect(typescript?.commands.map((command) => command.id)).toEqual(['eslint', 'tsc']);
    expect(python?.commands.map((command) => command.id)).toEqual(['ruff', 'mypy']);

    // Representative full-shape checks (kind/argv/pathMode/requires), not a
    // restatement of the id list above -- these are the fields the runner and
    // the generators actually consume.
    expect(typescript?.commands[0]).toEqual({
      id: 'eslint',
      kind: 'lint',
      argv: ['npx', 'eslint'],
      pathMode: 'per-file',
      requires: { anyFile: ['eslint.config.js', 'eslint.config.mjs', '.eslintrc.json', '.eslintrc.cjs'] },
    });
    expect(typescript?.commands[1]).toEqual({
      id: 'tsc',
      kind: 'typecheck',
      argv: ['npx', 'tsc', '--noEmit'],
      pathMode: 'whole-project',
      requires: { anyFile: ['tsconfig.json'] },
    });
    expect(python?.commands[0]).toEqual({
      id: 'ruff',
      kind: 'lint',
      argv: ['ruff', 'check'],
      pathMode: 'per-file',
      requires: { binary: 'ruff' },
    });
    expect(python?.commands[1]).toEqual({
      id: 'mypy',
      kind: 'typecheck',
      argv: ['mypy'],
      pathMode: 'per-file',
      requires: { binary: 'mypy' },
    });
  });

  it('never emits an empty commands list for any profile', async () => {
    const { STACK_PROFILES } = await import('../src/feedback.js');

    for (const profile of STACK_PROFILES) {
      expect(profile.commands.length, `${profile.id} has no commands`).toBeGreaterThan(0);
    }
  });

  it('exports the three path constants so no call site re-literals them (AGENTS.md S5)', async () => {
    const { FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH, TOUCHED_FILES_DIR } = await import(
      '../src/feedback.js'
    );

    expect(FEEDBACK_RUNNER_PATH).toBe('.sdd/feedback/run-feedback.mjs');
    expect(CI_WORKFLOW_PATH).toBe('.github/workflows/harny-feedback.yml');
    expect(TOUCHED_FILES_DIR).toBe('.sdd/feedback/.turns');
  });
});

describe('resolveStackProfile alias matching (SC1)', () => {
  it.each([
    ['typescript', 'typescript'],
    ['ts', 'typescript'],
    ['node', 'typescript'],
    ['nodejs', 'typescript'],
    ['javascript', 'typescript'],
    ['js', 'typescript'],
    ['next', 'typescript'],
    ['nextjs', 'typescript'],
    ['react', 'typescript'],
    ['python', 'python'],
    ['py', 'python'],
    ['fastapi', 'python'],
    ['django', 'python'],
    ['flask', 'python'],
  ] as const)('resolves %s to the %s profile', async (alias, expectedId) => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile(alias)?.id).toBe(expectedId);
  });
});

describe('resolveStackProfile case and punctuation normalization (SC1, SC2)', () => {
  it('is case-insensitive', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile('TypeScript')?.id).toBe('typescript');
    expect(resolveStackProfile('PYTHON')?.id).toBe('python');
    expect(resolveStackProfile('FastAPI')?.id).toBe('python');
  });

  it('trims surrounding whitespace', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile('  typescript  ')?.id).toBe('typescript');
    expect(resolveStackProfile('\tpython\n')?.id).toBe('python');
  });

  it('strips punctuation before matching, so "Node.js" and "Next.js" resolve via their punctuation-free aliases', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    // "Node.js" normalizes to "nodejs", which is itself a listed alias --
    // this proves normalization runs, not merely that "nodejs" is aliased.
    expect(resolveStackProfile('Node.js')?.id).toBe('typescript');
    expect(resolveStackProfile('Next.js')?.id).toBe('typescript');
  });

  it('strips punctuation and normalizes case together on an unusually decorated value', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile('  Django!! ')?.id).toBe('python');
  });
});

describe('resolveStackProfile escape hatch (SC2, BG-8)', () => {
  it('returns undefined for an absent (undefined) stack', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile(undefined)).toBeUndefined();
  });

  it('returns undefined for a blank stack', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(resolveStackProfile('')).toBeUndefined();
    expect(resolveStackProfile('   ')).toBeUndefined();
  });

  it('returns undefined for an unrecognized stack, without throwing', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(() => resolveStackProfile('rust')).not.toThrow();
    expect(resolveStackProfile('rust')).toBeUndefined();
  });

  it('never throws, even for pathological punctuation-only input', async () => {
    const { resolveStackProfile } = await import('../src/feedback.js');

    expect(() => resolveStackProfile('!!!---...')).not.toThrow();
    expect(resolveStackProfile('!!!---...')).toBeUndefined();
  });
});

/** Recursively collects every regular file under `dir`. `dir` may not exist in
 *  every checkout (e.g. `.agents/skills` before Phase 3 lands) — callers tolerate
 *  that by skipping a root that fails to read rather than failing the whole scan. */
async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

describe('single source of command strings — no STACK_PROFILES command leaks outside src/feedback.ts (BG-7, SC1) (Task 2.6; extended by A1 for ciInstall)', () => {
  it('finds each profile command\'s full argv string only inside src/feedback.ts, scanning src/, templates/ and .agents/skills/', async () => {
    const { STACK_PROFILES } = await import('../src/feedback.js');

    const feedbackTsPath = path.resolve(REPO_ROOT, 'src', 'feedback.ts');
    const scanRoots = [
      path.join(REPO_ROOT, 'src'),
      path.join(REPO_ROOT, 'templates'),
      path.join(REPO_ROOT, '.agents', 'skills'),
    ];

    const files: string[] = [];
    for (const root of scanRoots) {
      try {
        files.push(...(await collectFiles(root)));
      } catch {
        // A root that doesn't exist yet in this checkout contributes nothing to
        // scan, rather than failing the test for an unrelated reason.
      }
    }

    // The full command, not just argv[0] ("npx" alone is not distinctive), is the
    // "command string" contract.md BG-7 forbids as a literal duplicate.
    const commandStrings = STACK_PROFILES.flatMap((profile) =>
      profile.commands.map((command) => command.argv.join(' ')),
    );

    // (A1) BG-7's extension: `ciInstall[].argv` is a `STACK_PROFILES` string like
    // any other ("npm ci"/"npm install --no-audit --no-fund" may not be literalled
    // into src/engine.ts or templates/ci/harny-feedback.yml). Optional-chained
    // because `ciInstall` does not exist yet at red time — once it lands this
    // folds into the same loop below with no separate assertion needed.
    const ciInstallCommandStrings = STACK_PROFILES.flatMap((profile) =>
      (profile.ciInstall ?? []).map((candidate) => candidate.argv.join(' ')),
    );

    for (const commandString of [...commandStrings, ...ciInstallCommandStrings]) {
      const offendingFiles: string[] = [];
      for (const file of files) {
        if (path.resolve(file) === feedbackTsPath) continue;
        const contents = await fs.readFile(file, 'utf8').catch(() => '');
        if (contents.includes(commandString)) {
          offendingFiles.push(path.relative(REPO_ROOT, file));
        }
      }
      expect(
        offendingFiles,
        `"${commandString}" must only appear in src/feedback.ts, but also found in: ${offendingFiles.join(', ')}`,
      ).toEqual([]);
    }
  });
});

describe('FeedbackInstall / StackProfile.ciInstall (A1; contract.md § Interfaces, § Data Models, BG-21, R6, R7)', () => {
  it('the typescript profile declares ciInstall as the npm ci -> npm install fallback, in that declaration order', async () => {
    const { STACK_PROFILES } = await import('../src/feedback.js');
    const typescript = STACK_PROFILES.find((profile) => profile.id === 'typescript');

    expect(typescript?.ciInstall?.map((candidate) => candidate.id)).toEqual(['npm-ci', 'npm-install']);
    expect(typescript?.ciInstall?.[0]).toEqual({
      id: 'npm-ci',
      argv: ['npm', 'ci'],
      requires: { anyFile: ['package-lock.json'] },
    });
    expect(typescript?.ciInstall?.[1]).toEqual({
      id: 'npm-install',
      argv: ['npm', 'install', '--no-audit', '--no-fund'],
      requires: { anyFile: ['package.json'] },
    });
  });

  it('every ciInstall candidate on every profile is gated by a non-empty anyFile — an ungated install is unrepresentable', async () => {
    const { STACK_PROFILES } = await import('../src/feedback.js');

    const allCandidates = STACK_PROFILES.flatMap((profile) =>
      (profile.ciInstall ?? []).map((candidate) => ({ profileId: profile.id, candidate })),
    );

    // At least the typescript profile must declare install candidates. If this
    // list is empty, `ciInstall` does not exist yet — exactly the missing A1
    // implementation this test exists to catch, rather than a vacuous pass.
    expect(allCandidates.length).toBeGreaterThan(0);

    for (const { profileId, candidate } of allCandidates) {
      const anyFile = (candidate.requires as { anyFile?: readonly string[] } | undefined)?.anyFile;
      expect(
        Array.isArray(anyFile) && anyFile.length > 0,
        `${profileId}/${candidate.id}.requires.anyFile must be a non-empty array`,
      ).toBe(true);
      // Restricted to anyFile only — contract.md types this as
      // `Required<Pick<ToolProbe, 'anyFile'>>`, so neither of ToolProbe's other
      // two probe kinds is representable here.
      expect((candidate.requires as { binary?: unknown }).binary).toBeUndefined();
      expect((candidate.requires as { script?: unknown }).script).toBeUndefined();
    }
  });

  it('the python profile declares no ciInstall at all — deliberate, per BG-21/R6', async () => {
    const { STACK_PROFILES } = await import('../src/feedback.js');
    const python = STACK_PROFILES.find((profile) => profile.id === 'python');

    expect(python?.ciInstall).toBeUndefined();
  });
});
