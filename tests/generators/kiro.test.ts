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
 */
import { describe, expect, it } from 'vitest';
import { ROLE_IDS } from '../../src/vocabulary.js';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
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

  it('adds the Context7-MCP-server note whenever docs-lookup is present', async () => {
    const { kiroGenerator } = await import('../../src/generators/kiro.js');

    const mapping = kiroGenerator.mapCapabilities([{ name: 'docs-lookup', known: true }]);

    expect(mapping.tokens).toContain('@context7');
    expect(mapping.notes).toContain(
      'docs-lookup maps to the Context7 MCP server (@context7); harny does not write MCP configuration — see plan.md §4 "future scope"',
    );
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
