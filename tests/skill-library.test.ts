/**
 * Spec: specs/sdd-skill-library
 * Covers: contract.md Behavior Guarantees 1 ("Canonical-single-source"),
 * 2 ("Bridge bijection"), 3 ("Portable frontmatter"); contract.md § "The
 * harny-* skill shape contract" binding rules 1 and 3; contract.md § Dependencies
 * "Test-tier interface"; roadmap.md Phase 1 step 3; tasks.md Tasks 1.3–1.7.
 *
 * This is the feature's one executable test surface (per contract.md's own
 * disclosure: "this feature's deliverable is content, not code"). It asserts
 * structure and resolution only — file existence, symlink-ness, frontmatter key
 * sets, description length — and never greps for or asserts particular wording
 * inside a SKILL.md body, per `.claude/skills/high-value-tests/SKILL.md` and
 * contract.md's explicit instruction.
 *
 * Red-phase note: as of this commit, neither `.agents/skills/` nor any
 * `.claude/skills/harny-*` bridge entry exists in this repo, so every discovery
 * glob below returns an empty set and every test in this file is expected to
 * fail. Each discovery is asserted non-empty as its own precondition *before*
 * any bijection/shape assertion runs, specifically so a "vacuously true because
 * nothing exists" pass is impossible — an empty repo state must show up as a
 * failing precondition, never as a silently-skipped body.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';
import { readFrontmatterKeys } from './helpers/frontmatter.js';

const AGENTS_SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');
const CLAUDE_SKILLS_ROOT = path.join(REPO_ROOT, '.claude', 'skills');

const PORTABLE_FRONTMATTER_KEYS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

// A representative (non-exhaustive) sample of the Claude-Code-only keys
// contract.md V6 names, used only to synthesize regression fixtures below —
// never asserted against real skill prose.
const SAMPLE_CLAUDE_ONLY_KEYS = ['disable-model-invocation', 'context', 'when_to_use'];

const DESCRIPTION_MAX_LENGTH = 1536;

/** Every top-level `.agents/skills/harny-*` directory name, discovered by
 *  glob — never a hardcoded list of the eight skill names. */
function discoverAgentsHarnySkillNames(): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(AGENTS_SKILLS_ROOT, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith('harny-'))
    .map((e) => e.name)
    .sort();
}

/** Every top-level `.claude/skills/harny-*` entry name, discovered by glob,
 *  regardless of whether it is a symlink or (incorrectly) a regular
 *  directory — the "regular directory" case is itself something Task 1.7
 *  must catch, so this discovery must not filter it out. */
function discoverClaudeHarnyEntryNames(): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(CLAUDE_SKILLS_ROOT, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .map((e) => e.name)
    .filter((name) => name.startsWith('harny-'))
    .sort();
}

function discoverHarnySkillMdPaths(): string[] {
  return discoverAgentsHarnySkillNames().map((name) =>
    path.join(AGENTS_SKILLS_ROOT, name, 'SKILL.md'),
  );
}

describe('sdd-skill-library — .agents/skills <-> .claude/skills bridge (Gu 1, Gu 2)', () => {
  it('discovers at least one harny-* skill under .agents/skills/ (discovery precondition)', () => {
    const names = discoverAgentsHarnySkillNames();
    expect(
      names.length,
      'no .agents/skills/harny-* directory exists yet — expected once Phase 1/2/3 land',
    ).toBeGreaterThan(0);
  });

  it('discovers at least one harny-* entry under .claude/skills/ (discovery precondition)', () => {
    const names = discoverClaudeHarnyEntryNames();
    expect(
      names.length,
      'no .claude/skills/harny-* bridge entry exists yet — expected once Phase 1/2/3 land',
    ).toBeGreaterThan(0);
  });

  it('the set of .claude/skills/harny-* entries equals the set of .agents/skills/harny-* directories (bijection)', () => {
    const agentsNames = discoverAgentsHarnySkillNames();
    const claudeNames = discoverClaudeHarnyEntryNames();

    // Guard against a vacuous pass: an empty/empty match would satisfy
    // toEqual below without proving anything.
    expect(agentsNames.length).toBeGreaterThan(0);

    expect(new Set(claudeNames)).toEqual(new Set(agentsNames));
  });

  it('every .claude/skills/harny-* entry is a symlink with relative link text', () => {
    const names = discoverAgentsHarnySkillNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const bridgePath = path.join(CLAUDE_SKILLS_ROOT, name);
      const stat = fs.lstatSync(bridgePath);
      expect(stat.isSymbolicLink(), `${bridgePath} must be a symlink, not a real file/directory`).toBe(
        true,
      );

      const linkText = fs.readlinkSync(bridgePath);
      expect(
        path.isAbsolute(linkText),
        `${bridgePath} link text "${linkText}" must be relative, not absolute`,
      ).toBe(false);
    }
  });

  it("every .claude/skills/harny-* symlink's realpath resolves to its .agents/skills namesake", () => {
    const names = discoverAgentsHarnySkillNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const bridgePath = path.join(CLAUDE_SKILLS_ROOT, name);
      const canonicalDir = path.join(AGENTS_SKILLS_ROOT, name);

      const resolvedBridge = fs.realpathSync(bridgePath);
      const resolvedCanonical = fs.realpathSync(canonicalDir);

      expect(resolvedBridge).toBe(resolvedCanonical);
    }
  });

  it('no harny-* entry under .claude/skills/ is a regular directory (no skill body is duplicated there)', () => {
    const claudeNames = discoverClaudeHarnyEntryNames();
    expect(claudeNames.length).toBeGreaterThan(0);

    for (const name of claudeNames) {
      const bridgePath = path.join(CLAUDE_SKILLS_ROOT, name);
      const stat = fs.lstatSync(bridgePath);
      expect(
        stat.isDirectory(),
        `${bridgePath} must not be a real directory — the canonical body lives only under .agents/skills/`,
      ).toBe(false);
    }
  });
});

describe('sdd-skill-library — portable SKILL.md frontmatter shape (Gu 3)', () => {
  it('finds at least one harny-*/SKILL.md file to check (discovery precondition)', () => {
    const files = discoverHarnySkillMdPaths().filter((f) => fs.existsSync(f));
    expect(
      files.length,
      'no .agents/skills/harny-*/SKILL.md exists yet — expected once Phase 1/2/3 land',
    ).toBeGreaterThan(0);
  });

  it('every harny-*/SKILL.md frontmatter uses only the six portable Agent Skills keys', () => {
    const files = discoverHarnySkillMdPaths().filter((f) => fs.existsSync(f));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);

      for (const key of keys.keys()) {
        expect(
          PORTABLE_FRONTMATTER_KEYS.has(key),
          `${file} frontmatter has key "${key}", which is outside the six portable Agent Skills fields`,
        ).toBe(true);
      }
    }
  });

  it('no harny-*/SKILL.md frontmatter declares a Claude-Code-only key', () => {
    const files = discoverHarnySkillMdPaths().filter((f) => fs.existsSync(f));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);

      for (const forbidden of SAMPLE_CLAUDE_ONLY_KEYS) {
        expect(
          keys.has(forbidden),
          `${file} frontmatter declares Claude-Code-only key "${forbidden}"`,
        ).toBe(false);
      }
    }
  });

  it('every harny-*/SKILL.md has a non-empty description of at most 1536 characters', () => {
    const files = discoverHarnySkillMdPaths().filter((f) => fs.existsSync(f));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const keys = readFrontmatterKeys(source);
      const description = keys.get('description');

      expect(description, `${file} frontmatter is missing a description key`).toBeDefined();
      expect((description ?? '').trim().length, `${file} description is empty`).toBeGreaterThan(0);
      expect(
        (description ?? '').length,
        `${file} description exceeds the ${DESCRIPTION_MAX_LENGTH}-character cap (V7)`,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX_LENGTH);
    }
  });
});

describe('readFrontmatterKeys (tests/helpers/frontmatter.ts) — the local reader this guard depends on', () => {
  it('reads a plain scalar and a quoted scalar as their unquoted text', () => {
    const source = ['---', 'name: harny-standards', 'license: "MIT"', '---', '', 'body'].join('\n');

    const keys = readFrontmatterKeys(source);

    expect(keys.get('name')).toBe('harny-standards');
    expect(keys.get('license')).toBe('MIT');
  });

  it('folds a `>-` block scalar into a single space-joined line with no trailing newline', () => {
    const source = [
      '---',
      'description: >-',
      '  Runs the current-state lookup or archive procedure.',
      '  Use before drafting a new spec.',
      'license: MIT',
      '---',
    ].join('\n');

    const keys = readFrontmatterKeys(source);

    expect(keys.get('description')).toBe(
      'Runs the current-state lookup or archive procedure. Use before drafting a new spec.',
    );
    // The next top-level key must still be reached correctly.
    expect(keys.get('license')).toBe('MIT');
  });

  it('returns exactly the top-level key set for a nested map value, opaque and unexpanded', () => {
    const source = [
      '---',
      'name: harny-adr',
      'metadata:',
      '  author: daniel',
      '  version: "1.0"',
      '---',
    ].join('\n');

    const keys = readFrontmatterKeys(source);

    expect(new Set(keys.keys())).toEqual(new Set(['name', 'metadata']));
  });

  it('throws when the source has no opening `---` frontmatter delimiter', () => {
    expect(() => readFrontmatterKeys('name: harny-sync\n')).toThrow();
  });

  it('measures a folded description right at the 1536-character boundary correctly', () => {
    // 1536 non-space characters folded onto one line, one line, no paragraph
    // break — folding contributes no extra characters here.
    const exact = 'a'.repeat(1536);
    const source = ['---', 'description: >-', `  ${exact}`, '---'].join('\n');

    const keys = readFrontmatterKeys(source);

    expect(keys.get('description')?.length).toBe(1536);
  });
});
