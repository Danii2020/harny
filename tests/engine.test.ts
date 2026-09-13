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
 */
import { describe, expect, it } from 'vitest';
import { fixtureTemplatesRoot } from './helpers/paths.js';

async function loadWellFormed() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  return loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
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
