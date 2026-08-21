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
 */
import { describe, expect, it } from 'vitest';
import { ROLE_IDS } from '../../src/vocabulary.js';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
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
