/**
 * Spec: specs/sdd-skill-library
 * Covers: contract.md § Dependencies "Test-tier interface" (`readFrontmatterKeys`);
 * roadmap.md Phase 1 step 2; tasks.md Task 1.2.
 *
 * Not part of `src/` and never a package dependency — `contract.md` § Dependencies
 * states no YAML package is added; the guard test parses frontmatter with this
 * minimal local reader instead. Test-only plumbing, exempt from the "no canonical
 * prose in src/" constraint the same way `tests/helpers/toml-decode.ts` is, and
 * built to the exact same philosophy: it understands exactly the shapes the
 * `harny-*` shape contract (`.agents/skills/README.md`, per contract.md § "The
 * harny-* skill shape contract") produces, and throws rather than silently
 * misparsing anything else.
 *
 * Recognized shapes, each a top-level ` key: ` line (column 0, no leading
 * whitespace) followed optionally by an indented continuation block:
 *   - a plain scalar on the same line: `name: harny-propose`
 *   - a single- or double-quoted scalar: `version: "1.0"`, `license: 'MIT'`
 *     (double-quoted supports `\\`, `\"`, `\n`, `\t`, `\uXXXX` escapes)
 *   - a folded block scalar: `description: >` / `>-` / `>+`, indented lines below
 *   - a literal block scalar: `description: |` / `|-` / `|+`, indented lines below
 *   - an empty inline value followed by an indented nested block (a map or a
 *     list, e.g. `metadata:`) — stored as opaque raw text, never parsed further,
 *     because no rule in the shape contract inspects *nested* keys.
 *
 * Deliberately NOT a general YAML parser: no anchors, tags, flow collections,
 * multi-document streams, or trailing same-line comments. Folding of a folded
 * block scalar is simplified — blank lines start a new paragraph (joined with a
 * single `\n`), non-blank lines within a paragraph are joined with a single
 * space — which matches plain prose with no embedded blank lines, the only shape
 * the shape contract's own example uses. Anything else recognizable-but-unhandled
 * throws rather than guessing.
 */

const TOP_LEVEL_KEY_RE = /^([A-Za-z0-9_-]+):(.*)$/;

function stripCr(line: string): string {
  return line.endsWith('\r') ? line.slice(0, -1) : line;
}

function decodeDoubleQuoted(literal: string): string {
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
          throw new Error(`frontmatter: malformed \\u escape in ${JSON.stringify(literal)}`);
        }
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        break;
      }
      default:
        throw new Error(`frontmatter: unsupported escape "\\${next}" in ${JSON.stringify(literal)}`);
    }
  }
  return out;
}

function unquotePlainScalar(trimmed: string): string {
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return decodeDoubleQuoted(trimmed);
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function leadingSpaces(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

/** Dedents a continuation block by its own minimum indentation, throwing if a
 *  non-blank line is indented less than the block's first non-blank line. */
function dedentBlock(blockLines: string[]): string[] {
  const firstNonBlank = blockLines.find((l) => l.trim() !== '');
  if (firstNonBlank === undefined) return [];
  const baseIndent = leadingSpaces(firstNonBlank);
  return blockLines.map((line) => {
    if (line.trim() === '') return '';
    if (leadingSpaces(line) < baseIndent) {
      throw new Error(
        `frontmatter: continuation line under-indented relative to block: ${JSON.stringify(line)}`,
      );
    }
    return line.slice(baseIndent);
  });
}

function applyChomping(text: string, chomp: string): string {
  if (chomp === '-') return text.replace(/\n+$/, '');
  if (chomp === '+') return text;
  // Clip (default): exactly one trailing newline if there is any trailing
  // whitespace/newline at all, none otherwise.
  const stripped = text.replace(/\n+$/, '');
  return text === stripped ? text : `${stripped}\n`;
}

function parseBlockScalar(indicator: string, chomp: string, blockLines: string[]): string {
  const dedented = dedentBlock(blockLines);
  if (indicator === '|') {
    return applyChomping(dedented.join('\n'), chomp);
  }
  // Folded ('>'): join lines within a blank-line-delimited paragraph with a
  // single space; join paragraphs with a single newline.
  const paragraphs: string[][] = [[]];
  for (const line of dedented) {
    if (line === '') {
      paragraphs.push([]);
    } else {
      paragraphs[paragraphs.length - 1].push(line);
    }
  }
  const folded = paragraphs
    .filter((p) => p.length > 0)
    .map((p) => p.join(' '))
    .join('\n');
  return applyChomping(`${folded}\n`, chomp);
}

/**
 * Minimal top-level YAML-frontmatter-key reader — no YAML dependency, mirrors
 * `tests/helpers/toml-decode.ts`. Returns the raw (decoded/dedented, but never
 * semantically interpreted beyond that) text of each top-level frontmatter key,
 * keyed by key name, in source order.
 *
 * Throws if `source` does not open with a `---` frontmatter block, if the block
 * is unterminated, or if a line inside it is neither a recognized top-level key
 * line, a blank line, nor part of a preceding key's continuation block.
 */
export function readFrontmatterKeys(source: string): Map<string, string> {
  const rawLines = source.split('\n').map(stripCr);
  if (rawLines[0]?.trim() !== '---') {
    throw new Error('frontmatter: source does not open with a `---` frontmatter block');
  }

  let closingIndex = -1;
  for (let i = 1; i < rawLines.length; i++) {
    if (rawLines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) {
    throw new Error('frontmatter: unterminated `---` frontmatter block');
  }

  const bodyLines = rawLines.slice(1, closingIndex);
  const result = new Map<string, string>();

  let i = 0;
  while (i < bodyLines.length) {
    const line = bodyLines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const match = TOP_LEVEL_KEY_RE.exec(line);
    if (!match) {
      throw new Error(`frontmatter: unrecognized top-level line: ${JSON.stringify(line)}`);
    }
    const [, key, rest] = match;

    // Gather this key's continuation block: every line up to (not including)
    // the next top-level key line.
    let j = i + 1;
    while (j < bodyLines.length && !TOP_LEVEL_KEY_RE.test(bodyLines[j])) {
      j++;
    }
    const continuationBlock = bodyLines.slice(i + 1, j);
    const trimmedRest = rest.trim();

    if (trimmedRest === '>' || trimmedRest === '>-' || trimmedRest === '>+') {
      result.set(key, parseBlockScalar('>', trimmedRest.slice(1), continuationBlock));
    } else if (trimmedRest === '|' || trimmedRest === '|-' || trimmedRest === '|+') {
      result.set(key, parseBlockScalar('|', trimmedRest.slice(1), continuationBlock));
    } else if (trimmedRest === '') {
      // Empty inline value: either a nested map/list block, or a genuinely
      // empty scalar. Store the dedented block verbatim, opaque — nothing in
      // this feature's contract inspects keys nested under a top-level key.
      result.set(key, dedentBlock(continuationBlock).join('\n'));
    } else {
      result.set(key, unquotePlainScalar(trimmedRest));
    }

    i = j;
  }

  return result;
}
