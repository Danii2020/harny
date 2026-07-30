/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/claude-code.ts and index.ts"
 * (G6) and its normative mapping tables; Behavior Guarantees 1, 2, 8, 10, 19;
 * C11, C12, C43; T19, T20, T21, T22, T23, T24.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { REAL_CLAUDE_AGENTS_DIR, REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
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
