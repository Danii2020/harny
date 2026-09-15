/**
 * Shared TOML wrapper helpers for the Codex target (`src/generators/codex.ts`).
 * Sibling of `markdown-yaml.ts`; owns every TOML syntax literal in the
 * codebase. Deliberately not a general-purpose TOML serializer -- it emits
 * only the shapes `contract.md` needs: top-level string keys, single-line
 * basic strings, multi-line literal strings, and `#` comments.
 */
import { HarnessError } from '../errors.js';

/**
 * TOML basic string (single-line): double-quoted, with `\` and `"` escaped and
 * newline/tab/other control characters emitted as TOML escape sequences (`\n`,
 * `\t`, `\uXXXX`). Total analogue of `yamlQuote` in `markdown-yaml.ts`.
 */
export function tomlBasicString(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (ch === '\\') {
      out += '\\\\';
    } else if (ch === '"') {
      out += '\\"';
    } else if (ch === '\n') {
      out += '\\n';
    } else if (ch === '\t') {
      out += '\\t';
    } else if (code < 0x20 || code === 0x7f) {
      out += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      out += ch;
    }
  }
  return '"' + out + '"';
}

export interface TomlKeyValue {
  readonly key: string;
  /** Already a complete TOML value literal (quoted string, `true`, ...). */
  readonly value: string;
}

/** Renders `key = value` lines, one per field, in the given order. */
export function renderTomlKeyValues(fields: readonly TomlKeyValue[]): string {
  let out = '';
  for (const field of fields) {
    out += field.key + ' = ' + field.value + '\n';
  }
  return out;
}

/** Renders one `# <text>` line per entry. Any interior newline in `text` starts a
 *  further `# ` line, so a multi-line note can never break out of comment syntax. */
export function renderTomlComments(comments: readonly string[]): string {
  let out = '';
  for (const comment of comments) {
    for (const line of comment.split('\n')) {
      out += '# ' + line + '\n';
    }
  }
  return out;
}

// A dotted sequence of bare TOML keys: each segment is `[A-Za-z0-9_-]+`, joined by
// `.`. Anything outside this shape (a space, a quote, an empty segment) would need
// TOML's quoted-key form, which this codebase deliberately never emits (`SC14`).
const BARE_DOTTED_HEADER = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/;

/**
 * **(NEW — context7-mcp.)** Renders a TOML table: a `[header]` line followed by
 * one `key = value` line per field, via the existing `renderTomlKeyValues`. The
 * only place a `[` table-header literal exists in this codebase (`TG-5`,
 * invariant 1, `SC14`) — `src/mcp.ts` composes tables, it never writes brackets.
 *
 * `header` must be a dotted sequence of TOML bare keys; anything else throws
 * `HarnessError('TEMPLATE')` naming the header, rather than silently emitting a
 * header that would need quoting. This mirrors `tomlMultilineLiteral`'s existing
 * "throw rather than silently switch forms" discipline (`TG-7`).
 */
export function renderTomlTable(header: string, fields: readonly TomlKeyValue[]): string {
  if (!BARE_DOTTED_HEADER.test(header)) {
    throw new HarnessError(
      'TEMPLATE',
      'Cannot render "' +
        header +
        '" as a TOML table header: it is not a dotted sequence of bare TOML keys ' +
        '(letters, digits, "-", "_", joined by "."), so it would need quoting, which this codebase ' +
        'deliberately never emits.',
    );
  }
  return '[' + header + ']\n' + renderTomlKeyValues(fields);
}

// Control characters other than \n (0x0A) and \t (0x09), plus DEL (0x7F).
const CONTROL_CHAR_CODES_ALLOWED = new Set([0x09, 0x0a]);

function hasDisallowedControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (CONTROL_CHAR_CODES_ALLOWED.has(code)) continue;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * True when `value` can be carried verbatim in a TOML multi-line **literal**
 * string. False when it contains `'''`, a carriage return, or any control
 * character other than `\n` and `\t`.
 */
export function canRenderAsTomlLiteral(value: string): boolean {
  if (value.includes("'''")) return false;
  if (value.includes('\r')) return false;
  if (hasDisallowedControlChar(value)) return false;
  return true;
}

/**
 * TOML multi-line literal string: `'''\n<value>\n'''`. Performs **no escaping** --
 * `value` appears in the file byte-for-byte, which is what lets
 * `tests/canonical-fidelity.test.ts` keep using a raw-substring oracle for the
 * fifth generator (guarantee 4) without decoding TOML.
 *
 * `artifact` is used only in the error message. Throws
 * `HarnessError('TEMPLATE')` when `canRenderAsTomlLiteral(value)` is false,
 * rather than silently switching to an escaping form.
 */
export function tomlMultilineLiteral(value: string, artifact: string): string {
  if (!canRenderAsTomlLiteral(value)) {
    throw new HarnessError(
      'TEMPLATE',
      'Cannot render "' +
        artifact +
        "\" as a TOML multi-line literal string: the content contains three consecutive " +
        "single quotes, a carriage return, or a control character other than \\n/\\t.",
    );
  }
  return "'''\n" + value + "\n'''";
}
