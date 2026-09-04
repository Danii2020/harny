/**
 * Spec: specs/codex-generator
 * Covers: tasks.md Task 1.1 — the test-local minimal TOML decoder used by
 * `tests/generators/toml.test.ts` (guarantee 3's `tomlMultilineLiteral`
 * round-trip) and `tests/generators/codex.test.ts` (guarantee 3's decoded-value
 * correctness, Task 2.7).
 *
 * Not part of `src/` and never a package dependency — `intent.md`'s Non-Goals
 * forbid adding a TOML package to `devDependencies`. This is test-only plumbing,
 * exempt from the "no canonical prose in src/" constraint the same way
 * `tests/helpers/paths.ts` is.
 *
 * Deliberately NOT a general TOML parser. It understands exactly the three
 * shapes `src/generators/toml.ts` emits:
 *   - top-level `#` comment lines and blank lines (skipped)
 *   - `key = "…"` single-line basic strings, with `\\`, `\"`, `\n`, `\t` and
 *     `\uXXXX` escapes
 *   - `key = '''` … `'''` multi-line literal strings, decoded per the exact
 *     rule contract.md states: the newline immediately following the opening
 *     delimiter is trimmed; nothing else is unescaped.
 * Anything outside those three shapes is a decoder bug in the *test*, not a
 * silent misparse, so it throws rather than guessing.
 */

function decodeBasicString(literal: string): string {
  if (!literal.startsWith('"') || !literal.endsWith('"') || literal.length < 2) {
    throw new Error(`toml-decode: malformed basic string literal: ${JSON.stringify(literal)}`);
  }
  const inner = literal.slice(1, -1);
  let out = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = inner[i + 1];
    switch (next) {
      case '\\':
        out += '\\';
        i++;
        break;
      case '"':
        out += '"';
        i++;
        break;
      case 'n':
        out += '\n';
        i++;
        break;
      case 't':
        out += '\t';
        i++;
        break;
      case 'u': {
        const hex = inner.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new Error(`toml-decode: malformed \\u escape in ${JSON.stringify(literal)}`);
        }
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        break;
      }
      default:
        throw new Error(`toml-decode: unsupported escape "\\${next}" in ${JSON.stringify(literal)}`);
    }
  }
  return out;
}

const KEY_VALUE_LINE_RE = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/;

/**
 * Decodes the subset of TOML `src/generators/toml.ts` emits into a flat
 * `{ key: string }` map. Throws on anything it does not recognize rather than
 * silently dropping or misreading it.
 */
export function decodeToml(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  let i = 0;
  const n = source.length;

  while (i < n) {
    const lineEnd = source.indexOf('\n', i);
    const rawLine = lineEnd === -1 ? source.slice(i) : source.slice(i, lineEnd);
    const trimmed = rawLine.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      i = lineEnd === -1 ? n : lineEnd + 1;
      continue;
    }

    const match = KEY_VALUE_LINE_RE.exec(rawLine);
    if (!match) {
      throw new Error(`toml-decode: unrecognized line: ${JSON.stringify(rawLine)}`);
    }
    const [, key, rest] = match;

    if (rest === "'''") {
      // `regionStart` is the index of the '\n' immediately after the opening
      // delimiter line — the raw region (before trimming) is
      // "\n" + <value> + "\n" per contract.md's stated decoding semantics.
      const regionStart = lineEnd;
      if (regionStart === -1) {
        throw new Error(`toml-decode: unterminated multi-line literal string for key "${key}"`);
      }
      const closeIndex = source.indexOf("'''", regionStart + 1);
      if (closeIndex === -1) {
        throw new Error(`toml-decode: unterminated multi-line literal string for key "${key}"`);
      }
      const rawRegion = source.slice(regionStart, closeIndex);
      // TOML trims exactly one newline immediately following the opening delimiter.
      const value = rawRegion.startsWith('\n') ? rawRegion.slice(1) : rawRegion;
      result[key] = value;

      const afterClose = closeIndex + 3;
      const nextLineEnd = source.indexOf('\n', afterClose);
      i = nextLineEnd === -1 ? n : nextLineEnd + 1;
    } else if (rest.startsWith('"')) {
      result[key] = decodeBasicString(rest);
      i = lineEnd === -1 ? n : lineEnd + 1;
    } else {
      throw new Error(`toml-decode: unsupported value for key "${key}": ${JSON.stringify(rest)}`);
    }
  }

  return result;
}
