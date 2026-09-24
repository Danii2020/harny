/**
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantees 1, 2, 3, 9, 10, 12, 13; intent.md
 * SC6, SC7, SC8; roadmap.md Phase 4.5, 4.6; tasks.md Tasks 4.9-4.16.
 *
 * Drives the real `runInit` pipeline (in-process, against the real,
 * production `templates/` root — never a fixture, since the guarantees here
 * are about the *actual* shipped skill content landing correctly) and
 * inspects the resulting file tree directly with `node:fs`, independently of
 * the loader, per Task 4.12's "read independently of the loader" instruction.
 *
 * Red-phase note: `CORE_SKILL_IDS`/`DEFAULT_OPTIONAL_SKILL_IDS`/`SKILL_IDS`/
 * `SKILLS_README_NAME` do not exist on `src/vocabulary.ts` yet, so importing
 * them fails the whole file at collection time — the correct red-phase
 * failure. Once vocabulary lands (Phase 2) but before skill emission exists
 * (Phase 3), the fs-based assertions below fail behaviorally instead (empty
 * or missing directories), never vacuously.
 *
 * Spec: specs/test-tiers
 * Covers: contract.md TT-1; intent.md SC1; audit.md Test Coverage T1;
 * tasks.md Task R.1. See the dedicated, non-vacuous
 * "harny-test/high-value-tests.md ships to every tool's own skill root"
 * describe block below.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harny-skills-placement-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true })));
});

function collectingIO() {
  return { log: () => {}, warn: () => {} };
}

/** Every regular file directly inside `templates/skills/<id>/`, sorted by
 *  name — mirrors the loader's own sort rule (`files sorted by name`),
 *  reimplemented independently against the filesystem, never imported from
 *  `src/templates.ts`. */
function skillResourceNames(skillId: string): string[] {
  const dir = path.join(REAL_TEMPLATES_ROOT, 'skills', skillId);
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
}

/** Expected relative skill-tree paths (root-relative, POSIX) for a given
 *  selected-skill-id list, independent of `buildSkillFiles`. */
function expectedSkillRelativePaths(skillIds: readonly string[], readmeName: string): string[] {
  const paths: string[] = [readmeName];
  for (const id of skillIds) {
    for (const name of skillResourceNames(id)) {
      paths.push(`${id}/${name}`);
    }
  }
  return paths.sort();
}

function listFilesUnder(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesUnder(full).map((f) => path.join(entry.name, f)));
    } else {
      files.push(entry.name);
    }
  }
  return files.map((f) => f.split(path.sep).join('/')).sort();
}

/** `listFilesUnder`, minus the conductor artifact. The conductor is a
 *  separate, per-tool artifact class (`tool-generators.md` TG-1's
 *  `conductorPath`, intent.md § Non-Goals "Moving the conductor") that is
 *  deliberately NOT part of the `harny-*` skill library this suite asserts
 *  the dedup/placement of — but for `claude-code`, `kiro` and `codex`,
 *  `conductorPath` happens to resolve under the exact same top-level
 *  directory as `skillsDir` (e.g. `.claude/skills/sdd-conductor/SKILL.md`
 *  alongside `.claude/skills/harny-*`), so a plain recursive directory
 *  listing legitimately also contains it. Filtering it out here keeps this
 *  suite's comparisons scoped to skill-library files only, matching what
 *  `expectedSkillRelativePaths` (built purely from `templates/skills/**`)
 *  actually enumerates. */
function listSkillLibraryFilesUnder(root: string): string[] {
  return listFilesUnder(root).filter((f) => f !== 'sdd-conductor/SKILL.md');
}

async function loadDefaultSelectedSkillIds(): Promise<string[]> {
  const { CORE_SKILL_IDS, DEFAULT_OPTIONAL_SKILL_IDS, SKILL_IDS } = await import('../src/vocabulary.js');
  const selected = new Set<string>([...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]);
  return (SKILL_IDS as readonly string[]).filter((id) => selected.has(id));
}

async function loadReadmeName(): Promise<string> {
  const { SKILLS_README_NAME } = await import('../src/vocabulary.js');
  return SKILLS_README_NAME;
}

describe('templates/skills/ has real content to place (precondition)', () => {
  it('the real templates/skills/ tree exists and carries at least the six core skill directories', async () => {
    const skillIds = await loadDefaultSelectedSkillIds();
    expect(skillIds.length).toBeGreaterThanOrEqual(6);

    for (const id of skillIds) {
      const dir = path.join(REAL_TEMPLATES_ROOT, 'skills', id);
      expect(fs.existsSync(path.join(dir, 'SKILL.md')), `${dir}/SKILL.md does not exist yet`).toBe(true);
    }
  });
});

describe('deduped placement across all five tools (Gu 2, Gu 3, SC6)', () => {
  it('writes each selected skill file exactly three times: under .agents/skills, .claude/skills, .kiro/skills — never five times', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    const readmeName = await loadReadmeName();
    const expected = expectedSkillRelativePaths(skillIds, readmeName);
    expect(expected.length).toBeGreaterThan(1);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const expectedRoots = ['.agents/skills', '.claude/skills', '.kiro/skills'];
    for (const root of expectedRoots) {
      const written = listSkillLibraryFilesUnder(path.join(targetDir, root));
      expect(written, `expected skill files under ${root}`).toEqual(expected);
    }

    // Never a fourth or fifth SKILL-LIBRARY root: .cursor/skills, .codex/skills,
    // .github/skills are all valid tool-native roots in principle, but the
    // pinned `skillsDir` table (D2) never selects them for skill-library files.
    // `.codex/skills` is never written to at all. `.cursor/skills` and
    // `.github/skills` legitimately still exist, each containing exactly one
    // file: that tool's own conductor artifact, which the unchanged, per-tool
    // `conductorPath` (Amendment A1, intent.md § Non-Goals "Moving the
    // conductor") resolves there regardless of `skillsDir` — an orthogonal,
    // pre-existing fact this suite is not asserting the placement of.
    expect(fs.existsSync(path.join(targetDir, '.codex/skills'))).toBe(false);
    for (const conductorOnlyRoot of ['.cursor/skills', '.github/skills']) {
      const files = listFilesUnder(path.join(targetDir, conductorOnlyRoot));
      expect(files, `unexpected file set under ${conductorOnlyRoot}`).toEqual(['sdd-conductor/SKILL.md']);
    }
  });
});

describe('deduped placement for a shared-root subset (Gu 3, D2, SC7)', () => {
  it('writes each selected skill file exactly once, under .agents/skills only, for cursor+codex+github-copilot', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    const readmeName = await loadReadmeName();
    const expected = expectedSkillRelativePaths(skillIds, readmeName);
    expect(expected.length).toBeGreaterThan(1);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['cursor', 'codex', 'github-copilot'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    expect(listSkillLibraryFilesUnder(path.join(targetDir, '.agents/skills'))).toEqual(expected);
    expect(fs.existsSync(path.join(targetDir, '.claude/skills'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.kiro/skills'))).toBe(false);
  });
});

describe('single-tool placement follows each tool\'s own root (Gu 2)', () => {
  it('claude-code alone writes only under .claude/skills', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    const readmeName = await loadReadmeName();
    const expected = expectedSkillRelativePaths(skillIds, readmeName);
    expect(expected.length).toBeGreaterThan(1);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    expect(listSkillLibraryFilesUnder(path.join(targetDir, '.claude/skills'))).toEqual(expected);
    expect(fs.existsSync(path.join(targetDir, '.agents/skills'))).toBe(false);
  });

  it('kiro alone writes only under .kiro/skills', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    const readmeName = await loadReadmeName();
    const expected = expectedSkillRelativePaths(skillIds, readmeName);
    expect(expected.length).toBeGreaterThan(1);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['kiro'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    expect(listSkillLibraryFilesUnder(path.join(targetDir, '.kiro/skills'))).toEqual(expected);
    expect(fs.existsSync(path.join(targetDir, '.agents/skills'))).toBe(false);
  });
});

describe('whole-file identity to source (Gu 9)', () => {
  it('every written skill artifact byte-equals its templates/skills/ source, read independently of the loader', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    expect(skillIds.length).toBeGreaterThan(0);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    let comparisons = 0;
    for (const id of skillIds) {
      for (const name of skillResourceNames(id)) {
        const written = path.join(targetDir, '.claude', 'skills', id, name);
        const source = path.join(REAL_TEMPLATES_ROOT, 'skills', id, name);
        expect(fs.existsSync(written), `${written} was not written`).toBe(true);
        expect(fs.readFileSync(written, 'utf8')).toBe(fs.readFileSync(source, 'utf8'));
        comparisons++;
      }
    }
    expect(comparisons).toBeGreaterThan(0);
  });
});

describe('only the path differs between copies (Gu 10)', () => {
  it('all copies of one skill file across the three roots are byte-equal to each other', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    expect(skillIds.length).toBeGreaterThan(0);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code', 'cursor', 'kiro'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const roots = ['.claude/skills', '.agents/skills', '.kiro/skills'];
    let comparisons = 0;
    for (const id of skillIds) {
      for (const name of skillResourceNames(id)) {
        const contentsByRoot = roots.map((root) =>
          fs.readFileSync(path.join(targetDir, root, id, name), 'utf8'),
        );
        expect(new Set(contentsByRoot).size, `${id}/${name} differs across roots`).toBe(1);
        comparisons++;
      }
    }
    expect(comparisons).toBeGreaterThan(0);
  });
});

describe('skills are copies, never symlinks (Gu 1, SC8)', () => {
  it('every written skill artifact is a regular file, verified with lstat', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadDefaultSelectedSkillIds();
    const readmeName = await loadReadmeName();
    expect(skillIds.length).toBeGreaterThan(0);

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code', 'cursor', 'kiro'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const roots = ['.claude/skills', '.agents/skills', '.kiro/skills'];
    let checked = 0;
    for (const root of roots) {
      const rootDir = path.join(targetDir, root);
      expect(fs.existsSync(rootDir)).toBe(true);
      const relFiles = listFilesUnder(rootDir);
      expect(relFiles).toContain(readmeName);
      for (const rel of relFiles) {
        const absolute = path.join(rootDir, ...rel.split('/'));
        const stat = fs.lstatSync(absolute);
        expect(stat.isSymbolicLink(), `${absolute} is a symlink`).toBe(false);
        expect(stat.isFile(), `${absolute} is not a regular file`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('bundled resources travel with their skill (Gu 12)', () => {
  it('harny-sync/capability-template.md lands beside harny-sync/SKILL.md in every written root', async () => {
    const { runInit } = await import('../src/init.js');

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code', 'cursor', 'kiro'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    for (const root of ['.claude/skills', '.agents/skills', '.kiro/skills']) {
      const skillMd = path.join(targetDir, root, 'harny-sync', 'SKILL.md');
      const resource = path.join(targetDir, root, 'harny-sync', 'capability-template.md');
      expect(fs.existsSync(skillMd), `${skillMd} missing`).toBe(true);
      expect(fs.existsSync(resource), `${resource} missing alongside its SKILL.md`).toBe(true);
    }
  });
});

/**
 * Spec: specs/test-tiers
 * Covers: contract.md TT-1; intent.md SC1; audit.md Test Coverage T1;
 * tasks.md Task R.1.
 *
 * Every describe block above already builds its "expected" path set
 * dynamically from `templates/skills/<id>/`'s own directory listing
 * (`skillResourceNames`), so if `high-value-tests.md` does not exist yet,
 * both the expected set and the actual written set omit it identically and
 * the comparison passes vacuously — exactly the gap `tasks.md` Task R.1
 * calls out ("the expected set explicitly names `high-value-tests.md` so it
 * cannot pass vacuously"). This block hardcodes the path instead of
 * discovering it, so it fails by a genuine missing file at red time, not by
 * omission on both sides.
 */
describe('harny-test/high-value-tests.md ships to every tool\'s own skill root, non-vacuously (TT-1)', () => {
  const TOOL_ROOTS: ReadonlyArray<{ tool: string; root: string }> = [
    { tool: 'claude-code', root: '.claude/skills' },
    { tool: 'cursor', root: '.agents/skills' },
    { tool: 'kiro', root: '.kiro/skills' },
    { tool: 'github-copilot', root: '.agents/skills' },
    { tool: 'codex', root: '.agents/skills' },
  ];

  it.each(TOOL_ROOTS)(
    '$tool alone writes harny-test/high-value-tests.md under $root, byte-equal to templates/skills/harny-test/high-value-tests.md',
    async ({ tool, root }) => {
      const { runInit } = await import('../src/init.js');
      const source = path.join(REAL_TEMPLATES_ROOT, 'skills', 'harny-test', 'high-value-tests.md');
      expect(fs.existsSync(source), `${source} does not exist yet`).toBe(true);

      const targetDir = await makeTempDir();
      await runInit({
        targetDir,
        overrides: { tools: [tool as 'claude-code' | 'cursor' | 'kiro' | 'github-copilot' | 'codex'] },
        interactive: false,
        dryRun: false,
        force: false,
        io: collectingIO(),
      });

      const written = path.join(targetDir, ...root.split('/'), 'harny-test', 'high-value-tests.md');
      expect(fs.existsSync(written), `${written} was not written`).toBe(true);
      expect(fs.readFileSync(written, 'utf8')).toBe(fs.readFileSync(source, 'utf8'));
    },
  );
});

describe('the shape contract ships to every root (Gu 13)', () => {
  it('templates/skills/README.md is written exactly once into each distinct root', async () => {
    const { runInit } = await import('../src/init.js');
    const readmeName = await loadReadmeName();

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: { tools: ['claude-code', 'cursor', 'kiro'] },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const source = fs.readFileSync(path.join(REAL_TEMPLATES_ROOT, 'skills', readmeName), 'utf8');
    for (const root of ['.claude/skills', '.agents/skills', '.kiro/skills']) {
      const written = path.join(targetDir, root, readmeName);
      expect(fs.existsSync(written)).toBe(true);
      expect(fs.readFileSync(written, 'utf8')).toBe(source);
    }
  });
});
