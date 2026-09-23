/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/claude-code.ts and index.ts"
 * (G6) and its normative mapping tables; Behavior Guarantees 1, 2, 8, 10, 19;
 * C11, C12, C43; T19, T20, T21, T22, T23, T24.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "SUPERSEDES — role artifact shape for all four
 * generators" (G9), applied to Claude Code as the disclosed AL-5 retrofit;
 * Behavior Guarantee 8; tasks.md Task 1.3; T3. Extends, never loosens, the
 * pre-feature assertions above (roadmap.md Phase 1.5 / Task 1.8).
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/types.ts (MODIFIED)" (the new
 * `renderHook` method) and § Verified per-tool facts V1 (Claude Code's
 * `.claude/settings.json`, nested `{"hooks":{"<Event>":[{"hooks":[...]}]}}` wrapper
 * shape), V5 (`matcher`, `${CLAUDE_PROJECT_DIR}`); Behavior Guarantees 2 (two-part
 * mechanism, always) and 3 (no per-edit invocation); tasks.md Tasks 2.1, 2.2; T8, T9.
 * `claudeCodeGenerator.renderHook` does not exist yet at red time — every test in the
 * two `describe` blocks below is expected to fail with a `TypeError` ("renderHook is
 * not a function"), not a typo or a wrong assumption about the wrapper shape.
 *
 * Spec: specs/agent-feedback-controls (Phase 2, post-review amendment)
 * Covers: contract.md § Verified per-tool facts V4 ("Claude Code | ...
 * `hookSpecificOutput.additionalContext` ... | `{"decision":"block",...}`, or exit 2
 * + stderr") and Behavior Guarantee 6 ("findings reach the agent... [w]here a
 * non-blocking channel exists (Claude Code `additionalContext`...) findings are
 * delivered without forcing a turn"); roadmap.md Phase 2 step 4 ("a clean lint run
 * costs no extra turn"); tasks.md Task 2.12. The block below drives the generated
 * `Stop` hook's own `command` as a real subprocess — the shared, byte-frozen
 * `templates/hooks/run-feedback.mjs` is stood in for by
 * `tests/fixtures/hooks/fake-runner.mjs` so this test isolates the wrapper's own
 * subprocess-orchestration/JSON-emission logic from the runner's already-tested
 * internals (`tests/hooks/run-feedback.test.ts`).
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: contract.md § Data Models "Verified per-tool root instruction files"
 * (the `claude-code` row); Behavior Guarantee AR-9; intent.md SC6; audit.md Test
 * Coverage T12. `guidancePath` does not exist on `Generator` yet at red time, so
 * `claudeCodeGenerator.guidancePath` reads as `undefined` (a missing member, not
 * a crash — plain property access never throws), which fails the
 * `toBe('CLAUDE.md')` assertion below.
 *
 * ---
 * Spec: specs/feedback-path-hygiene
 * Covers: contract.md § "Unchanged by construction — no code change"
 * (`src/generators/claude-code.ts` `renderHook` — the new `extensions` field
 * is serialized automatically via the existing `JSON.stringify(profile.commands)`
 * call, no generator code change, PH-12); Behavior Guarantees PH-1 (vanished
 * paths dropped), PH-2 (extension gate); intent.md SC6; roadmap.md Phase 3
 * step 1; tasks.md Task 3.2.
 *
 * The new describe block below drives the *generated* `PostToolUse` and `Stop`
 * commands for the python profile as real subprocesses (via `sh -c`, exactly
 * like the "Stop hook findings arrive via…" block above) against a temp
 * project holding the real `templates/hooks/run-feedback.mjs` and
 * `templates/shared/probes.mjs`, with stub `ruff`/`mypy` executables
 * (`tests/fixtures/hooks/stub-tool.mjs`) on a temp `PATH`. `STACK_PROFILES`'s
 * `ruff`/`mypy` entries carry no `extensions` field yet at red time, and the
 * runner does not filter by extension or existence yet either, so today both
 * stubs receive every touched path — including `.claude/settings.json` and
 * the vanished `src/gone.py` — rather than only the surviving `src/app.py`.
 * The test's exact-argv assertions are therefore expected to fail on that
 * extra, wrong path content, not a test-authoring bug.
 */
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_CLAUDE_AGENTS_DIR, REAL_TEMPLATES_ROOT, TESTS_DIR } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
}

/** Loads the real, canonical runner script verbatim — the same bytes
 *  `HookPayload.runner` is documented to carry (contract.md § Interfaces). */
async function loadRunnerContents(): Promise<string> {
  return fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs'), 'utf8');
}

/** A minimal, loosely-typed `HookPayload` fixture (contract.md § Interfaces
 *  "src/engine.ts (MODIFIED)"). Only the fields `claudeCodeGenerator.renderHook`
 *  actually needs are populated with real values; the rest mirror
 *  `ProjectConfigSummary`'s existing shape so a future stricter consumer still finds
 *  a plausible object. `profile` is `undefined` for the escape-hatch case. */
function fakeHookPayload(profile: unknown, runnerContents: string) {
  return {
    project: {
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
      stack: (profile as { id?: string } | undefined)?.id,
      stackProfile: profile,
    },
    profile,
    runner: { name: 'run-feedback.mjs', contents: runnerContents, sourcePath: 'hooks/run-feedback.mjs' },
  } as any;
}

describe('mapModel (guarantee 10) (T19)', () => {
  it('maps each cost tier to the contracted Claude Code model id', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');

    expect(claudeCodeGenerator.mapModel('most-capable')).toBe('opus');
    expect(claudeCodeGenerator.mapModel('mid')).toBe('sonnet');
    expect(claudeCodeGenerator.mapModel('cheapest')).toBe('haiku');
  });

  it('returns a literal model override verbatim, untranslated', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');

    expect(claudeCodeGenerator.mapModel('mid', 'claude-3-7-literal-override')).toBe(
      'claude-3-7-literal-override',
    );
  });
});

describe('mapCapabilities (guarantee 8) (T20)', () => {
  it('maps the six known capability rows to their Claude Code tool tokens, deduped', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');

    const mapping = claudeCodeGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'read-files', known: true }, // duplicate — must not double the tokens
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
      { name: 'web-search', known: true },
      { name: 'docs-lookup', known: true },
      { name: 'task-tracking', known: true },
    ]);

    const expectedTokens = [
      'Read',
      'Glob',
      'Grep',
      'LS',
      'Write',
      'Edit',
      'Bash',
      'WebSearch',
      'WebFetch',
      'mcp__context7__resolve-library-id',
      'mcp__context7__query-docs',
      'TaskCreate',
      'TaskGet',
      'TaskList',
      'TaskUpdate',
    ];
    expect(new Set(mapping.tokens)).toEqual(new Set(expectedTokens));
    expect(mapping.tokens).toHaveLength(new Set(mapping.tokens).size); // no duplicates
  });

  it('surfaces a scoped capability and an unknown token as notes rather than dropping them', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');

    const mapping = claudeCodeGenerator.mapCapabilities([
      { name: 'write-files', scope: 'audit.md only', known: true },
      { name: 'ask-human', known: false },
    ]);

    expect(mapping.notes).toContain('write-files is scoped to audit.md only');
    expect(mapping.notes).toContain('unmapped capability: ask-human');
  });
});

describe('renderRole (guarantees 1, 2, 19) (T21, T22)', () => {
  it('emits the contracted frontmatter keys, the canonical body byte-for-byte, and exactly one trailing newline', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = claudeCodeGenerator.renderRole({
      template: auditorTemplate,
      tier: 'most-capable',
    });

    expect(generated.path).toBe('.claude/agents/sdd-auditor.md');
    expect(generated.contents.startsWith('---\n')).toBe(true);
    expect(generated.contents).toContain('name: "sdd-auditor"');
    expect(generated.contents).toContain('model: opus');
    expect(generated.contents).toContain(auditorTemplate.body);
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('honors a modelOverride verbatim in the rendered frontmatter', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const templates = await loadRealTemplates();
    const executorTemplate = templates.roles.get('sdd-executor')!;

    const generated = claudeCodeGenerator.renderRole({
      template: executorTemplate,
      tier: 'mid',
      modelOverride: 'literal-override-model',
    });

    expect(generated.contents).toContain('literal-override-model');
    expect(generated.contents).not.toContain('model: sonnet');
  });

  it('preserves the auditor\'s scoped capability text "audit.md only" in the generated file (R7, closes AL-7)', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = claudeCodeGenerator.renderRole({
      template: auditorTemplate,
      tier: 'most-capable',
    });

    expect(generated.contents).toContain('audit.md only');
  });
});

describe('role artifact carries the AL-5 spec-schema pointer block after the body (guarantee 8) (T3)', () => {
  it('appends the delimited pointer block naming SPEC_SCHEMA_DIR after the canonical body, leaving the pre-existing frontmatter, model and provenance unchanged', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import(
      '../../src/generators/markdown-yaml.js'
    );
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = claudeCodeGenerator.renderRole({
      template: auditorTemplate,
      tier: 'most-capable',
    });

    // Re-asserted here, unchanged, so the retrofit is proven additive rather
    // than a reshaping of the pre-feature shape (roadmap.md Phase 1.5).
    expect(generated.path).toBe('.claude/agents/sdd-auditor.md');
    expect(generated.contents).toContain('name: "sdd-auditor"');
    expect(generated.contents).toContain('model: opus');
    expect(generated.contents).toContain('generated by harny from templates/roles/sdd-auditor.md');

    // New: the pointer block follows the canonical body, entirely inside the
    // existing generated-block markers (guarantee 3's config quarantine).
    const bodyIndex = generated.contents.indexOf(auditorTemplate.body);
    const blockBeginIndex = generated.contents.indexOf(GENERATED_BLOCK_BEGIN);
    const blockEndIndex = generated.contents.indexOf(GENERATED_BLOCK_END);
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(blockBeginIndex).toBeGreaterThan(bodyIndex);
    expect(blockEndIndex).toBeGreaterThan(blockBeginIndex);
    expect(generated.contents).toContain(SPEC_SCHEMA_DIR);
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });
});

describe('renderConductor (guarantee 3) (T23)', () => {
  it('emits Skill frontmatter, then the verbatim body, then the delimited generated block, in that order', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import(
      '../../src/generators/markdown-yaml.js'
    );
    const templates = await loadRealTemplates();

    const generated = claudeCodeGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: ['sdd-architect', 'sdd-executor'],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.path).toBe('.claude/skills/sdd-conductor/SKILL.md');
    expect(generated.contents.startsWith('---\n')).toBe(true);
    expect(generated.contents).toContain('name: "sdd-conductor"');

    const bodyIndex = generated.contents.indexOf(templates.conductor.body);
    const blockBeginIndex = generated.contents.indexOf(GENERATED_BLOCK_BEGIN);
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(blockBeginIndex).toBeGreaterThan(bodyIndex);
    expect(generated.contents).toContain(GENERATED_BLOCK_END);
    expect(generated.contents.endsWith('\n')).toBe(true);
  });
});

describe('Structural (not byte-wise) oracle comparison against live .claude/agents/*.md (C43) (T24)', () => {
  function frontmatterOf(source: string): Record<string, string> {
    const match = source.match(/^---\n([\s\S]*?)\n---/);
    const result: Record<string, string> = {};
    if (!match) return result;
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(': ');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      if (!key || key.startsWith('#')) continue;
      result[key] = line.slice(idx + 2).trim().replace(/^"|"$/g, '');
    }
    return result;
  }

  // documentation-role-completion (contract.md RC-7): sdd-documentation's
  // cost_tier moved from `cheapest` to `mid`, so its generated model now
  // matches sdd-test-writer/sdd-executor's `sonnet`, not `haiku`.
  const expectedModelByRole: Record<string, string> = {
    'sdd-architect': 'opus',
    'sdd-test-writer': 'sonnet',
    'sdd-executor': 'sonnet',
    'sdd-auditor': 'opus',
    'sdd-documentation': 'sonnet',
  };

  it('generated role files carry the same frontmatter keys as the live oracle, with the model value implied by cost_tier', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const templates = await loadRealTemplates();

    for (const [roleId, expectedModel] of Object.entries(expectedModelByRole)) {
      const template = templates.roles.get(roleId as any)!;
      const generated = claudeCodeGenerator.renderRole({
        template,
        tier: template.metadata.costTier,
      });
      const liveSource = await fs.readFile(
        `${REAL_CLAUDE_AGENTS_DIR}/${roleId}.md`,
        'utf8',
      );

      const liveKeys = Object.keys(frontmatterOf(liveSource));
      const generatedFrontmatter = frontmatterOf(generated.contents);

      for (const key of ['name', 'description', 'model', 'tools']) {
        expect(liveKeys).toContain(key);
        expect(Object.keys(generatedFrontmatter)).toContain(key);
      }
      expect(generatedFrontmatter.model).toBe(expectedModel);
      expect(generated.contents).toContain(`generated by harny from templates/roles/${roleId}.md`);
    }
  });
});

describe('renderHook — both registrations, nested wrapper shape (BG-2, V1) (Task 2.1)', () => {
  it('emits .claude/settings.json with a PostToolUse accumulator (matcher "Edit|Write") and a Stop runner, both in the nested {"hooks":{"<Event>":[{"hooks":[{"type":"command","command":…}]}]}} shape', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = claudeCodeGenerator.renderHook(fakeHookPayload(profile, runnerContents));

    expect(generated).toBeDefined();
    expect(generated!.path).toBe('.claude/settings.json');
    expect(generated!.contents.endsWith('\n')).toBe(true);
    expect(generated!.contents.endsWith('\n\n')).toBe(false);

    const parsed = JSON.parse(generated!.contents);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['PostToolUse', 'Stop']);

    // PostToolUse: the accumulator, matched to Edit/Write only.
    const postToolUseEntry = parsed.hooks.PostToolUse[0];
    expect(postToolUseEntry.matcher).toBe('Edit|Write');
    expect(Array.isArray(postToolUseEntry.hooks)).toBe(true);
    expect(postToolUseEntry.hooks[0].type).toBe('command');
    expect(typeof postToolUseEntry.hooks[0].command).toBe('string');

    // Stop: the turn-completion runner.
    const stopEntry = parsed.hooks.Stop[0];
    expect(Array.isArray(stopEntry.hooks)).toBe(true);
    expect(stopEntry.hooks[0].type).toBe('command');
    expect(typeof stopEntry.hooks[0].command).toBe('string');
  });

  it('references the runner script via ${CLAUDE_PROJECT_DIR} in both registrations (V5)', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = claudeCodeGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);

    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toContain('${CLAUDE_PROJECT_DIR}');
    expect(parsed.hooks.Stop[0].hooks[0].command).toContain('${CLAUDE_PROJECT_DIR}');
  });

  it('still registers both PostToolUse and Stop, in the same nested shape, in the escape-hatch (no resolved profile) case (BG-8)', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const runnerContents = await loadRunnerContents();

    const generated = claudeCodeGenerator.renderHook(fakeHookPayload(undefined, runnerContents));

    expect(generated).toBeDefined();
    const parsed = JSON.parse(generated!.contents);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['PostToolUse', 'Stop']);
  });
});

describe('renderHook — no mapped command is bound to the per-edit event (BG-3) (Task 2.2)', () => {
  it('the PostToolUse (accumulator) command invokes the runner\'s accumulate mode only — never the "run" mode that executes mapped commands', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = claudeCodeGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const postToolUseCommand: string = parsed.hooks.PostToolUse[0].hooks[0].command;
    const stopCommand: string = parsed.hooks.Stop[0].hooks[0].command;

    // Only "run" mode accepts a commands file (templates/hooks/run-feedback.mjs's
    // own CLI contract, established in Phase 1) — its presence is what would make a
    // registration capable of executing a mapped command at all.
    expect(postToolUseCommand).toContain('accumulate');
    expect(postToolUseCommand).not.toContain('--commands');

    // Only the turn-completion (Stop) registration is permitted to invoke mapped
    // commands, via the runner's "run" mode.
    expect(stopCommand).toContain('run-feedback.mjs');
    expect(stopCommand).toContain('--commands');
  });

  it('never binds a literal STACK_PROFILES command inside the PostToolUse registration, for either resolved stack profile', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();

    for (const profile of STACK_PROFILES) {
      const generated = claudeCodeGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
      const parsed = JSON.parse(generated.contents);
      const postToolUseCommand: string = parsed.hooks.PostToolUse[0].hooks[0].command;

      for (const command of profile.commands) {
        for (const token of command.argv) {
          if (token === 'npx') continue; // shared launcher, not distinctive on its own
          expect(
            postToolUseCommand,
            `PostToolUse must not bind mapped-command token "${token}" from profile "${profile.id}"`,
          ).not.toContain(token);
        }
      }
    }
  });
});

describe('renderHook — Stop hook findings arrive via hookSpecificOutput.additionalContext, never a forced continuation (BG-6, V4)', () => {
  const FAKE_RUNNER_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'fake-runner.mjs');
  const tempDirs: string[] = [];

  async function makeFakeProjectDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-claude-stop-hook-'));
    tempDirs.push(dir);
    // The generated command resolves the runner at
    // `${CLAUDE_PROJECT_DIR}/.sdd/feedback/run-feedback.mjs`; stand a fixture in at
    // that exact relative path so the real shell-expanded command finds it.
    const runnerDir = path.join(dir, '.sdd', 'feedback');
    await fs.mkdir(runnerDir, { recursive: true });
    await fs.copyFile(FAKE_RUNNER_PATH, path.join(runnerDir, 'run-feedback.mjs'));
    return dir;
  }

  async function cleanupTempDirs(): Promise<void> {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  }

  interface WrapperResult {
    readonly code: number | null;
    readonly stdout: string;
    readonly stderr: string;
  }

  /** Executes the generated `Stop` command exactly as Claude Code would: via a
   *  shell (so `${CLAUDE_PROJECT_DIR}` is expanded by the shell, not by this
   *  test), with `CLAUDE_PROJECT_DIR` pointing at a fixture project directory. */
  function runStopCommand(command: string, projectDir: string, env: Record<string, string>): Promise<WrapperResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: projectDir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, ...env },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
      child.stdin.write(JSON.stringify({ session_id: 'wrapper-test-session' }));
      child.stdin.end();
    });
  }

  async function getStopCommand(): Promise<string> {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const generated = claudeCodeGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    return parsed.hooks.Stop[0].hooks[0].command;
  }

  it('wraps a runner exit-2 finding into non-blocking JSON on its own stdout and exits 0 (never forcing a continuation)', async () => {
    const command = await getStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      const result = await runStopCommand(command, projectDir, {
        FAKE_EXIT_CODE: '2',
        FAKE_STDOUT: 'finding from `tsc` (exit 2):\nsrc/foo.ts:1:1 - error TS1234: oops\n',
      });

      expect(result.code).toBe(0);
      expect(result.stdout.trim().length).toBeGreaterThan(0);

      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed.hookSpecificOutput.hookEventName).toBe('Stop');
      expect(typeof parsed.hookSpecificOutput.additionalContext).toBe('string');
      expect(parsed.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
      expect(parsed.hookSpecificOutput.additionalContext).toContain('TS1234');
    } finally {
      await cleanupTempDirs();
    }
  });

  it('produces no output and exits 0 on a clean runner pass (exit 0)', async () => {
    const command = await getStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      const result = await runStopCommand(command, projectDir, { FAKE_EXIT_CODE: '0' });

      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('');
    } finally {
      await cleanupTempDirs();
    }
  });
});

describe('renderHook — python profile end-to-end through the real runner: extensions reach the stub tools (feedback-path-hygiene, PH-1, PH-2, PH-12, SC6) (Task 3.2)', () => {
  const STUB_TOOL_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'stub-tool.mjs');
  const tempDirs: string[] = [];

  async function makeE2eProjectDir(): Promise<{ projectDir: string; binDir: string; stubLog: string }> {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-python-hook-e2e-'));
    tempDirs.push(projectDir);

    const feedbackDir = path.join(projectDir, '.sdd', 'feedback');
    const sharedDir = path.join(projectDir, '.sdd', 'shared');
    await fs.mkdir(feedbackDir, { recursive: true });
    await fs.mkdir(sharedDir, { recursive: true });
    await fs.copyFile(path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs'), path.join(feedbackDir, 'run-feedback.mjs'));
    await fs.copyFile(path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs'), path.join(sharedDir, 'probes.mjs'));

    const binDir = path.join(projectDir, 'bin');
    await fs.mkdir(binDir, { recursive: true });
    for (const tool of ['ruff', 'mypy']) {
      const target = path.join(binDir, tool);
      await fs.copyFile(STUB_TOOL_PATH, target);
      await fs.chmod(target, 0o755);
    }

    const stubLog = path.join(projectDir, 'stub-tool.log');
    return { projectDir, binDir, stubLog };
  }

  async function cleanupTempDirs(): Promise<void> {
    await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  }

  interface GeneratedCommandResult {
    readonly code: number | null;
    readonly stdout: string;
    readonly stderr: string;
  }

  /** Executes a generated hook `command` string exactly as Claude Code would
   *  (via a shell, so `${CLAUDE_PROJECT_DIR}` is expanded by the shell), with
   *  `PATH` prepended by the stub-tool `bin/` dir so the `binary` probes for
   *  `ruff`/`mypy` resolve, and `STUB_TOOL_LOG` forwarded so the stub records
   *  its own invocations. Mirrors `runStopCommand` above, generalized to also
   *  drive the `PostToolUse` (accumulate) registration. */
  function runGeneratedCommand(
    command: string,
    options: { projectDir: string; binDir: string; stubLog: string; stdin: Record<string, unknown> },
  ): Promise<GeneratedCommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: options.projectDir,
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: options.projectDir,
          PATH: `${options.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
          STUB_TOOL_LOG: options.stubLog,
        },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
      child.stdin.write(JSON.stringify(options.stdin));
      child.stdin.end();
    });
  }

  (process.platform === 'win32' ? it.skip : it)(
    'each stub tool is invoked exactly once, with only the existing .py file, after a turn that also touched a non-matching existing file and a vanished .py file',
    async () => {
      const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
      const { STACK_PROFILES } = await import('../../src/feedback.js');
      const runnerContents = await loadRunnerContents();
      const pythonProfile = STACK_PROFILES.find((p) => p.id === 'python')!;

      const generated = claudeCodeGenerator.renderHook(fakeHookPayload(pythonProfile, runnerContents))!;
      const parsed = JSON.parse(generated.contents);
      const postToolUseCommand: string = parsed.hooks.PostToolUse[0].hooks[0].command;
      const stopCommand: string = parsed.hooks.Stop[0].hooks[0].command;

      const { projectDir, binDir, stubLog } = await makeE2eProjectDir();
      try {
        const sessionId = 'python-e2e-session';

        const settingsFile = path.join(projectDir, '.claude', 'settings.json');
        await fs.mkdir(path.dirname(settingsFile), { recursive: true });
        await fs.writeFile(settingsFile, '{}', 'utf8');

        const goneFile = path.join(projectDir, 'src', 'gone.py');
        await fs.mkdir(path.dirname(goneFile), { recursive: true });
        await fs.writeFile(goneFile, '', 'utf8');

        const appFile = path.join(projectDir, 'src', 'app.py');
        await fs.writeFile(appFile, '', 'utf8');

        for (const file of [settingsFile, goneFile, appFile]) {
          const acc = await runGeneratedCommand(postToolUseCommand, {
            projectDir,
            binDir,
            stubLog,
            stdin: { session_id: sessionId, tool_input: { file_path: file } },
          });
          expect(acc.code).toBe(0);
        }

        // The vanished-path case (SC6): gone.py was accumulated, then
        // deleted before the turn's Stop hook fires.
        await fs.rm(goneFile);

        const stopResult = await runGeneratedCommand(stopCommand, {
          projectDir,
          binDir,
          stubLog,
          stdin: { session_id: sessionId },
        });
        expect(stopResult.code).toBe(0);

        const logLines = (await fs.readFile(stubLog, 'utf8').catch(() => ''))
          .trim()
          .split('\n')
          .filter(Boolean);
        const invocations = logLines.map((line) => JSON.parse(line) as { tool: string; argv: string[] });

        const ruffCalls = invocations.filter((inv) => inv.tool === 'ruff');
        const mypyCalls = invocations.filter((inv) => inv.tool === 'mypy');
        expect(ruffCalls).toHaveLength(1);
        expect(ruffCalls[0].argv).toEqual(['check', appFile]);
        expect(mypyCalls).toHaveLength(1);
        expect(mypyCalls[0].argv).toEqual([appFile]);
      } finally {
        await cleanupTempDirs();
      }
    },
  );
});

describe('guidancePath — the verified per-tool root instruction file (AR-9, SC6, T12)', () => {
  it("declares 'CLAUDE.md', Claude Code's own root instruction file", async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');

    expect(claudeCodeGenerator.guidancePath).toBe('CLAUDE.md');
  });
});
