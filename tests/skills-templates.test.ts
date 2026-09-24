/**
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantees 4, 5, 6, 7, 8, 25, 30; intent.md
 * SC2, SC3, SC4, SC17; roadmap.md Phase 4.4, 4.9; tasks.md Tasks 4.5, 4.6,
 * 4.7, 4.8, 4.30, 4.31.
 *
 * Asserts the shape of the canonical, target-repo-neutral `templates/skills/`
 * tree this feature introduces — frontmatter key set, folder-name/`name:`
 * agreement, `description`/`compatibility` length caps, the five required
 * body sections in order — plus a neutrality sweep for the specific
 * harny-only residue `roadmap.md` Phase 1 (Tasks 1.3, 1.4, 1.6, 1.7) names as
 * the exact regression this feature exists to prevent, and a repo-wide sweep
 * for the archive-lifecycle contradiction S5/Gu 25 closes.
 *
 * Red-phase note: as of this commit, `templates/skills/` does not exist at
 * all, so every discovery glob below returns an empty set. Each discovery is
 * asserted non-empty as its own precondition before any shape assertion
 * runs — exactly `tests/skill-library.test.ts`'s pattern — so an empty tree
 * shows up as a failing precondition, never a vacuous pass.
 *
 * Spec: specs/test-tiers
 * Covers: contract.md TT-3; intent.md SC3; audit.md Test Coverage T7;
 * tasks.md Task R.7. Adds a `NEUTRALITY_CHECKS` entry for
 * `harny-test/high-value-tests.md`, the dogfood domain-specific residue list
 * TT-3 pins. At red time the file does not exist yet, so this entry fails on
 * the `fs.existsSync` precondition, not a wrong assumption about its content.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';
import { readFrontmatterKeys } from './helpers/frontmatter.js';

const TEMPLATES_SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'skills');
const TEMPLATES_ROOT = path.join(REPO_ROOT, 'templates');

const PORTABLE_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

const DESCRIPTION_MAX_LENGTH = 1024; // tighter than skill-library.test.ts's 1536 (S6)
const COMPATIBILITY_MAX_LENGTH = 500;

const REQUIRED_BODY_HEADINGS = [
  '## When to use this',
  '## Inputs',
  '## Steps',
  '## Guardrails',
] as const;

/** Every top-level `harny-*` directory name under `templates/skills/`,
 *  discovered by glob — never a hardcoded list of the eight skill names. */
function discoverTemplateSkillNames(): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(TEMPLATES_SKILLS_ROOT, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith('harny-'))
    .map((e) => e.name)
    .sort();
}

function discoverSkillMdPaths(): string[] {
  return discoverTemplateSkillNames()
    .map((name) => path.join(TEMPLATES_SKILLS_ROOT, name, 'SKILL.md'))
    .filter((p) => fs.existsSync(p));
}

/** Splits a SKILL.md source into its frontmatter block and the remaining body,
 *  without parsing the YAML — a bare string split on the `---` delimiters. */
function splitFrontmatterAndBody(source: string): { frontmatter: string; body: string } {
  const lines = source.split('\n');
  if (lines[0]?.trim() !== '---') {
    throw new Error('fixture/content bug: SKILL.md does not open with a `---` frontmatter block');
  }
  const closingIndex = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (closingIndex === -1) {
    throw new Error('fixture/content bug: SKILL.md has an unterminated frontmatter block');
  }
  return {
    frontmatter: lines.slice(0, closingIndex + 1).join('\n'),
    body: lines.slice(closingIndex + 1).join('\n'),
  };
}

describe('templates/skills/ discovery precondition', () => {
  it('finds at least one harny-*/SKILL.md under templates/skills/', () => {
    const files = discoverSkillMdPaths();
    expect(
      files.length,
      'no templates/skills/harny-*/SKILL.md exists yet — expected once Phase 1 lands',
    ).toBeGreaterThan(0);
  });

  it('finds templates/skills/README.md, the shape contract', () => {
    expect(
      fs.existsSync(path.join(TEMPLATES_SKILLS_ROOT, 'README.md')),
      'templates/skills/README.md does not exist yet — expected once Phase 1 lands',
    ).toBe(true);
  });
});

describe('portable frontmatter shape (Gu 4)', () => {
  it('every templates/skills/harny-*/SKILL.md declares only the six portable keys, including both required ones', () => {
    const files = discoverSkillMdPaths();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);

      for (const key of keys.keys()) {
        expect(
          PORTABLE_FRONTMATTER_KEYS.has(key),
          `${file} frontmatter declares "${key}", outside the six portable Agent Skills fields`,
        ).toBe(true);
      }
      expect(keys.has('name'), `${file} frontmatter is missing required key "name"`).toBe(true);
      expect(keys.has('description'), `${file} frontmatter is missing required key "description"`).toBe(true);
    }
  });
});

describe('folder name equals name:, and both are spec-legal (Gu 5)', () => {
  it('every folder name is 1-64 lowercase/digit/hyphen chars, no leading/trailing/double hyphen, and equals name:', () => {
    const names = discoverTemplateSkillNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const file = path.join(TEMPLATES_SKILLS_ROOT, name, 'SKILL.md');
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);
      const declaredName = keys.get('name');

      expect(declaredName, `${file} frontmatter is missing "name"`).toBeDefined();
      expect(declaredName).toBe(name);

      expect(name.length, `folder "${name}" exceeds 64 characters`).toBeLessThanOrEqual(64);
      expect(name.length, `folder "${name}" is empty`).toBeGreaterThan(0);
      expect(/^[a-z0-9-]+$/.test(name), `folder "${name}" has characters outside [a-z0-9-]`).toBe(true);
      expect(name.startsWith('-'), `folder "${name}" starts with a hyphen`).toBe(false);
      expect(name.endsWith('-'), `folder "${name}" ends with a hyphen`).toBe(false);
      expect(name.includes('--'), `folder "${name}" has consecutive hyphens`).toBe(false);
    }
  });
});

describe('description and compatibility length caps (Gu 6, Gu 7)', () => {
  it('every description is non-empty and at most 1024 characters', () => {
    const files = discoverSkillMdPaths();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);
      const description = keys.get('description') ?? '';

      expect(description.trim().length, `${file} description is empty`).toBeGreaterThan(0);
      expect(
        description.length,
        `${file} description exceeds the tightened ${DESCRIPTION_MAX_LENGTH}-character cap (S6)`,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    }
  });

  it('every declared compatibility is at most 500 characters', () => {
    const files = discoverSkillMdPaths();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);
      if (!keys.has('compatibility')) continue;

      expect(
        (keys.get('compatibility') ?? '').length,
        `${file} compatibility exceeds the ${COMPATIBILITY_MAX_LENGTH}-character cap`,
      ).toBeLessThanOrEqual(COMPATIBILITY_MAX_LENGTH);
    }
  });
});

describe('five required body sections, in order (Gu 8)', () => {
  it('every SKILL.md carries "# <Title>" then the four required "## " headings in order', () => {
    const files = discoverSkillMdPaths();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const { body } = splitFrontmatterAndBody(source);

      const h1Index = body.search(/^#\s+\S/m);
      expect(h1Index, `${file} body has no top-level "# <Title>" heading`).toBeGreaterThanOrEqual(0);

      let cursor = h1Index;
      for (const heading of REQUIRED_BODY_HEADINGS) {
        const headingIndex = body.indexOf(heading, cursor);
        expect(
          headingIndex,
          `${file} is missing "${heading}" after position ${cursor}, or it is out of order`,
        ).toBeGreaterThan(cursor);
        cursor = headingIndex;
      }
    }
  });
});

/**
 * Neutrality sweep (Gu 30). Targets the *specific* harny-only residue
 * `roadmap.md` Phase 1 names as the regression this feature exists to
 * prevent — not a blanket keyword sweep, which would false-positive on
 * legitimate neutral prose discussing testing or tooling in the abstract.
 * Each entry below is a literal substring known to exist in the dogfood
 * `.agents/skills/` copy (verified by reading the real files, byte-for-byte
 * via `python3`, not eyeballed from a rendered view) that Task 1.3/1.4/1.6/
 * 1.7 requires be absent from the shipped, tool-neutral copy.
 *
 * (Coordinator review fix.) Markdown source soft-wraps prose across physical
 * lines, so a needle copied from *rendered* text can contain a space where
 * the raw file has a newline + indentation — a contiguous `.includes()`
 * against raw `fs.readFileSync` bytes then never matches, in either the
 * dogfood file or the future shipped copy, and the check silently,
 * permanently no-ops. `normalizeWhitespace` collapses every run of
 * whitespace (spaces, tabs, newlines) to a single space in both the source
 * and each needle before comparing, so line-wrapping cannot produce a false
 * miss. The harny-standards `AGENTS.md` needle is also corrected to the raw
 * file's actual quoting (backtick-wrapped `` `AGENTS.md` ``, not
 * straight-quoted).
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

const NEUTRALITY_CHECKS: ReadonlyArray<{ relativePath: string; forbidden: readonly string[] }> = [
  {
    relativePath: 'harny-standards/SKILL.md',
    forbidden: [
      'S1 (TypeScript/ESM',
      'tests mirror `src/`',
      '`AGENTS.md` § "Coding standards"',
      'seven standards',
      'seven coding standards',
    ],
  },
  {
    relativePath: 'harny-sync/SKILL.md',
    forbidden: ['This exact mistake was found and fixed by hand on 2026-09-09'],
  },
  {
    relativePath: 'harny-adr/SKILL.md',
    forbidden: [
      'canonical-role-templates',
      'cursor-kiro-copilot-generators',
      'codex-generator',
      'sdd-skill-library',
    ],
  },
  // (Post-audit fix, finding AL-P1, HIGH.) `harny-audit` and `harny-implement`
  // shipped harny's own standard ids/count directly — the exact DC-1 material
  // this sweep exists to catch — and the pre-audit sweep never looked at
  // either file. Added so a future regression here is caught the same way.
  {
    relativePath: 'harny-audit/SKILL.md',
    forbidden: ['seven standards (S1', 'S1–S7'],
  },
  {
    relativePath: 'harny-implement/SKILL.md',
    forbidden: ['S1–S6'],
  },
  {
    relativePath: 'README.md',
    forbidden: ['ln -s ../../.agents/skills'],
  },
  // specs/test-tiers TT-3: the shipped rubric is a generalized extract of the
  // dogfood `.claude/skills/high-value-tests/SKILL.md`, and must carry none
  // of that file's domain-specific residue.
  {
    relativePath: 'harny-test/high-value-tests.md',
    forbidden: [
      'IVA',
      'es-EC',
      'shadcn',
      'Radix',
      'Supabase',
      'RLS',
      'security definer',
      '.live.test.ts',
      'Postgres',
      'receipt',
      'finance auto-feed',
    ],
  },
];

describe('neutrality sweep — no harny-only residue in the shipped copy (Gu 30)', () => {
  it.each(NEUTRALITY_CHECKS)('$relativePath contains none of its known harny-only residue strings', ({ relativePath, forbidden }) => {
    const file = path.join(TEMPLATES_SKILLS_ROOT, relativePath);
    expect(fs.existsSync(file), `${file} does not exist yet`).toBe(true);

    const source = normalizeWhitespace(fs.readFileSync(file, 'utf8'));
    for (const needle of forbidden) {
      expect(
        source.includes(normalizeWhitespace(needle)),
        `${relativePath} still contains harny-only residue: "${needle}"`,
      ).toBe(false);
    }
  });
});

/** Recursively lists every file under `dir`. */
function listFilesRecursively(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

describe('the archive lifecycle is single-valued in templates/ (Gu 25, S5, SC17)', () => {
  it('no file under templates/ still instructs a role to keep a spec directory in place', () => {
    expect(fs.existsSync(TEMPLATES_ROOT)).toBe(true);
    const files = listFilesRecursively(TEMPLATES_ROOT).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThan(0);

    const archiveInPlacePattern = /do not move, rename, or delete|archiv(?:e|ing)[^\n]{0,40}in place/i;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const match = archiveInPlacePattern.exec(source);
      expect(
        match,
        `${path.relative(REPO_ROOT, file)} still contains an "archive in place" / "do NOT move" instruction: "${match?.[0]}"`,
      ).toBeNull();
    }
  });
});
