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

  const expectedModelByRole: Record<string, string> = {
    'sdd-architect': 'opus',
    'sdd-test-writer': 'sonnet',
    'sdd-executor': 'sonnet',
    'sdd-auditor': 'opus',
    'sdd-documentation': 'haiku',
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
