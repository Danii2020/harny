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
 */
import { describe, expect, it } from 'vitest';
import { ROLE_IDS } from '../../src/vocabulary.js';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
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
