/**
 * Spec: specs/codex-generator
 * Covers: contract.md "Public API — src/generators/toml.ts (NEW) (G2)" and its
 * normative rationale for literal (`'''`) over basic (`"""`) multi-line strings;
 * Behavior Guarantees 5, 11; Error Handling Contract's new
 * "value routed into a TOML multi-line literal is unrepresentable" row;
 * roadmap.md Phase 1.1–1.3; tasks.md Task 1.2, 1.3, 1.4, 1.5; T1–T4.
 *
 * `src/generators/toml.ts` does not exist yet at red time — every test below is
 * expected to fail on module resolution or on a missing export, not on a typo
 * in this file.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { decodeToml } from '../helpers/toml-decode.js';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';

async function listFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

describe('tomlBasicString (T1)', () => {
  it('quotes an ordinary string with double quotes', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    expect(tomlBasicString('hello')).toBe('"hello"');
  });

  it('escapes a backslash and a double quote, and round-trips through the decoder', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    const value = 'a\\b"c';
    const literal = tomlBasicString(value);

    expect(literal).toContain('\\\\');
    expect(literal).toContain('\\"');
    expect(decodeToml(`key = ${literal}`).key).toBe(value);
  });

  it('escapes a newline as \\n and round-trips through the decoder', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    const value = 'line1\nline2';
    const literal = tomlBasicString(value);

    expect(literal).not.toMatch(/\n/); // the literal itself is a single line
    expect(literal).toContain('\\n');
    expect(decodeToml(`key = ${literal}`).key).toBe(value);
  });

  it('escapes a tab as \\t and round-trips through the decoder', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    const value = 'a\tb';
    const literal = tomlBasicString(value);

    expect(literal).toContain('\\t');
    expect(decodeToml(`key = ${literal}`).key).toBe(value);
  });

  it('escapes an other control character as \\uXXXX and round-trips through the decoder', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    const value = 'bell\x07here';
    const literal = tomlBasicString(value);

    expect(literal).toMatch(/\\u[0-9a-fA-F]{4}/);
    expect(decodeToml(`key = ${literal}`).key).toBe(value);
  });

  it('round-trips a realistic role description containing backticks and parentheses', async () => {
    const { tomlBasicString } = await import('../../src/generators/toml.js');

    const value = 'Validate that an implementation matches its specifications (contract.md).';
    const literal = tomlBasicString(value);

    expect(decodeToml(`key = ${literal}`).key).toBe(value);
  });
});

describe('canRenderAsTomlLiteral (T2)', () => {
  it('is true for ordinary Markdown prose including backticks, quotes and backslashes', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    const prose =
      'Read the `## Role body` heading, quote "like this", and note the \\ character.\nSecond line.\tTabbed.';
    expect(canRenderAsTomlLiteral(prose)).toBe(true);
  });

  it('is true for a plain single-line string', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    expect(canRenderAsTomlLiteral('plain text')).toBe(true);
  });

  it('is false for a value containing three consecutive single quotes', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    expect(canRenderAsTomlLiteral("this has '''  in it")).toBe(false);
  });

  it('is false for a value containing a carriage return', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    expect(canRenderAsTomlLiteral('line1\r\nline2')).toBe(false);
  });

  it('is false for a value containing a control character other than \\n or \\t', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    expect(canRenderAsTomlLiteral('bell\x07here')).toBe(false);
  });
});

describe('tomlMultilineLiteral (T3)', () => {
  it('emits \'\'\'\\n<value>\\n\'\'\' with no escaping, and the value is a byte-for-byte substring', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');

    const value = 'Line one with a `backtick` and a "quote".\nLine two.';
    const rendered = tomlMultilineLiteral(value, 'sdd-architect');

    expect(rendered).toBe(`'''\n${value}\n'''`);
    expect(rendered.includes(value)).toBe(true);
  });

  it('decodes to value + "\\n" for a value that does not end in a newline', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');

    const value = 'hello\nworld';
    const rendered = tomlMultilineLiteral(value, 'sdd-architect');

    const decoded = decodeToml(`developer_instructions = ${rendered}`);
    expect(decoded.developer_instructions).toBe(`${value}\n`);
  });

  it('throws HarnessError(TEMPLATE) naming the artifact when the value contains \'\'\'', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');
    const { isHarnessError } = await import('../../src/errors.js');

    let caught: unknown;
    try {
      tomlMultilineLiteral("contains '''  triple quotes", 'sdd-auditor');
    } catch (err) {
      caught = err;
    }

    expect(isHarnessError(caught)).toBe(true);
    expect((caught as any).code).toBe('TEMPLATE');
    expect((caught as any).message).toContain('sdd-auditor');
  });

  it('throws HarnessError(TEMPLATE) naming the artifact when the value contains a carriage return', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');
    const { isHarnessError } = await import('../../src/errors.js');

    let caught: unknown;
    try {
      tomlMultilineLiteral('line1\r\nline2', 'sdd-executor');
    } catch (err) {
      caught = err;
    }

    expect(isHarnessError(caught)).toBe(true);
    expect((caught as any).code).toBe('TEMPLATE');
    expect((caught as any).message).toContain('sdd-executor');
  });

  it('throws HarnessError(TEMPLATE) naming the artifact when the value contains a disallowed control character', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');
    const { isHarnessError } = await import('../../src/errors.js');

    let caught: unknown;
    try {
      tomlMultilineLiteral('bell\x07here', 'sdd-test-writer');
    } catch (err) {
      caught = err;
    }

    expect(isHarnessError(caught)).toBe(true);
    expect((caught as any).code).toBe('TEMPLATE');
    expect((caught as any).message).toContain('sdd-test-writer');
  });

  it('does not throw for a value containing \\n and \\t, and the rendered form still decodes to the original content', async () => {
    const { tomlMultilineLiteral } = await import('../../src/generators/toml.js');

    const value = 'a line\twith a tab\nand a second line';
    let rendered = '';
    expect(() => {
      rendered = tomlMultilineLiteral(value, 'sdd-documentation');
    }).not.toThrow();

    const decoded = decodeToml(`developer_instructions = ${rendered}`);
    expect(decoded.developer_instructions).toBe(`${value}\n`);
  });
});

describe('renderTomlKeyValues (T4)', () => {
  it('renders one "key = value" line per field, preserving input order', async () => {
    const { renderTomlKeyValues } = await import('../../src/generators/toml.js');

    const rendered = renderTomlKeyValues([
      { key: 'name', value: '"sdd-architect"' },
      { key: 'description', value: '"Design specs."' },
      { key: 'model', value: '"gpt-5.6-sol"' },
    ]);

    const lines = rendered.split('\n').filter((line) => line.length > 0);
    expect(lines).toEqual(['name = "sdd-architect"', 'description = "Design specs."', 'model = "gpt-5.6-sol"']);
  });

  it('renders nothing for an empty field list', async () => {
    const { renderTomlKeyValues } = await import('../../src/generators/toml.js');

    const rendered = renderTomlKeyValues([]);
    expect(rendered.trim()).toBe('');
  });
});

describe('renderTomlComments (T4)', () => {
  it('renders one "# " line per entry, preserving order', async () => {
    const { renderTomlComments } = await import('../../src/generators/toml.js');

    const rendered = renderTomlComments(['first note', 'second note']);
    const lines = rendered.split('\n').filter((line) => line.length > 0);

    expect(lines).toEqual(['# first note', '# second note']);
  });

  it('starts a further "# " line for an interior newline, so a multi-line note cannot break out of comment syntax', async () => {
    const { renderTomlComments } = await import('../../src/generators/toml.js');

    const rendered = renderTomlComments(['first line\nsecond line']);
    const lines = rendered.split('\n').filter((line) => line.length > 0);

    // Both physical lines must be individually comment-prefixed -- a naive
    // implementation that only prefixes the first line would let the second
    // line escape comment syntax and become live TOML.
    expect(lines).toEqual(['# first line', '# second line']);
    for (const line of lines) {
      expect(line.startsWith('# ')).toBe(true);
    }
  });

  it('renders nothing for an empty comment list', async () => {
    const { renderTomlComments } = await import('../../src/generators/toml.js');

    expect(renderTomlComments([]).trim()).toBe('');
  });
});

describe('the real canonical layer under templates/ is TOML-literal-safe (roadmap Phase 1.7, Task 1.8)', () => {
  it('contains no \'\'\', no """, no \\r and no exotic control characters in any file under templates/', async () => {
    const { canRenderAsTomlLiteral } = await import('../../src/generators/toml.js');

    const files = await listFilesRecursively(REAL_TEMPLATES_ROOT);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const contents = await fs.readFile(file, 'utf8');
      expect(contents.includes("'''"), `${file} contains '''`).toBe(false);
      expect(contents.includes('"""'), `${file} contains """`).toBe(false);
      expect(contents.includes('\r'), `${file} contains a carriage return`).toBe(false);
      expect(canRenderAsTomlLiteral(contents), `${file} is not literal-safe`).toBe(true);
    }
  });
});
