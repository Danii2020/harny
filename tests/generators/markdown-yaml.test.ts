/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/markdown-yaml.ts" (G5);
 * Behavior Guarantees 3, 9; the contract's illustrated `renderFrontmatter`
 * shape; C10; T17, T18.
 */
import { describe, expect, it } from 'vitest';

describe('yamlQuote (T17)', () => {
  it('wraps a plain scalar in double quotes', async () => {
    const { yamlQuote } = await import('../../src/generators/markdown-yaml.js');
    expect(yamlQuote('plain text')).toBe('"plain text"');
  });

  it('escapes an embedded double quote', async () => {
    const { yamlQuote } = await import('../../src/generators/markdown-yaml.js');
    expect(yamlQuote('quote " inside')).toBe('"quote \\" inside"');
  });

  it('escapes a backslash', async () => {
    const { yamlQuote } = await import('../../src/generators/markdown-yaml.js');
    expect(yamlQuote('a\\b')).toBe('"a\\\\b"');
  });

  it('encodes a newline as a literal \\n rather than a real line break', async () => {
    const { yamlQuote } = await import('../../src/generators/markdown-yaml.js');
    const quoted = yamlQuote('line1\nline2');
    expect(quoted).toBe('"line1\\nline2"');
    expect(quoted.includes('\n')).toBe(false);
  });
});

describe('renderFrontmatter (T17)', () => {
  it('renders quoted fields, an unquoted raw field, and comment lines between the delimiters', async () => {
    const { renderFrontmatter } = await import('../../src/generators/markdown-yaml.js');

    const output = renderFrontmatter(
      [
        { key: 'name', value: 'sdd-auditor' },
        { key: 'model', value: 'opus', raw: true },
      ],
      ['capability note: write-files is scoped to audit.md only'],
    );

    expect(output).toBe(
      '---\n' +
        'name: "sdd-auditor"\n' +
        'model: opus\n' +
        '# capability note: write-files is scoped to audit.md only\n' +
        '---\n',
    );
  });

  it('omits the comment lines entirely when no comments are given', async () => {
    const { renderFrontmatter } = await import('../../src/generators/markdown-yaml.js');

    const output = renderFrontmatter([{ key: 'name', value: 'sdd-architect' }]);

    expect(output).toBe('---\nname: "sdd-architect"\n---\n');
  });
});

describe('renderProjectConfigBlock (guarantees 3, 9) (T18)', () => {
  it('is fully delimited by the begin/end markers and states roles, gates, stack, and schema dir', async () => {
    const { renderProjectConfigBlock, GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import(
      '../../src/generators/markdown-yaml.js'
    );

    const block = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect', 'sdd-executor'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: 'node-typescript',
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
    });

    expect(block.startsWith(GENERATED_BLOCK_BEGIN)).toBe(true);
    expect(block.trimEnd().endsWith(GENERATED_BLOCK_END)).toBe(true);
    expect(block).toContain('sdd-architect');
    expect(block).toContain('sdd-executor');
    expect(block).toContain('post-specs');
    expect(block).toContain('node-typescript');
    expect(block).toContain('.sdd/spec-schema');
  });

  it('emits an explicit reduced-gates notice only when reducedGates is true', async () => {
    const { renderProjectConfigBlock } = await import('../../src/generators/markdown-yaml.js');

    const full = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
    });
    const reduced = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs'],
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: true,
    });

    expect(full.toLowerCase()).not.toContain('reduced');
    expect(reduced.toLowerCase()).toContain('reduced');
  });
});

describe('renderProvenance (T17)', () => {
  it('names the canonical source path it was generated from', async () => {
    const { renderProvenance } = await import('../../src/generators/markdown-yaml.js');
    const line = renderProvenance('templates/roles/sdd-auditor.md');
    expect(line).toContain('templates/roles/sdd-auditor.md');
  });
});
