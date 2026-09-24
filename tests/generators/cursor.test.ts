/**
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "Public API — src/generators/cursor.ts" (G1) and its
 * normative mapping tables; "Verified per-tool facts" § Cursor (G4);
 * Behavior Guarantees 1, 2, 5, 6, 7, 9, 12, 13; Error Handling Contract's
 * capability-with-zero-tokens row; roadmap.md Phase 2.1/2.5, tasks.md Task
 * 2.1, 2.2, 2.3, 2.4, 2.5, 2.19, 2.20; T4, T5, T6, T7, T8, T18, T19.
 *
 * `src/generators/cursor.ts` does not exist yet at red time — every test here
 * is expected to fail on module resolution or on a missing export, not on a
 * typo in this file.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/types.ts (MODIFIED)" (the new
 * `renderHook` method) and § Verified per-tool facts V1 (Cursor's
 * `.cursor/hooks.json`, top-level `{"version":1,"hooks":{...}}` wrapper, each entry
 * shaped `{"command":…,"type":"command","timeout":…}`), V3 (`afterFileEdit` is the
 * accumulation surface — preferred over `postToolUse` because it yields `file_path`
 * directly, not nested under `tool_input`), V4 (Cursor's only `stop` channel is
 * `{"followup_message":…}`, a forced continuation with no non-blocking option, and
 * its documented `loop_limit` default of 5); Behavior Guarantees 2, 3, 5, 6, 8;
 * tasks.md Tasks 6.1, 6.3; roadmap.md Phase 6.
 * `cursorGenerator.renderHook` is a documented Phase 2 stub returning `undefined`
 * at red time (Task 2.11) — every test in the new blocks below is expected to fail
 * because the returned value has no `.path`/`.contents` to read, not because of a
 * wrong assumption about the wrapper shape.
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: contract.md § Data Models "Verified per-tool root instruction files"
 * (the `cursor` row); Behavior Guarantee AR-9; intent.md SC6; audit.md Test
 * Coverage T13. `guidancePath` does not exist on `Generator` yet at red time, so
 * `cursorGenerator.guidancePath` reads as `undefined` today for the wrong reason
 * (the member is absent) rather than the contracted reason (Cursor's own root
 * file *is* `AGENTS.md`) — the test below cannot distinguish the two by value
 * alone, which is exactly why `tests/generators/registry.test.ts`'s sibling
 * assertions and this repo's `tsc` build are what actually prove the member
 * exists; this test only pins the declared value once it does.
 *
 * ---
 * Spec: specs/subagent-feedback-hooks
 * Covers: contract.md § Interfaces (`stopCommand(runner, commands, keepTurn)`);
 * Behavior Guarantees SF-1, SF-2 and SF-5 (Cursor's row: `hooks.subagentStop`,
 * findings via `followup_message`, suppressed at or above `loop_count`);
 * intent.md SC1; roadmap.md Phase 2 step 2; audit.md Test Coverage T5, T7.
 *
 * `renderHook` registers only `afterFileEdit` and `stop` at red time, so the
 * two pre-existing key-set assertions below (extended in place per roadmap.md
 * Phase 2's File Change Map, rather than duplicated into a new block) fail on
 * a missing `subagentStop` key, and the new block fails on
 * `parsed.hooks.subagentStop` being `undefined` — not on a wrong assumption
 * about the entry shape, which the pre-existing assertions already prove for
 * `stop`.
 *
 * Cursor reuses its existing `stop` wrapper verbatim (contract.md § Interfaces:
 * "wrappers unchanged; only the extra `--keep-turn` argument differs"), so the
 * `followup_message` channel and its `loop_count` suppression are already
 * covered behaviorally by the `stop` block below and are deliberately not
 * re-driven as a subprocess here. What the new block asserts instead is the
 * part that can actually diverge: the event key, the shared timeout, the same
 * `--commands` payload, and the one flag that differs.
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

describe('cursorGenerator.mapModel (guarantee 9) (T4)', () => {
  it('maps each cost tier to the verified Cursor model id', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    expect(cursorGenerator.mapModel('most-capable')).toBe('claude-opus-5');
    expect(cursorGenerator.mapModel('mid')).toBe('claude-4.6-sonnet');
    expect(cursorGenerator.mapModel('cheapest')).toBe('gpt-5.4-mini');
  });

  it('returns a bracket-parameter override verbatim, untranslated', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    expect(cursorGenerator.mapModel('mid', 'claude-opus-5[effort=high,context=300k]')).toBe(
      'claude-opus-5[effort=high,context=300k]',
    );
  });

  it('returns the documented literal "inherit" override verbatim', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    expect(cursorGenerator.mapModel('most-capable', 'inherit')).toBe('inherit');
  });
});

describe('cursorGenerator.mapCapabilities (guarantee 5) (T5)', () => {
  it('never emits a tool-allowlist token: tokens is always empty', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
    ]);

    expect(mapping.tokens).toEqual([]);
  });

  it('emits an advisory note for every known, unscoped capability', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([{ name: 'read-files', known: true }]);

    expect(mapping.notes).toContain('read-files (no Cursor tool-allowlist field; advisory only)');
  });

  it('adds a scope note in addition to the advisory note for a scoped capability', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([
      { name: 'write-files', scope: 'audit.md only', known: true },
    ]);

    expect(mapping.notes).toContain('write-files (no Cursor tool-allowlist field; advisory only)');
    expect(mapping.notes).toContain('write-files is scoped to audit.md only');
  });

  it('surfaces an unknown capability token as "unmapped capability: <name>", never dropping it', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([{ name: 'ask-human', known: false }]);

    expect(mapping.notes).toContain('unmapped capability: ask-human');
  });

  it('adds exactly one harny note explaining readonly-only enforcement when capabilities are non-empty', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
    ]);

    const readonlyNotes = mapping.notes.filter((note) =>
      note.includes('Cursor expresses permissions only via'),
    );
    expect(readonlyNotes).toHaveLength(1);
  });

  it('emits no notes at all for an empty capability list', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    const mapping = cursorGenerator.mapCapabilities([]);

    expect(mapping.notes).toEqual([]);
  });
});

describe('isReadonlyRole (C16) (T6)', () => {
  it('is true for a synthetic capability list containing neither write-files nor run-shell', async () => {
    const { isReadonlyRole } = await import('../../src/generators/cursor.js');

    expect(
      isReadonlyRole([
        { name: 'read-files', known: true },
        { name: 'docs-lookup', known: true },
      ]),
    ).toBe(true);
  });

  it('is false when write-files is present, regardless of its scope qualifier', async () => {
    const { isReadonlyRole } = await import('../../src/generators/cursor.js');

    expect(isReadonlyRole([{ name: 'write-files', scope: 'audit.md only', known: true }])).toBe(false);
  });

  it('is false when run-shell is present', async () => {
    const { isReadonlyRole } = await import('../../src/generators/cursor.js');

    expect(isReadonlyRole([{ name: 'run-shell', known: true }])).toBe(false);
  });

  it('is false for all five real canonical roles today (all declare write-files)', async () => {
    const { isReadonlyRole } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      expect(isReadonlyRole(template.metadata.capabilities)).toBe(false);
    }
  });
});

describe('cursorGenerator.renderRole (guarantees 12, 13) (T7)', () => {
  it('writes to .cursor/agents/<role>.md with quoted frontmatter, the verbatim body, the pointer block, and exactly one trailing newline', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { renderSpecSchemaPointerBlock } = await import('../../src/generators/markdown-yaml.js');
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = cursorGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.path).toBe('.cursor/agents/sdd-auditor.md');
    expect(generated.contents.startsWith('---\n')).toBe(true);
    expect(generated.contents).toContain('name: "sdd-auditor"');
    expect(generated.contents).toContain('model: "claude-opus-5"');
    expect(generated.contents).toContain('generated by harny from templates/roles/sdd-auditor.md');
    expect(generated.contents).toContain(auditorTemplate.body);
    // AL-5: the rendered artifact must carry the spec-schema pointer block, not
    // just the verbatim canonical body — this is the closed half of AL-5's bargain.
    expect(generated.contents).toContain(renderSpecSchemaPointerBlock(SPEC_SCHEMA_DIR));
    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('omits the readonly key entirely for the five real roles (none is read-only today)', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = cursorGenerator.renderRole({ template, tier: template.metadata.costTier });
      expect(generated.contents).not.toMatch(/^readonly:/m);
    }
  });

  it('emits "readonly: true" for a synthetic read-only role', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();
    const base = templates.roles.get('sdd-architect')!;
    const readonlyTemplate = {
      ...base,
      metadata: { ...base.metadata, capabilities: [{ name: 'read-files', known: true }] },
    };

    const generated = cursorGenerator.renderRole({ template: readonlyTemplate, tier: 'most-capable' });

    expect(generated.contents).toMatch(/^readonly: true$/m);
  });

  it('never emits an is_background key', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = cursorGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).not.toMatch(/is_background/);
  });

  it('honors a modelOverride verbatim in the rendered frontmatter', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();
    const executorTemplate = templates.roles.get('sdd-executor')!;

    const generated = cursorGenerator.renderRole({
      template: executorTemplate,
      tier: 'mid',
      modelOverride: 'claude-opus-5[effort=high]',
    });

    expect(generated.contents).toContain('claude-opus-5[effort=high]');
    expect(generated.contents).not.toContain('claude-4.6-sonnet');
  });
});

describe('cursorGenerator.renderConductor (guarantees 6, 7) (T8, T19)', () => {
  it('writes to .cursor/skills/sdd-conductor/SKILL.md with only name/description, the D7 overlap note, and the project-config block', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import(
      '../../src/generators/markdown-yaml.js'
    );
    const templates = await loadRealTemplates();

    const generated = cursorGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: ['sdd-architect', 'sdd-executor'],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.path).toBe('.cursor/skills/sdd-conductor/SKILL.md');
    expect(generated.contents.startsWith('---\n')).toBe(true);
    expect(generated.contents).toContain('name: "sdd-conductor"');

    const bodyIndex = generated.contents.indexOf(templates.conductor.body);
    const blockBeginIndex = generated.contents.indexOf(GENERATED_BLOCK_BEGIN);
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(blockBeginIndex).toBeGreaterThan(bodyIndex);
    expect(generated.contents).toContain(GENERATED_BLOCK_END);

    // D7: Cursor also loads .claude/agents/ and .codex/agents/ as compatibility
    // locations — the overlap must be disclosed in the rendered artifact, not
    // silently left for the user to discover.
    expect(generated.contents).toMatch(/\.claude\/agents/);
    expect(generated.contents).toMatch(/\.codex\/agents/);
    expect(generated.contents.endsWith('\n')).toBe(true);
  });

  it('reads only id/purpose from the real canonical conductor template, never cost_tier/capabilities/invocation/handoff (AL-7)', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();

    // The real ConductorMetadata type carries only id/purpose (enforced at the
    // parser); this proves renderConductor succeeds against it without reaching
    // for a field the type does not have.
    expect(Object.keys(templates.conductor.metadata).sort()).toEqual(['id', 'purpose']);

    const generated = cursorGenerator.renderConductor({
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

describe("the auditor's audit.md-only scope reaches the generated Cursor artifact (guarantee 5) (T18)", () => {
  it('preserves "audit.md only" in the rendered auditor role file', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = cursorGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('audit.md only');
  });
});

describe('renderHook — both registrations, .cursor/hooks.json wrapper shape (BG-2, V1) (Task 6.1)', () => {
  it('emits .cursor/hooks.json with a top-level version:1 and afterFileEdit (accumulator) plus stop (runner) registrations, each entry shaped {"command":…,"type":"command","timeout":…}', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = cursorGenerator.renderHook(fakeHookPayload(profile, runnerContents));

    expect(generated).toBeDefined();
    expect(generated!.path).toBe('.cursor/hooks.json');
    expect(generated!.contents.endsWith('\n')).toBe(true);
    expect(generated!.contents.endsWith('\n\n')).toBe(false);

    const parsed = JSON.parse(generated!.contents);
    expect(parsed.version).toBe(1);
    // (subagent-feedback-hooks SF-1) The third registration lives in this same
    // file, in this same entry shape — no new path and no new artifact.
    expect(Object.keys(parsed.hooks).sort()).toEqual(['afterFileEdit', 'stop', 'subagentStop']);

    for (const key of ['afterFileEdit', 'stop', 'subagentStop']) {
      const entry = parsed.hooks[key][0];
      expect(entry.type).toBe('command');
      expect(typeof entry.command).toBe('string');
      expect(typeof entry.timeout).toBe('number');
      expect(entry.timeout).toBeGreaterThan(0);
    }
  });

  it('still registers both afterFileEdit and stop, in the same wrapper shape, in the escape-hatch (no resolved profile) case (BG-8)', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const runnerContents = await loadRunnerContents();

    const generated = cursorGenerator.renderHook(fakeHookPayload(undefined, runnerContents));

    expect(generated).toBeDefined();
    const parsed = JSON.parse(generated!.contents);
    expect(Object.keys(parsed.hooks).sort()).toEqual(['afterFileEdit', 'stop', 'subagentStop']);
  });
});

describe('renderHook — the subagentStop registration is the stop registration plus --keep-turn (SF-2, SF-5)', () => {
  it('reuses the followup_message wrapper and the stop timeout, carries the same --commands payload plus --keep-turn, and never passes --whole-project', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const runnerContents = await loadRunnerContents();

    // A marker payload rather than a real stack profile, so "the same
    // --commands payload as the stop registration" is observable as one
    // distinctive token rather than inferred from two long identical strings.
    const payload = fakeHookPayload(undefined, runnerContents);
    payload.commands = [
      {
        id: 'subagent-marker-command',
        kind: 'lint',
        argv: ['node', 'subagent-marker-command-argv-token'],
        pathMode: 'per-file',
        requires: {},
      },
    ];

    const parsed = JSON.parse(cursorGenerator.renderHook(payload)!.contents);
    const stopEntry = parsed.hooks.stop[0];
    const subagentStopEntry = parsed.hooks.subagentStop[0];

    expect(subagentStopEntry.timeout).toBe(stopEntry.timeout);

    const stopCommand: string = stopEntry.command;
    const subagentStopCommand: string = subagentStopEntry.command;

    // The same wrapper, therefore the same findings channel and the same
    // loop_count suppression (SF-5's Cursor row).
    expect(subagentStopCommand).toContain('followup_message');
    expect(subagentStopCommand).toContain('loop_count');
    expect(subagentStopCommand).toContain('run-feedback.mjs');
    expect(subagentStopCommand).toContain('--commands');
    expect(subagentStopCommand).toContain('subagent-marker-command-argv-token');
    expect(subagentStopCommand).toContain('--keep-turn');

    // SF-2's two-way rule: the flag is on the subagent registration only, and
    // the CI-only flag is on neither.
    expect(stopCommand).not.toContain('--keep-turn');
    expect(subagentStopCommand).not.toContain('--whole-project');
  });
});

describe('renderHook — no mapped command is bound to the per-edit event (BG-3) (Task 6.1)', () => {
  it('the afterFileEdit (accumulator) command invokes the runner\'s accumulate mode only — never the "run" mode that executes mapped commands', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = cursorGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const afterFileEditCommand: string = parsed.hooks.afterFileEdit[0].command;
    const stopCommand: string = parsed.hooks.stop[0].command;

    expect(afterFileEditCommand).toContain('accumulate');
    expect(afterFileEditCommand).not.toContain('--commands');

    expect(stopCommand).toContain('run-feedback.mjs');
    expect(stopCommand).toContain('--commands');
  });

  it('never binds a literal STACK_PROFILES command inside the afterFileEdit registration, for either resolved stack profile', async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();

    for (const profile of STACK_PROFILES) {
      const generated = cursorGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
      const parsed = JSON.parse(generated.contents);
      const afterFileEditCommand: string = parsed.hooks.afterFileEdit[0].command;

      for (const command of profile.commands) {
        for (const token of command.argv) {
          if (token === 'npx') continue; // shared launcher, not distinctive on its own
          expect(
            afterFileEditCommand,
            `afterFileEdit must not bind mapped-command token "${token}" from profile "${profile.id}"`,
          ).not.toContain(token);
        }
      }
    }
  });
});

describe("renderHook — afterFileEdit accumulates Cursor's flat file_path payload into the shared runner's turn file (V3)", () => {
  /** (readiness-doctor.) `run-feedback.mjs` now imports its probe evaluator from
   *  the sibling `../shared/probes.mjs` (contract.md § "Modified:
   *  templates/hooks/run-feedback.mjs"). A copy that carries the runner alone,
   *  without that sibling, fails at module-load time before any of its own code
   *  runs — this fixture mirrors the real generated `.sdd/feedback/` +
   *  `.sdd/shared/` layout so the copy resolves exactly like a real scaffold. */
  async function makeProjectDir(runnerContents: string): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-cursor-accumulate-'));
    const runnerDir = path.join(dir, '.sdd', 'feedback');
    const sharedDir = path.join(dir, '.sdd', 'shared');
    await fs.mkdir(runnerDir, { recursive: true });
    await fs.mkdir(sharedDir, { recursive: true });
    await fs.writeFile(path.join(runnerDir, 'run-feedback.mjs'), runnerContents, { mode: 0o755 });
    const probesContents = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs'), 'utf8');
    await fs.writeFile(path.join(sharedDir, 'probes.mjs'), probesContents);
    return dir;
  }

  it("appends the resolved path to .sdd/feedback/.turns/<session_id> even though Cursor's afterFileEdit payload has no tool_input wrapper (unlike Claude Code's PostToolUse)", async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');

    const generated = cursorGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    const afterFileEditCommand: string = parsed.hooks.afterFileEdit[0].command;

    const projectDir = await makeProjectDir(runnerContents);
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('sh', ['-c', afterFileEditCommand], { cwd: projectDir });
        child.on('error', reject);
        child.on('close', () => resolve());
        child.stdin.write(JSON.stringify({ file_path: 'src/touched.ts', session_id: 'cursor-turn-1' }));
        child.stdin.end();
      });

      const turnFile = path.join(projectDir, '.sdd', 'feedback', '.turns', 'cursor-turn-1');
      const contents = await fs.readFile(turnFile, 'utf8');
      expect(contents).toContain('touched.ts');
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });
});

describe('renderHook — stop hook findings arrive via {"followup_message":…}, respecting the loop guard on re-entry (BG-5, BG-6, V4, R3) (Task 6.1)', () => {
  const FAKE_RUNNER_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'fake-runner.mjs');
  const tempDirs: string[] = [];

  async function makeFakeProjectDir(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-cursor-stop-hook-'));
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

  function runStopCommand(command: string, projectDir: string, stdinPayload: Record<string, unknown>): Promise<WrapperResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], { cwd: projectDir, env: process.env });
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

  async function getStopCommand(): Promise<string> {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const runnerContents = await loadRunnerContents();
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const generated = cursorGenerator.renderHook(fakeHookPayload(profile, runnerContents))!;
    const parsed = JSON.parse(generated.contents);
    return parsed.hooks.stop[0].command;
  }

  it('wraps a runner exit-2 finding into {"followup_message": "…"} on its own stdout — Cursor\'s only stop channel, a forced continuation', async () => {
    const command = await getStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '2';
      process.env.FAKE_STDOUT = 'finding from `tsc` (exit 2):\nsrc/foo.ts:1:1 - error TS1234: oops\n';
      const result = await runStopCommand(command, projectDir, { session_id: 'cursor-session-1' });

      expect(result.stdout.trim().length).toBeGreaterThan(0);
      const parsed = JSON.parse(result.stdout.trim());
      expect(typeof parsed.followup_message).toBe('string');
      expect(parsed.followup_message).toContain('TS1234');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      delete process.env.FAKE_STDOUT;
      await cleanupTempDirs();
    }
  });

  it('produces no output on a clean runner pass (exit 0)', async () => {
    const command = await getStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '0';
      const result = await runStopCommand(command, projectDir, { session_id: 'cursor-session-2' });

      expect(result.stdout.trim()).toBe('');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      await cleanupTempDirs();
    }
  });

  it("emits no followup_message once the incoming loop_count has already reached Cursor's documented loop_limit of 5, even though the runner reports a finding", async () => {
    const command = await getStopCommand();
    const projectDir = await makeFakeProjectDir();
    try {
      process.env.FAKE_EXIT_CODE = '2';
      process.env.FAKE_STDOUT = 'finding from `tsc` (exit 2):\nsrc/foo.ts:1:1 - error TS1234: oops\n';
      const result = await runStopCommand(command, projectDir, { session_id: 'cursor-session-3', loop_count: 5 });

      expect(result.stdout.trim()).toBe('');
    } finally {
      delete process.env.FAKE_EXIT_CODE;
      delete process.env.FAKE_STDOUT;
      await cleanupTempDirs();
    }
  });
});

describe('guidancePath — the verified per-tool root instruction file (AR-9, SC6, T13)', () => {
  it("declares the member, explicitly, as undefined — Cursor's own root instruction file is AGENTS.md, already covered universally", async () => {
    const { cursorGenerator } = await import('../../src/generators/cursor.js');

    // Asserted as `'in'`, not only by value: `undefined` is also what a
    // genuinely *missing* member reads as, so a bare `toBeUndefined()` could
    // never distinguish "declared undefined" (AR-9's requirement) from "not
    // declared at all" (the red-phase gap this test exists to catch).
    expect('guidancePath' in cursorGenerator).toBe(true);
    expect(cursorGenerator.guidancePath).toBeUndefined();
  });
});
