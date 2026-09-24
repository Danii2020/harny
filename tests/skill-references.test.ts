/**
 * Spec: specs/test-tiers
 * Covers: contract.md TT-4; intent.md G4, SC2; audit.md Test Coverage T2;
 * tasks.md Task R.2.
 *
 * Drives the real `runInit` pipeline (in-process, against the real,
 * production `templates/` root — never a fixture) with all five tools and
 * `--skills all`, then reads the resulting file tree directly with
 * `node:fs`, independently of the loader — the same convention
 * `tests/skills-placement.test.ts` already uses for exactly this reason.
 *
 * Red-phase note: `templates/skills/harny-test/SKILL.md` still contains the
 * literal sentence "Run the `high-value-tests` skill first" (and the
 * `compatibility` line still asks for a `high-value-tests` skill), naming a
 * skill id that is not in `SKILL_IDS` and was never shipped. The dangling-
 * reference sweep below is expected to fail on exactly that reference at red
 * time — not on a wrong assumption about the install mechanism (proven
 * correct by `tests/skills-placement.test.ts`, imported unchanged here).
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'harny-skill-references-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fsp.rm(dir, { recursive: true, force: true })));
});

function collectingIO() {
  return { log: () => {}, warn: () => {} };
}

/** The five spec-file names TT-4 explicitly excludes from the "bundled `.md`
 *  reference must exist beside it" rule — a bare reference to one of these in
 *  a `SKILL.md` is a reference to a downstream `specs/<feature>/*.md` file,
 *  never to a file this skill ships. */
const SPEC_FILE_NAMES = new Set(['intent.md', 'contract.md', 'roadmap.md', 'tasks.md', 'audit.md']);

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

/** Every `harny-*` skill's `SKILL.md` under `root`, discovered by directory
 *  listing — never a hardcoded skill-id list. */
function discoverSkillMdFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('harny-'))
    .map((e) => path.join(root, e.name, 'SKILL.md'))
    .filter((p) => fs.existsSync(p));
}

/** Every installed role and conductor artifact under `targetDir`, discovered
 *  by extension — `.md` (Claude Code/Cursor/Kiro), `.agent.md` (Copilot),
 *  `.toml` (Codex), scoped to `agents/` and `skills/sdd-conductor/`
 *  directories only, so this never scoops up unrelated tool config files. */
function discoverRoleAndConductorFiles(targetDir: string): string[] {
  const all = listFilesUnder(targetDir);
  return all
    .filter((rel) => rel.includes('/agents/') || rel.endsWith('sdd-conductor/SKILL.md'))
    .filter((rel) => rel.endsWith('.md') || rel.endsWith('.toml'))
    .map((rel) => path.join(targetDir, rel));
}

async function loadSkillIds(): Promise<Set<string>> {
  const { SKILL_IDS } = await import('../src/vocabulary.js');
  return new Set<string>([...(SKILL_IDS as readonly string[]), 'sdd-conductor']);
}

async function loadOptionalSkillIds(): Promise<readonly string[]> {
  const { OPTIONAL_SKILL_IDS } = await import('../src/vocabulary.js');
  return OPTIONAL_SKILL_IDS;
}

describe('no dangling "`<name>` skill" reference in a real five-tool install (TT-4)', () => {
  it('every backticked "skill" reference in an installed harny-*/SKILL.md, role or conductor artifact names a shipped skill or the conductor', async () => {
    const { runInit } = await import('../src/init.js');
    const skillIds = await loadSkillIds();

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: {
        tools: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'],
        optionalSkillIds: await loadOptionalSkillIds(),
      },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const skillRoots = ['.claude/skills', '.agents/skills', '.kiro/skills'].map((r) => path.join(targetDir, r));
    const skillMdFiles = skillRoots.flatMap((root) => discoverSkillMdFiles(root));
    const roleAndConductorFiles = discoverRoleAndConductorFiles(targetDir);
    const candidateFiles = [...new Set([...skillMdFiles, ...roleAndConductorFiles])];
    expect(candidateFiles.length).toBeGreaterThan(0);

    const referencePattern = /`([a-z][a-z0-9-]*)`\s+skill\b/g;
    const violations: string[] = [];

    for (const file of candidateFiles) {
      const source = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      referencePattern.lastIndex = 0;
      while ((match = referencePattern.exec(source)) !== null) {
        const name = match[1];
        if (!skillIds.has(name)) {
          violations.push(`${path.relative(targetDir, file)} references undeclared skill "${name}"`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});

describe('every bundled-resource reference in an installed harny-*/SKILL.md resolves beside it (TT-4)', () => {
  it('every backticked bare lowercase <file>.md reference, other than the five spec-file names, exists in that same skill\'s installed directory', async () => {
    const { runInit } = await import('../src/init.js');

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: {
        tools: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'],
        optionalSkillIds: await loadOptionalSkillIds(),
      },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const skillRoots = ['.claude/skills', '.agents/skills', '.kiro/skills'].map((r) => path.join(targetDir, r));
    const skillMdFiles = skillRoots.flatMap((root) => discoverSkillMdFiles(root));
    expect(skillMdFiles.length).toBeGreaterThan(0);

    const referencePattern = /`([a-z][a-z0-9-]*\.md)`/g;
    const violations: string[] = [];

    for (const file of skillMdFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const skillDir = path.dirname(file);
      let match: RegExpExecArray | null;
      referencePattern.lastIndex = 0;
      while ((match = referencePattern.exec(source)) !== null) {
        const name = match[1];
        if (SPEC_FILE_NAMES.has(name)) continue;
        if (name === 'SKILL.md') continue;
        const resolved = path.join(skillDir, name);
        if (!fs.existsSync(resolved)) {
          violations.push(`${path.relative(targetDir, file)} references "${name}", not found at ${path.relative(targetDir, resolved)}`);
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });
});

describe('the dangling high-value-tests skill reference is gone from the shipped tree (TT-4, SC2)', () => {
  it('the literal `high-value-tests` skill appears in no installed harny-*/SKILL.md', async () => {
    const { runInit } = await import('../src/init.js');

    const targetDir = await makeTempDir();
    await runInit({
      targetDir,
      overrides: {
        tools: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex'],
        optionalSkillIds: await loadOptionalSkillIds(),
      },
      interactive: false,
      dryRun: false,
      force: false,
      io: collectingIO(),
    });

    const skillRoots = ['.claude/skills', '.agents/skills', '.kiro/skills'].map((r) => path.join(targetDir, r));
    const skillMdFiles = skillRoots.flatMap((root) => discoverSkillMdFiles(root));
    expect(skillMdFiles.length).toBeGreaterThan(0);

    for (const file of skillMdFiles) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source, `${path.relative(targetDir, file)} still references the unshipped "high-value-tests" skill`).not.toContain(
        '`high-value-tests` skill',
      );
    }
  });
});
