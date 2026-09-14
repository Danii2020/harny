/**
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "Public API — src/generators/github-copilot.ts" (G3)
 * and its normative mapping tables; "Verified per-tool facts" § GitHub Copilot
 * (G4); Behavior Guarantees 1, 2, 5, 6, 7, 9, 10, 12; Error Handling
 * Contract's 1024-char skill-description and 30,000-char role-body rows;
 * roadmap.md Phase 2.3/2.4/2.5, tasks.md Task 2.13, 2.14, 2.15, 2.16, 2.17,
 * 2.19, 2.20; T13, T14, T15, T16, T17, T18, T19.
 *
 * `src/generators/github-copilot.ts` does not exist yet at red time — every
 * test here is expected to fail on module resolution or on a missing export,
 * not on a typo in this file.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/types.ts (MODIFIED)" (the new
 * `renderHook` method) and § Verified per-tool facts V1 (Copilot's
 * `.github/hooks/*.json`, `{"version":1,"hooks":{"agentStop":[{"type":"command",
 * "bash":…}]}}` wrapper — note the `"bash"` key, not `"command"`), V3
 * (`postToolUse` is the accumulation surface), V4 (Copilot's only `agentStop`
 * channel is `{"decision":"block","reason":…}`, a forced continuation, respecting
 * the 8-consecutive-block override via the `stop_hook_active` field Copilot's own
 * `agentStop` payload carries per V2); Behavior Guarantees 2, 3, 5, 6; tasks.md
 * Tasks 6.1, 6.7; roadmap.md Phase 6.
 * `githubCopilotGenerator.renderHook` is a documented Phase 2 stub returning
 * `undefined` at red time (Task 2.11) — every test in the new blocks below is
 * expected to fail because the returned value has no `.path`/`.contents` to read.
 */
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ROLE_IDS } from '../../src/vocabulary.js';
import { REAL_TEMPLATES_ROOT, TESTS_DIR } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
}

/** Loads the real, canonical runner script verbatim (contract.md § Interfaces
 *  `HookPayload.runner`). */
async function loadRunnerContents(): Promise<string> {
  return fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs'), 'utf8');
}

/** A minimal `HookPayload` fixture, mirroring `tests/generators/claude-code.test.ts`'s
 *  own fixture exactly (contract.md § Interfaces "src/engine.ts (MODIFIED)"). */
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

describe('githubCopilotGenerator.mapModel (guarantee 9) (T13)', () => {
  it('maps each cost tier to the verified GitHub-documented display model name', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    expect(githubCopilotGenerator.mapModel('most-capable')).toBe('Claude Opus 5');
    expect(githubCopilotGenerator.mapModel('mid')).toBe('Claude Sonnet 4.5');
    expect(githubCopilotGenerator.mapModel('cheapest')).toBe('Claude Haiku 4.5');
  });

  it('returns a literal override verbatim, untranslated, including one containing spaces', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    expect(githubCopilotGenerator.mapModel('mid', 'Gemini 3.1 Pro')).toBe('Gemini 3.1 Pro');
  });
});

describe('githubCopilotGenerator.roleFileName / path (guarantee 2) (T14)', () => {
  it('names role files "<role>.agent.md"', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    expect(githubCopilotGenerator.roleFileName('sdd-architect')).toBe('sdd-architect.agent.md');
  });

  it('renders the role to .github/agents/sdd-architect.agent.md', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = githubCopilotGenerator.renderRole({
      template: architectTemplate,
      tier: 'most-capable',
    });

    expect(generated.path).toBe('.github/agents/sdd-architect.agent.md');
  });
});

describe('githubCopilotGenerator.mapCapabilities (guarantee 5) (C18)', () => {
  it('never emits a tool token: tokens is always empty (the tools key is deliberately unset)', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    const mapping = githubCopilotGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'write-files', known: true },
    ]);

    expect(mapping.tokens).toEqual([]);
  });

  it('emits an "intentionally unset" note for every known, unscoped capability', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    const mapping = githubCopilotGenerator.mapCapabilities([{ name: 'read-files', known: true }]);

    expect(mapping.notes).toContain(
      'read-files (tools intentionally unset: Copilot grants all available tools; see contract.md)',
    );
  });

  it('adds a scope note in addition to the base note for a scoped capability', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    const mapping = githubCopilotGenerator.mapCapabilities([
      { name: 'write-files', scope: 'audit.md only', known: true },
    ]);

    expect(mapping.notes).toContain('write-files is scoped to audit.md only');
  });

  it('surfaces an unknown capability token as "unmapped capability: <name>", never dropping it', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');

    const mapping = githubCopilotGenerator.mapCapabilities([{ name: 'ask-human', known: false }]);

    expect(mapping.notes).toContain('unmapped capability: ask-human');
  });
});

describe('githubCopilotGenerator.renderRole (guarantee 5, C18) (T15)', () => {
  it('never emits a "tools" key anywhere in the frontmatter', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = githubCopilotGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).not.toMatch(/^tools:/m);
  });

  it('emits every capability as a note, including the auditor\'s "audit.md only" scope', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = githubCopilotGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('audit.md only');
  });

  it('emits the github.com model-caveat adapter note on every role artifact', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = githubCopilotGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain(
      'model is honored in VS Code / JetBrains / Eclipse / Xcode and ignored on github.com',
    );
  });

  it('emits the model field quoted, since GitHub\'s display names contain spaces', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = githubCopilotGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('model: "Claude Opus 5"');
  });

  it('never emits target/user-invocable/disable-model-invocation/mcp-servers/metadata keys', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = githubCopilotGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    for (const key of ['target', 'user-invocable', 'disable-model-invocation', 'mcp-servers', 'metadata']) {
      expect(generated.contents).not.toMatch(new RegExp(`^${key}:`, 'm'));
    }
  });

  it('carries the verbatim canonical body and the AL-5 pointer block, ending in exactly one trailing newline', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = githubCopilotGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain(architectTemplate.body);
    expect(generated.contents).toContain(GENERATED_BLOCK_BEGIN);
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('renders every one of the five real roles without throwing', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      expect(() =>
        githubCopilotGenerator.renderRole({ template, tier: template.metadata.costTier }),
      ).not.toThrow();
    }
  });
});

describe('githubCopilotGenerator.renderConductor (guarantees 6, 7) (T17, T19)', () => {
  it('writes to .github/skills/sdd-conductor/SKILL.md with only name/description and the model-invoked caveat', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();

    const generated = githubCopilotGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: ['sdd-architect'],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.path).toBe('.github/skills/sdd-conductor/SKILL.md');
    expect(generated.contents).toContain('name: "sdd-conductor"');
    expect(generated.contents.toLowerCase()).toMatch(/model-invoked/);
    expect(generated.contents).toContain(templates.conductor.body);
  });

  it('reads only id/purpose from the real canonical conductor template (AL-7)', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();

    expect(Object.keys(templates.conductor.metadata).sort()).toEqual(['id', 'purpose']);

    const generated = githubCopilotGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: [],
        gates: [],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: true,
      },
    });

    expect(generated.contents).toContain('name: "sdd-conductor"');
  });
});

describe('GitHub Copilot vendor-limit guards (guarantee 10, Error Handling Contract) (T13, T16)', () => {
  // The guard measures the *rendered* role body (provenance comment + canonical
  // body + spec-schema pointer block), not the raw canonical body (AL-25), so the
  // fixtures below size the canonical `body` to land the *rendered* length exactly
  // on the boundary rather than assuming body length === rendered length.
  async function renderedOverheadFor(sourcePath: string): Promise<number> {
    const { renderProvenance, renderSpecSchemaPointerBlock } = await import('../../src/generators/markdown-yaml.js');
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');

    const provenance = renderProvenance(`templates/${sourcePath}`);
    const pointerBlock = renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR);
    // Mirrors renderRole's `${provenance}\n${body}\n\n${pointerBlock}` assembly.
    return provenance.length + 1 + 2 + pointerBlock.length;
  }

  it('throws HarnessError(TEMPLATE) naming the role, the measured length and the 30,000 limit when the rendered role body would exceed it', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { isHarnessError } = await import('../../src/errors.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const overhead = await renderedOverheadFor(architectTemplate.sourcePath);
    const oversizedBody = 'x'.repeat(30001 - overhead);
    const oversizedTemplate = { ...architectTemplate, body: oversizedBody };

    let caught: unknown;
    try {
      githubCopilotGenerator.renderRole({ template: oversizedTemplate, tier: 'most-capable' });
    } catch (err) {
      caught = err;
    }

    expect(isHarnessError(caught)).toBe(true);
    expect((caught as any).code).toBe('TEMPLATE');
    expect((caught as any).message).toContain('30000');
    expect((caught as any).message).toContain('30001');
  });

  it('does not throw when the rendered role body is exactly at the 30,000-character limit', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const overhead = await renderedOverheadFor(architectTemplate.sourcePath);
    const exactBody = 'x'.repeat(30000 - overhead);
    const exactTemplate = { ...architectTemplate, body: exactBody };

    expect(() => githubCopilotGenerator.renderRole({ template: exactTemplate, tier: 'most-capable' })).not.toThrow();
  });

  it('throws HarnessError(TEMPLATE) naming the artifact, the measured length and the 1024 limit when the conductor description would exceed it', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { isHarnessError } = await import('../../src/errors.js');
    const templates = await loadRealTemplates();

    const oversizedPurpose = 'x'.repeat(1025);
    const oversizedTemplate = {
      ...templates.conductor,
      metadata: { ...templates.conductor.metadata, purpose: oversizedPurpose },
    };

    let caught: unknown;
    try {
      githubCopilotGenerator.renderConductor({
        template: oversizedTemplate,
        project: {
          enabledRoles: [],
          gates: [],
          specSchemaDir: '.sdd/spec-schema',
          reducedGates: true,
        },
      });
    } catch (err) {
      caught = err;
    }

    expect(isHarnessError(caught)).toBe(true);
    expect((caught as any).code).toBe('TEMPLATE');
    expect((caught as any).message).toContain('1024');
    expect((caught as any).message).toContain('1025');
  });
});

describe('renderHook — both registrations, .github/hooks/harny-feedback.json wrapper shape with the "bash" key (BG-2, V1) (Task 6.1)', () => {
  it('emits {"version":1,"hooks":{"postToolUse":[…],"agentStop":[…]}} with entries shaped {"type":"command","bash":…} — never "command"', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = githubCopilotGenerator.renderHook(fakeHookPayload(profile, runnerContents));

    expect(generated).toBeDefined();
    expect(generated!.path).toBe('.github/hooks/harny-feedback.json');
    expect(generated!.contents.endsWith('\n')).toBe(true);
    expect(generated!.contents.endsWith('\n\n')).toBe(false);

    const parsed = JSON.parse(generated!.contents);
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['agentStop', 'postToolUse']);

    for (const key of ['postToolUse', 'agentStop']) {
      const entry = parsed.hooks[key][0];
      expect(entry.type).toBe('command');
      expect(typeof entry.bash).toBe('string');
      expect(entry.command).toBeUndefined();
    }
  });

  it('still registers both postToolUse and agentStop, same shape, in the escape-hatch (no resolved profile) case (BG-8)', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const runnerContents = await loadRunnerContents();

    const generated = githubCopilotGenerator.renderHook(fakeHookPayload(undefined, runnerContents));

    expect(generated).toBeDefined();
    const parsed = JSON.parse(generated!.contents);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['agentStop', 'postToolUse']);
  });
});

describe('renderHook — no mapped command is bound to the per-edit event (BG-3) (Task 6.1)', () => {
  it("the postToolUse (accumulator) bash script invokes the runner's accumulate mode only — never the \"run\" mode that executes mapped commands", async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = githubCopilotGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const postToolUseBash: string = parsed.hooks.postToolUse[0].bash;
    const agentStopBash: string = parsed.hooks.agentStop[0].bash;

    expect(postToolUseBash).toContain('accumulate');
    expect(postToolUseBash).not.toContain('--commands');

    expect(agentStopBash).toContain('run-feedback.mjs');
    expect(agentStopBash).toContain('--commands');
  });

  it('never binds a literal STACK_PROFILES command inside the postToolUse bash script, for either resolved stack profile', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();

    for (const profile of STACK_PROFILES) {
      const generated = githubCopilotGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
      const parsed = JSON.parse(generated.contents);
      const postToolUseBash: string = parsed.hooks.postToolUse[0].bash;

      for (const command of profile.commands) {
        for (const token of command.argv) {
          if (token === 'npx') continue; // shared launcher, not distinctive on its own
          expect(
            postToolUseBash,
            `postToolUse must not bind mapped-command token "${token}" from profile "${profile.id}"`,
          ).not.toContain(token);
        }
      }
    }
  });
});

describe('renderHook — agentStop findings arrive via {"decision":"block","reason":…}, respecting the 8-consecutive-block override via stop_hook_active (BG-5, BG-6, V4) (Task 6.1)', () => {
  const FAKE_RUNNER_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'fake-runner.mjs');
  const tempDirs: string[] = [];

  async function makeFakeProjectDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-copilot-agentstop-hook-'));
    tempDirs.push(dir);
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

  function runAgentStopScript(script: string, projectDir: string, stdinPayload: Record<string, unknown>): Promise<WrapperResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', script], { cwd: projectDir, env: process.env });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
      child.stdin.write(JSON.stringify(stdinPayload));
      child.stdin.end();
    });
  }

  async function getAgentStopScript(): Promise<string> {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const generated = githubCopilotGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    return parsed.hooks.agentStop[0].bash;
  }

  it('wraps a runner exit-2 finding into {"decision":"block","reason":…} on its own stdout', async () => {
    const script = await getAgentStopScript();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '2';
      process.env.FAKE_STDOUT = 'finding from `tsc` (exit 2):\nsrc/foo.ts:1:1 - error TS1234: oops\n';
      const result = await runAgentStopScript(script, projectDir, { sessionId: 'copilot-session-1' });

      expect(result.stdout.trim().length).toBeGreaterThan(0);
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed.decision).toBe('block');
      expect(typeof parsed.reason).toBe('string');
      expect(parsed.reason).toContain('TS1234');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      delete process.env.FAKE_STDOUT;
      await cleanupTempDirs();
    }
  });

  it('produces no output on a clean runner pass (exit 0)', async () => {
    const script = await getAgentStopScript();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '0';
      const result = await runAgentStopScript(script, projectDir, { sessionId: 'copilot-session-2' });

      expect(result.stdout.trim()).toBe('');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      await cleanupTempDirs();
    }
  });

  // This one drives the REAL shared runner (not the fake-runner fixture): Copilot's
  // own `agentStop` payload carries `stop_hook_active` under that exact name (V2), the
  // same field `templates/hooks/run-feedback.mjs` already reads and suppresses on
  // (BG-5, Task 1.7). So the guarantee this test protects is that the generated
  // wrapper forwards its own stdin to the runner unmodified, letting the runner's
  // already-tested suppression do the work — not a second, wrapper-owned re-entry
  // check duplicating that logic.
  it('emits no blocking decision when stop_hook_active is true on re-entry, even though a mapped command genuinely fails (loop safety, via the real shared runner)', async () => {
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const runnerContents = await loadRunnerContents();
    const alwaysFailingProfile = {
      id: 'typescript',
      commands: [
        {
          id: 'always-fails',
          kind: 'lint',
          argv: ['node', '-e', 'process.exit(1)'],
          pathMode: 'whole-project',
          requires: {},
        },
      ],
    };
    const generated = githubCopilotGenerator.renderHook(fakeHookPayload(alwaysFailingProfile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const agentStopBash: string = parsed.hooks.agentStop[0].bash;

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-copilot-real-reentry-'));
    try {
      const runnerDir = path.join(dir, '.sdd', 'feedback');
      await fs.mkdir(runnerDir, { recursive: true });
      await fs.writeFile(path.join(runnerDir, 'run-feedback.mjs'), runnerContents, { mode: 0o755 });

      // Pre-seed a turn file directly (bypassing the accumulator) so the runner
      // treats this as a turn that touched one file, rather than an empty turn (BG-4).
      const turnKey = 'copilot-real-reentry-turn';
      const turnsDir = path.join(dir, '.sdd', 'feedback', '.turns');
      await fs.mkdir(turnsDir, { recursive: true });
      await fs.writeFile(path.join(turnsDir, turnKey), `${path.join(dir, 'touched.ts')}\n`);

      const result = await new Promise<{ code: number | null; stdout: string }>((resolve, reject) => {
        const child = spawn('sh', ['-c', agentStopBash], { cwd: dir, env: process.env });
        let stdout = '';
        child.stdout.on('data', (chunk) => (stdout += chunk));
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, stdout }));
        child.stdin.write(JSON.stringify({ sessionId: turnKey, stop_hook_active: true }));
        child.stdin.end();
      });

      expect(result.stdout.trim()).toBe('');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
