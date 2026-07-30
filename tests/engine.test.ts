/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/engine.ts" (G3, G7);
 * Behavior Guarantees 6, 9, 12; C8; T15, T16.
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
