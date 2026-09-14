/**
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/json.ts (NEW)" (G2), Behavior
 * Guarantee 12 (determinism, containment, exactly one trailing "\n"; JSON artifacts
 * emitted only through renderJson); tasks.md Task 1.2.
 *
 * `src/generators/json.ts` does not exist yet at red time -- every test below is
 * expected to fail on module resolution (`Cannot find module
 * '../../src/generators/json.js'`), not on a typo in this file.
 */
import { describe, expect, it } from 'vitest';

describe('renderJson determinism (BG-12)', () => {
  it('produces byte-identical output for the same input across repeated calls', async () => {
    const { renderJson } = await import('../../src/generators/json.js');

    const value = {
      version: 1,
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'node run-feedback.mjs run' }] }],
      },
    };

    const first = renderJson(value);
    const second = renderJson(structuredClone(value));

    expect(second).toBe(first);
  });

  it('preserves the insertion order of object keys rather than sorting them', async () => {
    const { renderJson } = await import('../../src/generators/json.js');

    const rendered = renderJson({ zebra: 1, apple: 2, mango: 3 });
    const keyOrder = [...rendered.matchAll(/"(zebra|apple|mango)":/g)].map((match) => match[1]);

    expect(keyOrder).toEqual(['zebra', 'apple', 'mango']);
  });
});

describe('renderJson formatting (BG-12)', () => {
  it('indents nested structures with exactly two spaces per level', async () => {
    const { renderJson } = await import('../../src/generators/json.js');

    const rendered = renderJson({ outer: { inner: 'value' } });
    const lines = rendered.split('\n');

    expect(lines).toContain('  "outer": {');
    expect(lines).toContain('    "inner": "value"');
  });

  it('ends in exactly one trailing "\\n", with none inside the JSON body itself', async () => {
    const { renderJson } = await import('../../src/generators/json.js');

    const rendered = renderJson({ a: 1, b: [1, 2, 3] });

    expect(rendered.endsWith('\n')).toBe(true);
    expect(rendered.endsWith('\n\n')).toBe(false);
    // The JSON payload itself (everything but the final newline) contains no
    // other trailing blank line.
    expect(rendered.slice(0, -1).endsWith('\n')).toBe(false);
  });

  it('renders a value that round-trips through JSON.parse to a deep-equal structure', async () => {
    const { renderJson } = await import('../../src/generators/json.js');

    const value = { a: 1, nested: { b: [true, false, null], c: 'text' } };
    const rendered = renderJson(value);

    expect(JSON.parse(rendered)).toEqual(value);
  });
});
