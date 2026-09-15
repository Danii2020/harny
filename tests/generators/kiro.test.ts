/**
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "Public API — src/generators/kiro.ts" (G2) and its
 * normative mapping tables; "Verified per-tool facts" § Kiro (G4); Behavior
 * Guarantees 1, 2, 3, 5, 6, 7, 9, 10, 12; Error Handling Contract's 1024-char
 * skill-description row; roadmap.md Phase 2.2/2.4/2.5, tasks.md Task 2.7,
 * 2.8, 2.9, 2.10, 2.11, 2.19, 2.20; T9, T10, T11, T12, T13, T18, T19.
 *
 * `src/generators/kiro.ts` does not exist yet at red time — every test here is
 * expected to fail on module resolution or on a missing export, not on a typo
 * in this file.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/types.ts (MODIFIED)" (the new
 * `renderHook` method) and § Verified per-tool facts V1 (Kiro's
 * `.kiro/hooks/<kebab-name>.json`, `{"version":"v1","hooks":[{"name":…,"trigger":…,
 * "action":{"type":"command","command":…}}]}` array-of-hooks wrapper), V3
 * (`postToolUse` is the accumulation surface on both Kiro IDE and Kiro CLI —
 * `fileSave`/`fileCreate` are IDE-only and would leave Kiro CLI uninstrumented), V4
 * (Kiro delivers findings via exit 0 + STDOUT added to context — non-blocking, like
 * Claude Code), V6 (the camelCase `agentStop` trigger, reservation R1); Behavior
 * Guarantees 2, 3, 6; tasks.md Tasks 6.1, 6.4; roadmap.md Phase 6.
 * `kiroGenerator.renderHook` is a documented Phase 2 stub returning `undefined` at
 * red time (Task 2.11) — every test in the new blocks below is expected to fail
 * because the returned value has no `.path`/`.contents` to read.
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: contract.md § Data Models "Verified per-tool root instruction files"
 * (the `kiro` row); Behavior Guarantee AR-9; intent.md SC6; audit.md Test
 * Coverage T14. `guidancePath` does not exist on `Generator` yet at red time, so
 * `kiroGenerator.guidancePath` reads as `undefined` rather than
 * `'.kiro/steering'`, failing the assertion below.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md Behavior Guarantee MC-15 ("The stale claim is retracted
 * in the same change") and its `DOCS_LOOKUP_NOTE` rewrite; intent.md SC16;
 * audit.md Test Coverage T26. This supersedes, rather than merely extends,
 * this file's own pre-existing "adds the Context7-MCP-server note" assertion
 * below, which previously pinned the now-stale "harny does not write MCP
 * configuration" sentence as expected output — that sentence is false after
 * this feature and the test is updated in the same change its own contract
 * amendment lands in, per MC-15's "not left to a later docs pass" rule.
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

describe('kiroGenerator.mapModel (guarantee 9) (T9)', () => {
  it('maps each cost tier to the verified Kiro model id', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    expect(kiroGenerator.mapModel('most-capable')).toBe('claude-opus-5');
    expect(kiroGenerator.mapModel('mid')).toBe('claude-sonnet-4.6');
    expect(kiroGenerator.mapModel('cheapest')).toBe('claude-haiku-4.5');
  });

  it('returns a literal override verbatim, untranslated', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    expect(kiroGenerator.mapModel('mid', 'gpt-5.6-terra')).toBe('gpt-5.6-terra');
  });
});

describe('kiroGenerator.mapCapabilities (guarantee 5) (T10)', () => {
  it('maps the five tokenizable capabilities to their Kiro category tags, deduped, in input order', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'read-files', known: true }, // duplicate — must not double the token
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
      { name: 'web-search', known: true },
      { name: 'docs-lookup', known: true },
    ]);

    expect(mapping.tokens).toEqual(['read', 'write', 'shell', 'web', '@context7']);
  });

  it('maps task-tracking to no token at all, but still surfaces its Kiro-native-gap note', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([{ name: 'task-tracking', known: true }]);

    expect(mapping.tokens).toEqual([]);
    expect(mapping.notes).toContain(
      "task-tracking has no Kiro-native tool category; the role body's own task discipline applies",
    );
  });

  it('adds a Context7-MCP-server note whenever docs-lookup is present, naming the file harny now writes rather than claiming harny writes none', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([{ name: 'docs-lookup', known: true }]);

    expect(mapping.tokens).toContain('@context7');
    const docsLookupNote = mapping.notes.find((note) => note.includes('@context7'));
    expect(docsLookupNote).toBeDefined();

    // The stale claim (MC-15) must be gone...
    expect(docsLookupNote).not.toMatch(/harny does not write mcp configuration/i);
    // ...replaced by the file harny now writes...
    expect(docsLookupNote).toContain('.kiro/settings/mcp.json');
    // ...and a statement of why Kiro still prompts per tool call (no autoApprove, MC-11).
    expect(docsLookupNote).toContain('autoApprove');
  });

  it('adds a scope note for a scoped capability, in addition to its token', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([
      { name: 'write-files', scope: 'audit.md only', known: true },
    ]);

    expect(mapping.tokens).toContain('write');
    expect(mapping.notes).toContain('write-files is scoped to audit.md only');
  });

  it('surfaces an unknown capability token as "unmapped capability: <name>", never dropping it', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([{ name: 'ask-human', known: false }]);

    expect(mapping.notes).toContain('unmapped capability: ask-human');
  });
});

describe('kiroGenerator.renderRole (guarantees 3, 12) (T11)', () => {
  it('writes to .kiro/agents/<role>.md with tools rendered as a YAML flow sequence, the verbatim body, and the pointer block', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = kiroGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.path).toBe('.kiro/agents/sdd-auditor.md');
    expect(generated.contents).toContain('name: "sdd-auditor"');
    expect(generated.contents).toContain('model: "claude-opus-5"');
    // read-files, run-shell, write-files (scoped) => read, shell, write tokens.
    expect(generated.contents).toMatch(/tools: \[[^\]]*"write"[^\]]*\]/);
    expect(generated.contents).toContain(auditorTemplate.body);
    expect(generated.contents).toContain(GENERATED_BLOCK_BEGIN);
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('never emits permissions/resources/mcpServers/hooks/allowedTools/keyboardShortcut keys', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = kiroGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    for (const key of [
      'permissions',
      'resources',
      'mcpServers',
      'hooks',
      'allowedTools',
      'keyboardShortcut',
    ]) {
      expect(generated.contents).not.toMatch(new RegExp(`^${key}:`, 'm'));
    }
  });

  it('honors a modelOverride verbatim in the rendered frontmatter', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();
    const executorTemplate = templates.roles.get('sdd-executor')!;

    const generated = kiroGenerator.renderRole({
      template: executorTemplate,
      tier: 'mid',
      modelOverride: 'literal-override-model',
    });

    expect(generated.contents).toContain('literal-override-model');
    expect(generated.contents).not.toContain('claude-sonnet-4.6');
  });

  it('renders every one of the five real roles without throwing', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      expect(() => kiroGenerator.renderRole({ template, tier: template.metadata.costTier })).not.toThrow();
    }
  });
});

describe('the retracted DOCS_LOOKUP_NOTE still reaches a rendered Kiro role file', () => {
  it('a role declaring docs-lookup renders the updated note in .kiro/agents/<role>.md, never the retracted sentence', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;
    const hasDocsLookup = architectTemplate.metadata.capabilities.some((c) => c.name === 'docs-lookup');
    expect(hasDocsLookup).toBe(true);

    const generated = kiroGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('.kiro/settings/mcp.json');
    expect(generated.contents).not.toMatch(/harny does not write mcp configuration/i);
  });
});

describe('kiroGenerator.renderConductor (guarantees 6, 7) (T12, T19)', () => {
  it('writes to .kiro/skills/sdd-conductor/SKILL.md with name equal to the folder name and the skills-not-loaded-by-default note', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();

    const generated = kiroGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: ['sdd-architect'],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.path).toBe('.kiro/skills/sdd-conductor/SKILL.md');
    expect(generated.contents).toContain('name: "sdd-conductor"');
    expect(generated.contents.toLowerCase()).toContain('do not load skills by default');
    expect(generated.contents).toContain(templates.conductor.body);
    expect(generated.contents).toContain(GENERATED_BLOCK_BEGIN);
  });

  it('reads only id/purpose from the real canonical conductor template (AL-7)', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();

    expect(Object.keys(templates.conductor.metadata).sort()).toEqual(['id', 'purpose']);

    const generated = kiroGenerator.renderConductor({
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

describe('Kiro skill-description vendor limit (guarantee 10, Error Handling Contract) (T13)', () => {
  it('throws HarnessError(TEMPLATE) naming the artifact, the measured length and the 1024 limit when the conductor description would exceed it', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { isHarnessError } = await import('../../src/errors.js');
    const templates = await loadRealTemplates();

    const oversizedPurpose = 'x'.repeat(1025);
    const oversizedTemplate = {
      ...templates.conductor,
      metadata: { ...templates.conductor.metadata, purpose: oversizedPurpose },
    };

    let caught: unknown;
    try {
      kiroGenerator.renderConductor({
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

  it('does not throw when the description is exactly at the 1024-character limit', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();

    const exactPurpose = 'x'.repeat(1024);
    const exactTemplate = {
      ...templates.conductor,
      metadata: { ...templates.conductor.metadata, purpose: exactPurpose },
    };

    expect(() =>
      kiroGenerator.renderConductor({
        template: exactTemplate,
        project: {
          enabledRoles: [],
          gates: [],
          specSchemaDir: '.sdd/spec-schema',
          reducedGates: true,
        },
      }),
    ).not.toThrow();
  });
});

describe("the auditor's audit.md-only scope reaches the generated Kiro artifact (guarantee 5) (T18)", () => {
  it('preserves "audit.md only" in the rendered auditor role file', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = kiroGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('audit.md only');
  });
});

describe('renderHook — both registrations, .kiro/hooks/harny-feedback.json array-of-hooks wrapper shape (BG-2, V1, V6) (Task 6.1)', () => {
  it('emits {"version":"v1","hooks":[…]} with a postToolUse accumulator and a camelCase agentStop runner, each entry shaped {name,trigger,action:{type:"command",command}}', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = kiroGenerator.renderHook(fakeHookPayload(profile, runnerContents));

    expect(generated).toBeDefined();
    expect(generated!.path).toBe('.kiro/hooks/harny-feedback.json');
    expect(generated!.contents.endsWith('\n')).toBe(true);
    expect(generated!.contents.endsWith('\n\n')).toBe(false);

    const parsed = JSON.parse(generated!.contents);
    expect(parsed.version).toBe('v1');
    expect(Array.isArray(parsed.hooks)).toBe(true);

    // V6: the camelCase form from the types/ page, not "Agent Stop" or "AgentStop" —
    // the trigger id itself, not a display label.
    const triggers = parsed.hooks.map((hook: any) => hook.trigger).sort();
    expect(triggers).toEqual(['agentStop', 'postToolUse']);

    for (const hook of parsed.hooks) {
      expect(typeof hook.name).toBe('string');
      expect(hook.action.type).toBe('command');
      expect(typeof hook.action.command).toBe('string');
    }
  });

  it('still registers both postToolUse and agentStop, in the same shape, in the escape-hatch (no resolved profile) case (BG-8)', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const runnerContents = await loadRunnerContents();

    const generated = kiroGenerator.renderHook(fakeHookPayload(undefined, runnerContents));

    expect(generated).toBeDefined();
    const parsed = JSON.parse(generated!.contents);
    const triggers = parsed.hooks.map((hook: any) => hook.trigger).sort();
    expect(triggers).toEqual(['agentStop', 'postToolUse']);
  });
});

describe('renderHook — no mapped command is bound to the per-edit event (BG-3) (Task 6.1)', () => {
  it("the postToolUse action invokes the runner's accumulate mode only — never the \"run\" mode that executes mapped commands", async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = kiroGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const postToolUseHook = parsed.hooks.find((hook: any) => hook.trigger === 'postToolUse');
    const agentStopHook = parsed.hooks.find((hook: any) => hook.trigger === 'agentStop');

    expect(postToolUseHook.action.command).toContain('accumulate');
    expect(postToolUseHook.action.command).not.toContain('--commands');

    expect(agentStopHook.action.command).toContain('run-feedback.mjs');
    expect(agentStopHook.action.command).toContain('--commands');
  });

  it('never binds a literal STACK_PROFILES command inside the postToolUse action, for either resolved stack profile', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();

    for (const profile of STACK_PROFILES) {
      const generated = kiroGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
      const parsed = JSON.parse(generated.contents);
      const postToolUseHook = parsed.hooks.find((hook: any) => hook.trigger === 'postToolUse');

      for (const command of profile.commands) {
        for (const token of command.argv) {
          if (token === 'npx') continue; // shared launcher, not distinctive on its own
          expect(
            postToolUseHook.action.command,
            `postToolUse must not bind mapped-command token "${token}" from profile "${profile.id}"`,
          ).not.toContain(token);
        }
      }
    }
  });
});

describe('renderHook — agentStop findings arrive via exit 0 + STDOUT added to context, never a warning (BG-6, V4) (Task 6.1)', () => {
  const FAKE_RUNNER_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'fake-runner.mjs');
  const tempDirs: string[] = [];

  async function makeFakeProjectDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-kiro-agentstop-hook-'));
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

  function runAgentStopCommand(command: string, projectDir: string): Promise<WrapperResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], { cwd: projectDir, env: process.env });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
      child.stdin.write(JSON.stringify({ session_id: 'kiro-session-1' }));
      child.stdin.end();
    });
  }

  async function getAgentStopCommand(): Promise<string> {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const generated = kiroGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    return parsed.hooks.find((hook: any) => hook.trigger === 'agentStop').action.command;
  }

  it('surfaces a runner exit-2 finding on its own stdout while still exiting 0 — Kiro treats non-zero exit as a warning, not context', async () => {
    const command = await getAgentStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '2';
      process.env.FAKE_STDOUT = 'finding from `tsc` (exit 2):\nsrc/foo.ts:1:1 - error TS1234: oops\n';
      const result = await runAgentStopCommand(command, projectDir);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('TS1234');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      delete process.env.FAKE_STDOUT;
      await cleanupTempDirs();
    }
  });

  it('produces no output and exits 0 on a clean runner pass', async () => {
    const command = await getAgentStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '0';
      const result = await runAgentStopCommand(command, projectDir);

      expect(result.code).toBe(0);
      expect(result.stdout.trim()).toBe('');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      await cleanupTempDirs();
    }
  });
});

describe('guidancePath — the verified per-tool root instruction file (AR-9, SC6, T14)', () => {
  it("declares '.kiro/steering', Kiro's workspace steering directory", async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    expect(kiroGenerator.guidancePath).toBe('.kiro/steering');
  });
});
