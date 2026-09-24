/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/markdown-yaml.ts" (G5);
 * Behavior Guarantees 3, 9; the contract's illustrated `renderFrontmatter`
 * shape; C10; T17, T18.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "Public API — src/generators/markdown-yaml.ts (additive)"
 * (G5, G9), the normative `renderSpecSchemaPointerBlock` output shape;
 * Behavior Guarantees 3, 8; tasks.md Task 1.1, 1.2; T1, T2.
 *
 * ---
 * Spec: specs/monorepo-mode
 * Covers: contract.md § Interfaces "Rendering" (`renderProjectConfigBlock`
 * gains component lines, MC-16); § Data Models `ProjectConfigSummary.components`
 * (ALWAYS present, ALWAYS non-empty); audit.md Test Coverage T26.
 *
 * The two pre-existing `renderProjectConfigBlock` tests below are widened to
 * pass a `components` field matching their `stack` — the one implicit `.`
 * component every `ProjectConfigSummary` now carries — so they keep exercising
 * the real, always-populated shape once `renderProjectConfigBlock` starts
 * reading `project.components` unconditionally (consequential test
 * maintenance, not new red-phase coverage: their own assertions are
 * unchanged). The new describe block below is the actual new coverage:
 * `renderProjectConfigBlock` does not read `project.components` at all yet at
 * red time, so every assertion expecting a `- Component: …` line, or expecting
 * the `Project stack:` line to be ABSENT for a multi-component project, is
 * expected to fail — today's implementation still renders `Project stack:`
 * whenever `project.stack` is set and never emits a component line, whatever
 * `project.components` holds.
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
      components: [{ path: '.', stack: 'node-typescript' }],
    } as any);

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
      components: [{ path: '.' }],
    } as any);
    const reduced = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs'],
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: true,
      components: [{ path: '.' }],
    } as any);

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

describe('yamlFlowSequence (guarantee 3) (T1) (Task 1.1)', () => {
  it('renders a YAML flow sequence of double-quoted, comma-space-joined scalars', async () => {
    const { yamlFlowSequence } = await import('../../src/generators/markdown-yaml.js');
    expect(yamlFlowSequence(['read', 'write', 'shell'])).toBe('["read", "write", "shell"]');
  });

  it('yields "[]" for an empty input, never an empty string or "null"', async () => {
    const { yamlFlowSequence } = await import('../../src/generators/markdown-yaml.js');
    expect(yamlFlowSequence([])).toBe('[]');
  });

  it('quotes each element through the same escaping rules as yamlQuote, not a naive wrap', async () => {
    const { yamlFlowSequence } = await import('../../src/generators/markdown-yaml.js');
    // Proves this reuses yamlQuote's escaping rather than a bespoke `"${v}"` — a
    // value containing a double quote or backslash must come out escaped, exactly
    // as it would through yamlQuote, or a tool's YAML parser would choke on it.
    expect(yamlFlowSequence(['a"b', 'c\\d'])).toBe('["a\\"b", "c\\\\d"]');
  });

  it('is usable as a raw FrontmatterField value, embedding literally with no re-quoting', async () => {
    const { renderFrontmatter, yamlFlowSequence } = await import('../../src/generators/markdown-yaml.js');
    const output = renderFrontmatter([
      { key: 'tools', value: yamlFlowSequence(['read', 'write']), raw: true },
    ]);
    expect(output).toBe('---\ntools: ["read", "write"]\n---\n');
  });
});

describe('renderSpecSchemaPointerBlock (guarantee 8) (T2) (Task 1.2)', () => {
  it('is fully delimited by the existing generated-block markers, so guarantee 3 (config quarantine) still holds', async () => {
    const { renderSpecSchemaPointerBlock, GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import(
      '../../src/generators/markdown-yaml.js'
    );

    const block = renderSpecSchemaPointerBlock('.sdd/spec-schema');

    expect(block.startsWith(GENERATED_BLOCK_BEGIN)).toBe(true);
    expect(block.trimEnd().endsWith(GENERATED_BLOCK_END)).toBe(true);
  });

  it('names the directory passed in, not a value hardcoded in the module', async () => {
    const { renderSpecSchemaPointerBlock } = await import('../../src/generators/markdown-yaml.js');

    const defaultBlock = renderSpecSchemaPointerBlock('.sdd/spec-schema');
    const customBlock = renderSpecSchemaPointerBlock('some/other/dir');

    expect(defaultBlock).toContain('.sdd/spec-schema');
    expect(customBlock).toContain('some/other/dir');
    expect(customBlock).not.toContain('.sdd/spec-schema');
  });

  it('points the reader at the deployed directory and disclaims the package-internal canonical path, per the normative shape', async () => {
    const { renderSpecSchemaPointerBlock } = await import('../../src/generators/markdown-yaml.js');

    const block = renderSpecSchemaPointerBlock('.sdd/spec-schema');

    expect(block).toContain('Spec schema directory: `.sdd/spec-schema`');
    expect(block).toContain('templates/spec-schema/');
    expect(block.endsWith('\n')).toBe(true);
  });
});

describe('renderProjectConfigBlock — per-component lines for a monorepo install (MC-16, T26)', () => {
  it('a single-repo project (one implicit "." component, stack set) is byte-identical to today: no "- Component:" line at all', async () => {
    const { renderProjectConfigBlock } = await import('../../src/generators/markdown-yaml.js');

    const withComponents = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: 'typescript',
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
      components: [{ path: '.', stack: 'typescript' }],
    } as any);
    const withoutComponentsField = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: 'typescript',
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
    } as any);

    expect(withComponents).not.toContain('- Component:');
    expect(withComponents).toContain('- Project stack: typescript');
    expect(withComponents).toBe(withoutComponentsField);
  });

  it('a monorepo project omits the "Project stack:" line and emits one "- Component:" line per component, in order', async () => {
    const { renderProjectConfigBlock } = await import('../../src/generators/markdown-yaml.js');

    const block = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: undefined,
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
      components: [
        { path: '.', stack: 'python' },
        { path: 'apps/web', stack: 'typescript' },
      ],
    } as any);

    expect(block).not.toContain('Project stack:');
    const componentLineIndexes = block
      .split('\n')
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.startsWith('- Component:'));
    expect(componentLineIndexes).toHaveLength(2);
    expect(componentLineIndexes[0].line).toBe('- Component: . — python');
    expect(componentLineIndexes[1].line).toBe('- Component: apps/web — typescript');
    // In canonical component order (ascending path), never declaration order.
    expect(componentLineIndexes[0].index).toBeLessThan(componentLineIndexes[1].index);
  });

  it('a component whose stack resolved to no built-in profile is marked "(no built-in profile)" — the per-component escape hatch (FC-2)', async () => {
    const { renderProjectConfigBlock } = await import('../../src/generators/markdown-yaml.js');

    const block = renderProjectConfigBlock({
      enabledRoles: ['sdd-architect'],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: undefined,
      specSchemaDir: '.sdd/spec-schema',
      reducedGates: false,
      components: [{ path: 'apps/legacy', stack: 'cobol', profile: undefined }],
    } as any);

    expect(block).toContain('- Component: apps/legacy — cobol (no built-in profile)');
  });
});
