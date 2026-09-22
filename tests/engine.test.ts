/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/engine.ts" (G3, G7);
 * Behavior Guarantees 6, 9, 12; C8; T15, T16.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md "Public API — src/engine.ts" (`skillRootsFor`,
 * `buildSkillFiles`); Behavior Guarantees 3, 18, 20, 23; Error Handling
 * Contract row for a selected skill with no loaded template; roadmap.md
 * Phase 4.4/4.5; tasks.md Tasks 4.23, 4.24, 4.25.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md § "Insertion position" (appending `harny-feedback` last
 * in `CORE_SKILL_IDS` is the only index-preserving position); CLI-4 (stable
 * emission order); roadmap.md Phase 3.3; tasks.md Task 3.3.
 *
 * (Coordination note: this describe block is a narrow, standalone addition —
 * it does not touch any pre-existing test in this file, which Phase 2's
 * test-writer is editing concurrently.)
 *
 * Red-phase note: `src/vocabulary.ts` does not yet append `harny-feedback` to
 * `CORE_SKILL_IDS` (Task 3.10, deferred to `harny-implement`), so `SKILL_IDS`
 * today has 8 members, not 9, and `SKILL_IDS.indexOf('harny-feedback')` is -1.
 * `buildSkillFiles`'s `SKILL_IDS.indexOf` sort therefore sorts a fake
 * `harny-feedback` skill *first*, not last, and the length/order assertions
 * below fail against today's eight-member array for that reason.
 *
 * Spec: specs/agent-feedback-controls (Phase 2)
 * Covers: contract.md "Public API — src/engine.ts (MODIFIED)" (`buildFeedbackFiles`);
 * Behavior Guarantees 10 (one workflow per run, `pull_request`, `pathMode` ignored)
 * and 11 (canonical runner byte-for-byte); intent.md SC7, SC8; roadmap.md Phase 2
 * step 6; tasks.md Tasks 2.4, 2.5; T11, T12. `buildFeedbackFiles` does not exist yet
 * at red time, so every test in the two `describe` blocks below is expected to fail
 * with "does not provide an export named 'buildFeedbackFiles'", not a wrong
 * assumption about the workflow's rendered text.
 *
 * (Coordination note: these two blocks are appended after Phase 3's block above and
 * do not touch it or any pre-existing test in this file.)
 *
 * Spec: specs/agent-feedback-controls (Post-audit amendment A1)
 * Covers: contract.md § Interfaces `renderCiWorkflow`'s rewritten contract (the
 * `src/engine.ts` integration point A1 names as "the only `src/` function A1
 * changes behaviorally"); Behavior Guarantee 10, rewritten ("one workflow per
 * run, and its steps are the runner" — at most one install step plus exactly one
 * runner invocation, never one raw step per command); the "Why install gating may
 * be rendered into shell but command probes may not" design note (the install
 * step's own gate chain, declaration order); § "The fix" example workflow.
 *
 * `renderCiWorkflow` does not implement this shape yet at red time — it still
 * emits one raw `- name: <id> (<kind>)` / `run: <argv>` step per resolved
 * `STACK_PROFILES` command (the pre-amendment shape `audit.md` finding F1
 * describes) and never emits an install step or a `run --whole-project`
 * invocation at all. Every test in the new describe block below is therefore
 * expected to fail on a genuine shape mismatch (wrong step count for the python
 * case, zero `run --whole-project --commands` matches for every case that expects
 * one), not a wrong assumption about the workflow's rendered text.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes ("Vocabulary", `harny-doctor` appended
 * last to `CORE_SKILL_IDS`; `buildRuntimeSharedFiles` emitted from exactly one
 * call site, C27); Behavior Guarantees 11, 12; audit.md Test Coverage T22.
 *
 * Red-phase note: the "appending harny-feedback preserves emission order" test
 * below is amended in place for the tenth skill (SKILL_IDS 9 -> 10,
 * harny-doctor last in core) — the exact "modified existing test, fails until
 * the amendment lands" case AGENTS.md S6 describes. `buildRuntimeSharedFiles`
 * does not exist on `src/engine.ts` yet, so its new describe block below is
 * expected to fail with "does not provide an export named
 * 'buildRuntimeSharedFiles'".
 *
 * ---
 * Spec: specs/feedback-path-hygiene
 * Covers: contract.md § "Unchanged by construction — no code change" (`renderCiWorkflow`,
 * `renderRunnerInvocation` are not touched by this feature); Behavior Guarantee
 * PH-7 (the `.` sentinel bypasses both filters unconditionally) and PH-12
 * (`extensions` reaches the CI workflow's inline JSON via the existing
 * `JSON.stringify` call, automatically); intent.md SC7; roadmap.md Phase 3
 * step 2; tasks.md Task 3.3.
 *
 * The new describe block below drives the *decoded* runner-invocation `run:`
 * scalar of a real, generated python-profile CI workflow as a subprocess
 * against a temp project holding the real runner and `probes.mjs`, with stub
 * `ruff`/`mypy` executables on a temp `PATH` (`tests/fixtures/hooks/stub-tool.mjs`,
 * copied in as both tool names). Unlike the hook end-to-end test in
 * `tests/generators/claude-code.test.ts` (Task 3.2), this test is expected to
 * PASS already at red time: `run --whole-project` (`runWholeProject` in
 * `templates/hooks/run-feedback.mjs`) is untouched by this feature by
 * construction (PH-7) and already passes exactly `.` to every `per-file`
 * command regardless of any `extensions` field — there is no vanished-path or
 * extension-gate code path in `--whole-project` for this feature to add. It
 * stays in this file as the live regression guard SC7 exists to be: the proof
 * that CI's own argv, and therefore its behavior, is unchanged by this
 * feature, verified through a real generated artifact rather than by reading
 * `runWholeProject`'s source.
 */
import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fixtureTemplatesRoot, REAL_TEMPLATES_ROOT, TESTS_DIR } from './helpers/paths.js';

async function loadWellFormed() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  return loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
}

/** Loads the real, production templates root — required (not the `well-formed`
 *  fixture) because these tests exercise `buildFeedbackFiles`' fidelity against the
 *  real `templates/hooks/run-feedback.mjs` (BG-11) and, once Phase 2's green phase
 *  lands, the real `templates/ci/harny-feedback.yml`. Mirrors the same
 *  REAL_TEMPLATES_ROOT convention `tests/generators/claude-code.test.ts` already
 *  uses for its role/conductor oracle tests. */
async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
}

/** A minimal, realistic `HarnessConfig`-shaped object: one enabled role (so
 *  `buildPayload` never hits its TEMPLATE-error path against the real templates),
 *  all three gates, and the caller's `tools`/`stack`. */
function feedbackTestConfig(overrides: { tools: readonly string[]; stack?: string }) {
  return {
    version: 1 as const,
    tools: overrides.tools,
    roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
    gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    stack: overrides.stack,
  };
}

describe('buildPayload (T15)', () => {
  it('includes only the enabled roles, always in ROLE_IDS order', async () => {
    const { buildPayload } = await import('../src/engine.js');
    const templates = await loadWellFormed();

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      // Deliberately scrambled and partial: documentation and test-writer disabled,
      // remaining three listed out of ROLE_IDS order.
      roles: [
        { id: 'sdd-auditor' as const, tier: 'most-capable' as const },
        { id: 'sdd-architect' as const, tier: 'most-capable' as const },
        { id: 'sdd-executor' as const, tier: 'mid' as const },
      ],
      gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    };

    const payload = buildPayload(config as any, templates);

    expect(payload.roles.map((r) => r.template.metadata.id)).toEqual([
      'sdd-architect',
      'sdd-executor',
      'sdd-auditor',
    ]);
  });

  it('always populates the conductor, regardless of which roles were selected (guarantee 6)', async () => {
    const { buildPayload } = await import('../src/engine.js');
    const templates = await loadWellFormed();

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
      gates: [] as const,
    };

    const payload = buildPayload(config as any, templates);

    expect(payload.conductor.template.metadata.id).toBe('sdd-conductor');
  });

  it('computes reducedGates when fewer than three gates are active (guarantee 9)', async () => {
    const { buildPayload } = await import('../src/engine.js');
    const templates = await loadWellFormed();

    const full = buildPayload(
      {
        version: 1 as const,
        tools: ['claude-code'] as const,
        roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
        gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
      } as any,
      templates,
    );
    const reduced = buildPayload(
      {
        version: 1 as const,
        tools: ['claude-code'] as const,
        roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
        gates: ['post-specs'] as const,
      } as any,
      templates,
    );

    expect(full.conductor.project.reducedGates).toBe(false);
    expect(reduced.conductor.project.reducedGates).toBe(true);
    expect(reduced.conductor.project.gates).toEqual(['post-specs']);
  });

  it('throws TEMPLATE when an enabled role has no corresponding canonical template', async () => {
    const { buildPayload } = await import('../src/engine.js');
    const { isHarnessError } = await import('../src/errors.js');
    const templates = await loadWellFormed();

    // Simulate an incomplete template set by removing one role's entry directly,
    // independent of the loader (which already refuses to build an incomplete tree).
    const incompleteRoles = new Map(templates.roles);
    incompleteRoles.delete('sdd-executor');
    const incompleteTemplates = { ...templates, roles: incompleteRoles };

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [{ id: 'sdd-executor' as const, tier: 'mid' as const }],
      gates: [] as const,
    };

    try {
      buildPayload(config as any, incompleteTemplates as any);
      expect.unreachable('expected buildPayload to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as Error).message).toContain('sdd-executor');
    }
  });
});

describe('buildSharedFiles (T16, guarantee 12)', () => {
  it('emits exactly the five spec-schema files (byte-identical to source) plus .sdd/harness.json', async () => {
    const { buildPayload, buildSharedFiles, SPEC_SCHEMA_DIR, HARNESS_CONFIG_PATH } = await import(
      '../src/engine.js'
    );
    const templates = await loadWellFormed();

    const config = {
      version: 1 as const,
      tools: ['claude-code', 'cursor'] as const,
      roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
      gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    };

    const payload = buildPayload(config as any, templates);
    const files = buildSharedFiles(payload);

    expect(files).toHaveLength(6);

    for (const schema of templates.specSchema) {
      const expectedPath = `${SPEC_SCHEMA_DIR}/${schema.name}.md`;
      const generated = files.find((f) => f.path === expectedPath);
      expect(generated).toBeDefined();
      expect(generated?.contents).toBe(schema.contents);
    }

    const configFile = files.find((f) => f.path === HARNESS_CONFIG_PATH);
    expect(configFile).toBeDefined();
    expect(configFile?.contents.endsWith('\n')).toBe(true);
  });
});

describe('buildPayload — TEMPLATE error for a selected skill with no loaded template (Error Handling Contract) (Task 4.25)', () => {
  it('throws TEMPLATE naming the skill id when a selected skill has no corresponding canonical template', async () => {
    const { buildPayload } = await import('../src/engine.js');
    const { isHarnessError } = await import('../src/errors.js');
    const templates = await loadWellFormed();

    // The well-formed fixture's skills/ subtree carries only the seven
    // default-selected skills (six core + harny-standards) — harny-adr is
    // deliberately absent, exactly the shape `src/engine.ts:54-58` already
    // uses for an enabled role with no loaded template.
    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
      gates: [] as const,
      skills: ['harny-propose', 'harny-adr'] as const,
    };

    try {
      buildPayload(config as any, templates as any);
      expect.unreachable('expected buildPayload to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as Error).message).toContain('harny-adr');
    }
  });
});

describe('skillRootsFor — dedupe and sort resolved generators\' skillsDir (Gu 3, Gu 20) (Task 4.23)', () => {
  it('dedupes repeated skillsDir values and sorts the result', async () => {
    const { skillRootsFor } = await import('../src/engine.js');

    const fakeGenerators = [
      { skillsDir: '.agents/skills' },
      { skillsDir: '.claude/skills' },
      { skillsDir: '.agents/skills' },
      { skillsDir: '.kiro/skills' },
    ];

    expect(skillRootsFor(fakeGenerators as any)).toEqual(['.agents/skills', '.claude/skills', '.kiro/skills']);
  });

  it('returns an empty array when no generator is resolved (a skipped tool contributes no root)', async () => {
    const { skillRootsFor } = await import('../src/engine.js');

    expect(skillRootsFor([])).toEqual([]);
  });
});

describe('buildSkillFiles — emission order and content fidelity (Gu 9, Gu 18, Gu 23) (Task 4.24)', () => {
  function fakeSkill(id: string, files: Array<{ name: string; contents: string }>) {
    return {
      id,
      sourcePath: `skills/${id}`,
      files: files.map((f) => ({ ...f, sourcePath: `skills/${id}/${f.name}` })),
    };
  }

  it('emits root order, then SKILL_IDS order, then name order, with contents verbatim and no generated block', async () => {
    const { buildSkillFiles } = await import('../src/engine.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../src/generators/markdown-yaml.js');

    // Deliberately scrambled input order: harny-sync listed before
    // harny-propose in `payload.skills`, to prove emission order follows
    // SKILL_IDS, not input order.
    const payload = {
      roles: [],
      conductor: {} as any,
      specSchema: [],
      skills: [
        fakeSkill('harny-sync', [
          { name: 'capability-template.md', contents: 'CAP TEMPLATE\n' },
          { name: 'SKILL.md', contents: 'SYNC BODY\n' },
        ]),
        fakeSkill('harny-propose', [{ name: 'SKILL.md', contents: 'PROPOSE BODY\n' }]),
      ],
      skillsReadme: { name: 'README.md', contents: 'SHAPE CONTRACT\n', sourcePath: 'skills/README.md' },
      config: {} as any,
    };

    const roots = ['.agents/skills', '.claude/skills'];
    const files = buildSkillFiles(payload as any, roots);

    expect(files.map((f) => f.path)).toEqual([
      '.agents/skills/README.md',
      '.agents/skills/harny-propose/SKILL.md',
      '.agents/skills/harny-sync/SKILL.md',
      '.agents/skills/harny-sync/capability-template.md',
      '.claude/skills/README.md',
      '.claude/skills/harny-propose/SKILL.md',
      '.claude/skills/harny-sync/SKILL.md',
      '.claude/skills/harny-sync/capability-template.md',
    ]);

    // Contents verbatim: no header, no provenance comment, no generated block.
    for (const file of files) {
      expect(file.contents.includes(GENERATED_BLOCK_BEGIN)).toBe(false);
      expect(file.contents.includes('generated by harny')).toBe(false);
    }
    const proposeFile = files.find((f) => f.path === '.agents/skills/harny-propose/SKILL.md');
    expect(proposeFile?.contents).toBe('PROPOSE BODY\n');
    const syncSkillFile = files.find((f) => f.path === '.claude/skills/harny-sync/SKILL.md');
    expect(syncSkillFile?.contents).toBe('SYNC BODY\n');
  });

  it('emits nothing for an empty roots list', async () => {
    const { buildSkillFiles } = await import('../src/engine.js');

    const payload = {
      roles: [],
      conductor: {} as any,
      specSchema: [],
      skills: [fakeSkill('harny-propose', [{ name: 'SKILL.md', contents: 'PROPOSE BODY\n' }])],
      config: {} as any,
    };

    expect(buildSkillFiles(payload as any, [])).toEqual([]);
  });
});

describe('appending harny-feedback, then harny-doctor, preserves emission order (CLI-4) (agent-feedback-controls Task 3.3; amended by specs/readiness-doctor)', () => {
  function fakeSkill(id: string) {
    return {
      id,
      sourcePath: `skills/${id}`,
      files: [{ name: 'SKILL.md', contents: `${id} BODY\n`, sourcePath: `skills/${id}/SKILL.md` }],
    };
  }

  it('emits all ten skills in SKILL_IDS order: the nine pre-existing skills keep their exact prior relative order, and harny-doctor is last among the core skills, immediately before the optional skills', async () => {
    const { buildSkillFiles } = await import('../src/engine.js');
    const { SKILL_IDS } = await import('../src/vocabulary.js');

    // The nine skills' order as fixed before this feature — asserted
    // independently of SKILL_IDS itself, so this test cannot pass merely
    // because SKILL_IDS and this hardcoded list were both changed together.
    const PRE_EXISTING_NINE_IN_ORDER = [
      'harny-propose',
      'harny-test',
      'harny-implement',
      'harny-audit',
      'harny-document',
      'harny-sync',
      'harny-feedback',
      'harny-adr',
      'harny-standards',
    ];
    // (readiness-doctor) 9 -> 10: harny-doctor is appended last in
    // CORE_SKILL_IDS, so SKILL_IDS gains a tenth member.
    expect(SKILL_IDS.length).toBe(10);

    // Deliberately scrambled input order (reversed), independent of
    // SKILL_IDS ordering, mirroring the sibling "buildSkillFiles" test's
    // approach of proving emission order follows SKILL_IDS, not input order.
    const scrambledIds = [...PRE_EXISTING_NINE_IN_ORDER, 'harny-doctor'].reverse();
    const payload = {
      roles: [],
      conductor: {} as any,
      specSchema: [],
      skills: scrambledIds.map(fakeSkill),
      skillsReadme: undefined,
      config: {} as any,
    };

    const files = buildSkillFiles(payload as any, ['.agents/skills']);
    const emittedIds = files.map((f) => f.path.split('/')[2]);

    const emittedExistingNine = emittedIds.filter((id) => id !== 'harny-doctor');
    expect(emittedExistingNine).toEqual(PRE_EXISTING_NINE_IN_ORDER);
    // harny-doctor is last within the eight core skills (index 7 of 10),
    // immediately before the first optional skill — NOT last among all ten,
    // since SKILL_IDS is [...CORE_SKILL_IDS, ...OPTIONAL_SKILL_IDS] and
    // harny-doctor is appended to the end of CORE_SKILL_IDS, not SKILL_IDS.
    expect(emittedIds[7]).toBe('harny-doctor');
    expect(emittedIds[8]).toBe('harny-adr');
    expect(emittedIds).toEqual(SKILL_IDS);
  });
});

describe('buildRuntimeSharedFiles — the shared probe module is written exactly once per run, from one call site (readiness-doctor, contract.md § State Changes, C27)', () => {
  it.each([
    ['a single tool', ['claude-code']],
    ['three tools', ['claude-code', 'cursor', 'kiro']],
    ['all five tools', ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']],
  ])('%s selected still yields exactly one .sdd/shared/probes.mjs file', async (_label, tools) => {
    const { buildPayload, buildRuntimeSharedFiles, SHARED_PROBES_PATH } = await import('../src/engine.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(feedbackTestConfig({ tools, stack: 'typescript' }) as any, templates);
    const files = buildRuntimeSharedFiles(payload);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(SHARED_PROBES_PATH);
  });

  it('is byte-for-byte identical to templates/shared/probes.mjs (BG-11)', async () => {
    const { buildPayload, buildRuntimeSharedFiles, SHARED_PROBES_PATH } = await import('../src/engine.js');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const templates = await loadRealTemplates();

    const payload = buildPayload(feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any, templates);
    const sharedFile = buildRuntimeSharedFiles(payload).find((f) => f.path === SHARED_PROBES_PATH);

    const sourceContents = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs'), 'utf8');
    expect(sharedFile?.contents).toBe(sourceContents);
  });
});

describe('buildFeedbackFiles — the runner and workflow are written exactly once per run, regardless of tool count (BG-10, SC7) (Task 2.4)', () => {
  it.each([
    ['a single tool', ['claude-code']],
    ['three tools', ['claude-code', 'cursor', 'kiro']],
    ['all five tools', ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']],
  ])('%s selected still yields exactly one runner file, one workflow file, and one scratch-dir .gitignore', async (_label, tools) => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH, TOUCHED_FILES_DIR } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(feedbackTestConfig({ tools, stack: 'typescript' }) as any, templates);
    const files = buildFeedbackFiles(payload);

    expect(files).toHaveLength(3);
    expect(files.filter((f) => f.path === FEEDBACK_RUNNER_PATH)).toHaveLength(1);
    expect(files.filter((f) => f.path === CI_WORKFLOW_PATH)).toHaveLength(1);
    expect(files.filter((f) => f.path === `${TOUCHED_FILES_DIR}/.gitignore`)).toHaveLength(1);
  });

  it('the scratch-dir .gitignore ignores everything written under TOUCHED_FILES_DIR, in the target repo (contract.md State Changes)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { TOUCHED_FILES_DIR } = await import('../src/feedback.js');
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { execFileSync } = await import('node:child_process');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const gitignoreFile = buildFeedbackFiles(payload).find((f) => f.path === `${TOUCHED_FILES_DIR}/.gitignore`);
    expect(gitignoreFile?.contents).toBe('*\n!.gitignore\n');

    // Prove it actually works, not just that the right bytes were produced:
    // materialize it in a real git repo and confirm (a) a turn-scratch file
    // inside TOUCHED_FILES_DIR is genuinely ignored, and (b) the .gitignore
    // file itself is NOT self-ignored — a bare `*` pattern with no `!.gitignore`
    // exception would make `git add .` refuse to ever track it in a real
    // project (git won't add an explicitly-ignored path without --force),
    // which would silently defeat the whole mechanism on a fresh clone.
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-turns-gitignore-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: repoDir });
      const turnsDir = path.join(repoDir, TOUCHED_FILES_DIR);
      await fs.mkdir(turnsDir, { recursive: true });
      await fs.writeFile(path.join(turnsDir, '.gitignore'), gitignoreFile!.contents, 'utf8');
      await fs.writeFile(path.join(turnsDir, 'some-turn-key'), 'src/a.ts\n', 'utf8');

      const status = execFileSync('git', ['status', '--porcelain', '--ignored'], {
        cwd: repoDir,
        encoding: 'utf8',
      });
      expect(status).toContain('some-turn-key');
      expect(status).toMatch(/^!! /m);
      expect(status).not.toMatch(/^\?\? .*some-turn-key/m);

      // The .gitignore file itself must remain addable — this is the exact
      // failure mode a bare `*` (no self-exception) would cause.
      execFileSync('git', ['add', path.join(turnsDir, '.gitignore')], { cwd: repoDir });
      const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
        cwd: repoDir,
        encoding: 'utf8',
      });
      expect(staged).toContain(`${TOUCHED_FILES_DIR}/.gitignore`);
    } finally {
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  });

  it('the runner and workflow contents are byte-identical whether one tool or all five are selected (SC7)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const onePayload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const fivePayload = buildPayload(
      feedbackTestConfig({
        tools: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'],
        stack: 'typescript',
      }) as any,
      templates,
    );

    const oneFiles = buildFeedbackFiles(onePayload);
    const fiveFiles = buildFeedbackFiles(fivePayload);

    for (const path of [FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH]) {
      const oneContents = oneFiles.find((f) => f.path === path)?.contents;
      const fiveContents = fiveFiles.find((f) => f.path === path)?.contents;
      expect(oneContents, `${path} missing from the one-tool run`).toBeDefined();
      expect(oneContents).toBe(fiveContents);
    }
  });

  it('the runner file is byte-for-byte identical to templates/hooks/run-feedback.mjs (BG-11)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { FEEDBACK_RUNNER_PATH } = await import('../src/feedback.js');
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const runnerFile = buildFeedbackFiles(payload).find((f) => f.path === FEEDBACK_RUNNER_PATH);

    const sourceContents = await fs.readFile(
      path.join(REAL_TEMPLATES_ROOT, 'hooks', 'run-feedback.mjs'),
      'utf8',
    );
    expect(runnerFile?.contents).toBe(sourceContents);
  });
});

describe('buildFeedbackFiles — the CI workflow triggers on pull_request and runs the resolved profile\'s commands (SC8) (Task 2.5)', () => {
  it('declares a pull_request trigger and mentions every command of the resolved typescript profile', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH, STACK_PROFILES } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);

    expect(workflow).toBeDefined();
    expect(workflow?.contents).toMatch(/pull_request/);

    const typescriptProfile = STACK_PROFILES.find((p) => p.id === 'typescript')!;
    for (const command of typescriptProfile.commands) {
      // The distinctive part of each command (skip the shared "npx" launcher,
      // which is not on its own evidence the workflow runs *this* command).
      const distinctiveToken = command.argv.find((token) => token !== 'npx') ?? command.argv[0];
      expect(workflow?.contents).toContain(distinctiveToken);
    }
  });

  it('a different resolved profile changes which commands the workflow runs', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const tsPayload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const pyPayload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'python' }) as any,
      templates,
    );

    const tsWorkflow = buildFeedbackFiles(tsPayload).find((f) => f.path === CI_WORKFLOW_PATH);
    const pyWorkflow = buildFeedbackFiles(pyPayload).find((f) => f.path === CI_WORKFLOW_PATH);

    expect(tsWorkflow?.contents).toContain('eslint');
    expect(tsWorkflow?.contents).not.toContain('ruff');
    expect(pyWorkflow?.contents).toContain('ruff');
    expect(pyWorkflow?.contents).not.toContain('eslint');
  });

  it('an unresolved stack still yields a well-formed workflow that runs none of the built-in profiles\' commands (BG-8)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'some-unrecognized-stack-xyz' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);

    expect(workflow).toBeDefined();
    expect(workflow?.contents.length).toBeGreaterThan(0);
    expect(workflow?.contents).not.toContain('eslint');
    expect(workflow?.contents).not.toContain('ruff');
  });
});

describe('buildFeedbackFiles — renderCiWorkflow (A1): at most one install step, exactly one runner invocation, never one raw step per command (BG-10, BG-19, BG-20)', () => {
  /** Everything between the generated-block markers, exclusive. */
  function generatedBlockOf(contents: string): string {
    const lines = contents.split('\n');
    const beginIndex = lines.findIndex((line) => line.includes('harny:begin generated project configuration'));
    const endIndex = lines.findIndex((line) => line.includes('harny:end generated project configuration'));
    expect(beginIndex, 'generated-block begin marker not found').toBeGreaterThanOrEqual(0);
    expect(endIndex, 'generated-block end marker not found').toBeGreaterThan(beginIndex);
    return lines.slice(beginIndex + 1, endIndex).join('\n');
  }

  /** Pairs each `- name: …` line with its following `run: …` line — the exact
   *  two-line-per-step shape both the pre-amendment code and contract.md's own
   *  A1 example (§ "The fix") use. */
  function parseSteps(block: string): Array<{ name: string; run: string }> {
    const steps: Array<{ name: string; run: string }> = [];
    const regex = /-\s*name:\s*(.+)\n\s*run:\s*(.+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(block))) {
      steps.push({ name: match[1], run: match[2] });
    }
    return steps;
  }

  const RUNNER_INVOCATION = /run --whole-project --commands/;

  it('the typescript profile: exactly one install step (ciInstall\'s gate chain) and exactly one runner-invocation step — never a raw step per command', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH, STACK_PROFILES } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);
    const block = generatedBlockOf(workflow!.contents);
    const steps = parseSteps(block);

    // Exactly two steps total: the install step and the runner invocation. The
    // *count* alone cannot distinguish this from the forbidden one-step-per-command
    // shape (eslint + tsc also totals 2) — the assertions below are what actually
    // discriminate the two shapes.
    expect(steps).toHaveLength(2);

    const runnerSteps = steps.filter((step) => RUNNER_INVOCATION.test(step.run));
    expect(runnerSteps).toHaveLength(1);

    const nonRunnerSteps = steps.filter((step) => !RUNNER_INVOCATION.test(step.run));
    expect(nonRunnerSteps).toHaveLength(1);

    // No raw per-command step survives (the forbidden pre-amendment shape).
    expect(steps.some((step) => /\(lint\)|\(typecheck\)/.test(step.name))).toBe(false);

    // The runner invocation carries both of the resolved profile's commands —
    // distinctive tokens only, "npx" is a shared launcher and proves nothing on
    // its own (mirrors the existing pull_request test's own convention above).
    const typescriptProfile = STACK_PROFILES.find((p) => p.id === 'typescript')!;
    for (const command of typescriptProfile.commands) {
      for (const token of command.argv) {
        if (token === 'npx') continue;
        expect(runnerSteps[0].run).toContain(token);
      }
    }

    // The install step's gate chain checks npm-ci's candidate before
    // npm-install's, in ciInstall's own declaration order — never literalled
    // into src/engine.ts itself (BG-7), only into this generated output.
    const installRun = nonRunnerSteps[0].run;
    const npmCiGateIndex = installRun.indexOf('package-lock.json');
    const npmInstallGateIndex = installRun.indexOf('package.json');
    expect(npmCiGateIndex).toBeGreaterThanOrEqual(0);
    expect(npmInstallGateIndex).toBeGreaterThan(npmCiGateIndex);
  });

  it('the python profile: no install step at all (no ciInstall declared) — exactly one step, the runner invocation (BG-21)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH, STACK_PROFILES } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'python' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);
    const block = generatedBlockOf(workflow!.contents);
    const steps = parseSteps(block);

    expect(steps).toHaveLength(1);
    expect(RUNNER_INVOCATION.test(steps[0].run)).toBe(true);

    const pythonProfile = STACK_PROFILES.find((p) => p.id === 'python')!;
    for (const command of pythonProfile.commands) {
      for (const token of command.argv) {
        expect(steps[0].run).toContain(token);
      }
    }

    // No install-gate tokens anywhere — python declares no ciInstall.
    expect(block).not.toContain('package-lock.json');
    expect(block).not.toContain('package.json');
  });

  it('an unresolved stack still yields exactly one notice step — no install, no runner invocation (BG-8, unchanged by A1)', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'some-unrecognized-stack-xyz' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);
    const block = generatedBlockOf(workflow!.contents);
    const steps = parseSteps(block);

    expect(steps).toHaveLength(1);
    expect(RUNNER_INVOCATION.test(steps[0].run)).toBe(false);
    expect(block).not.toContain('package-lock.json');
    expect(block).not.toContain('package.json');
  });
});

describe('the CI runner-invocation guard covers both the feedback runner and the shared probe module (readiness-doctor, contract.md § "Modified: run-feedback.mjs", T22)', () => {
  it('the generated workflow\'s runner-invocation step checks both .sdd/feedback/run-feedback.mjs and .sdd/shared/probes.mjs before running', async () => {
    const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const templates = await loadRealTemplates();

    const payload = buildPayload(
      feedbackTestConfig({ tools: ['claude-code'], stack: 'typescript' }) as any,
      templates,
    );
    const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH);

    // Amended guard: a checkout missing either file cannot run (Error
    // Handling Contract row for a CI checkout missing the shared module).
    expect(workflow?.contents).toContain('.sdd/feedback/run-feedback.mjs');
    expect(workflow?.contents).toContain('.sdd/shared/probes.mjs');
  });
});

describe('CI workflow — python profile end-to-end through the real runner: "." reaches the stub tools unfiltered (feedback-path-hygiene, PH-7, PH-12, SC7) (Task 3.3)', () => {
  const STUB_TOOL_PATH = path.join(TESTS_DIR, 'fixtures', 'hooks', 'stub-tool.mjs');
  const tempDirs: string[] = [];

  function ciGeneratedBlockOf(contents: string): string {
    const lines = contents.split('\n');
    const beginIndex = lines.findIndex((line) => line.includes('harny:begin generated project configuration'));
    const endIndex = lines.findIndex((line) => line.includes('harny:end generated project configuration'));
    expect(beginIndex, 'generated-block begin marker not found').toBeGreaterThanOrEqual(0);
    expect(endIndex, 'generated-block end marker not found').toBeGreaterThan(beginIndex);
    return lines.slice(beginIndex + 1, endIndex).join('\n');
  }

  /** Pairs each `- name: …` line with its following `run: …` line, mirroring
   *  the sibling `parseSteps` helper in the describe block above (kept
   *  file-local rather than shared, since neither is exported). */
  function ciParseSteps(block: string): Array<{ name: string; run: string }> {
    const steps: Array<{ name: string; run: string }> = [];
    const regex = /-\s*name:\s*(.+)\n\s*run:\s*(.+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(block))) {
      steps.push({ name: match[1], run: match[2] });
    }
    return steps;
  }

  async function makeCiE2eProjectDir(): Promise<{ projectDir: string; binDir: string; stubLog: string }> {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-python-ci-e2e-'));
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

  (process.platform === 'win32' ? it.skip : it)(
    'the decoded runner-invocation run: scalar executes and passes exactly "." to both stub tools, exiting 0',
    async () => {
      const { buildPayload, buildFeedbackFiles } = await import('../src/engine.js');
      const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
      const templates = await loadRealTemplates();

      const payload = buildPayload(feedbackTestConfig({ tools: ['claude-code'], stack: 'python' }) as any, templates);
      const workflow = buildFeedbackFiles(payload).find((f) => f.path === CI_WORKFLOW_PATH)!;
      const block = ciGeneratedBlockOf(workflow.contents);
      const steps = ciParseSteps(block);

      // The python profile declares no ciInstall (BG-21), so the generated
      // block is exactly one step: the runner invocation.
      expect(steps).toHaveLength(1);

      // `yamlQuote` (src/generators/markdown-yaml.ts) escapes only `\`, `"`,
      // and newline — a subset of JSON string syntax — so the quoted `run:`
      // scalar decodes cleanly with JSON.parse (roadmap.md Phase 3 step 2).
      const shellCommand = JSON.parse(steps[0].run) as string;
      expect(shellCommand).toContain('run --whole-project --commands');

      const { projectDir, binDir, stubLog } = await makeCiE2eProjectDir();
      try {
        const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
          const child = spawn('sh', ['-c', shellCommand], {
            cwd: projectDir,
            env: {
              ...process.env,
              PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
              STUB_TOOL_LOG: stubLog,
            },
          });
          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (chunk) => (stdout += chunk));
          child.stderr.on('data', (chunk) => (stderr += chunk));
          child.on('error', reject);
          child.on('close', (code) => resolve({ code, stdout, stderr }));
        });

        expect(result.code).toBe(0);

        const logLines = (await fs.readFile(stubLog, 'utf8').catch(() => ''))
          .trim()
          .split('\n')
          .filter(Boolean);
        const invocations = logLines.map((line) => JSON.parse(line) as { tool: string; argv: string[] });

        const ruffCalls = invocations.filter((inv) => inv.tool === 'ruff');
        const mypyCalls = invocations.filter((inv) => inv.tool === 'mypy');
        expect(ruffCalls).toHaveLength(1);
        expect(ruffCalls[0].argv).toEqual(['check', '.']);
        expect(mypyCalls).toHaveLength(1);
        expect(mypyCalls[0].argv).toEqual(['.']);
      } finally {
        await cleanupTempDirs();
      }
    },
  );
});
