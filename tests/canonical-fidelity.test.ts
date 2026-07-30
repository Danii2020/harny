/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md Behavior Guarantees 1, 2, 4, 5; R6, R16; C19, C20, C22,
 * C23; T40, T41.
 *
 * AL-6 amendment round: Behavior Guarantee 23 (canonical bodies are complete,
 * not merely contiguous), verified non-self-referentially per the guarantee's
 * own text — Task 5.14, T5.14.
 * AL-4 amendment round: the "no tier literal in src/" half of guarantee 4 that
 * T41 documented as deliberately unasserted — Task 5.18, T5.18.
 *
 * Guarantee 4's "no tier literal in src/" clause is NOT re-verified here by a
 * source-text grep: tests/config.test.ts's mutated-cost-tier fixture test
 * (T10) already proves it behaviorally — a hardcoded role->tier map would fail
 * that test outright, which a grep for the substring "most-capable" could
 * never catch reliably (vocabulary.ts and the Claude Code model-mapping table
 * legitimately contain those same strings for unrelated, contract-mandated
 * reasons). Per the high-value-tests rubric, the stronger behavioral test wins
 * and the grep is intentionally not duplicated.
 */
import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT, REPO_ROOT } from './helpers/paths.js';

const execFileAsync = promisify(execFile);

const ROLE_IDS = [
  'sdd-architect',
  'sdd-test-writer',
  'sdd-executor',
  'sdd-auditor',
  'sdd-documentation',
] as const;

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
}

/** Recursively lists every `.ts` file under `dir`. Shared by the T41 no-copy
 *  sweep and the T5.18 no-tier-literal-fallback sweep below. */
async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(full)));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('canonical fidelity across all five roles and the conductor (R6, guarantees 1, 2) (T40)', () => {
  it('carries every role\'s canonical body byte-for-byte as a contiguous substring of its generated file', async () => {
    const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = claudeCodeGenerator.renderRole({
        template,
        tier: template.metadata.costTier,
      });
      expect(generated.contents.includes(template.body)).toBe(true);
    }
  });

  it('carries the conductor\'s canonical body byte-for-byte in its generated file', async () => {
    const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');
    const templates = await loadRealTemplates();

    const generated = claudeCodeGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: [...ROLE_IDS],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.contents.includes(templates.conductor.body)).toBe(true);
  });
});

describe('conductor body completeness, verified non-self-referentially (AL-6, guarantee 23) (T5.14)', () => {
  it('carries the real canonical conductor\'s defining sentence in the generated Skill file', async () => {
    const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');
    const templates = await loadRealTemplates();

    // Read the raw canonical file directly with fs, NOT via templates.conductor.body
    // (the parser's own output). T40's existing conductor assertion compares
    // generated output against the parser's own `body`, which is structurally
    // incapable of catching content the parser never extracted -- exactly how
    // AL-6 (the dropped defining sentence) passed 106 green tests. Anchoring
    // this assertion to a literal string, independently confirmed to be present
    // in the raw file, closes that blind spot.
    const rawConductorSource = await fs.readFile(
      path.join(REAL_TEMPLATES_ROOT, 'conductor', 'sdd-conductor.md'),
      'utf8',
    );
    const definingSentence = 'You are the **conductor** of the SDD pipeline, not a participant.';
    expect(rawConductorSource).toContain(definingSentence);

    const generated = claudeCodeGenerator.renderConductor({
      template: templates.conductor,
      project: {
        enabledRoles: [...ROLE_IDS],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
      },
    });

    expect(generated.contents).toContain(definingSentence);
  });
});

describe('no bare tier-literal fallback remains in src/ (AL-4, guarantees 4, 7) (T5.18)', () => {
  it('has no "?? \'<tier>\'"-style nullish-coalescing default to a cost-tier literal anywhere in src/', async () => {
    // T41 documents this half of guarantee 4 as deliberately unasserted there
    // (a naive grep for the tier strings would false-positive on
    // vocabulary.ts's COST_TIERS array and the Claude Code mapModel table,
    // which legitimately contain those same strings). This sweep is narrower
    // and does not share that problem: it only matches the specific
    // "?? '<tier-literal>'" fallback shape the three AL-4 defects had at
    // src/cli.ts:57, src/config.ts:216, and src/prompts.ts:80 (now removed
    // per Task 2.8b) -- neither COST_TIERS's array-literal declaration nor
    // mapModel's tier -> model-id table matches this shape.
    //
    // Block comments are stripped first so this only inspects live code: the
    // amended contract.md's own doc comment on mergeConfig discusses the
    // removed pattern by name ("no code path needs `?? 'mid'`"), which would
    // otherwise be a false positive in src/config.ts.
    const srcFiles = await listSourceFiles(path.join(REPO_ROOT, 'src'));
    const tierFallbackPattern = /\?\?\s*['"](most-capable|mid|cheapest)['"]/;

    for (const file of srcFiles) {
      const contents = await fs.readFile(file, 'utf8');
      const code = contents.replace(/\/\*[\s\S]*?\*\//g, '');
      const match = tierFallbackPattern.exec(code);
      expect(match, `${path.relative(REPO_ROOT, file)} contains a bare tier-literal fallback: "${match?.[0]}"`).toBeNull();
    }
  });
});

describe('single-source: src/ carries no literal copy of canonical prose (guarantee 4) (T41)', () => {
  it('never embeds a long, distinctive substring of any role or conductor body', async () => {
    const templates = await loadRealTemplates();
    const srcFiles = await listSourceFiles(path.join(REPO_ROOT, 'src'));
    const srcContents = await Promise.all(srcFiles.map((f) => fs.readFile(f, 'utf8')));
    const allSource = srcContents.join('\n---\n');

    const distinctiveSnippets: string[] = [];
    for (const roleId of ROLE_IDS) {
      const body = templates.roles.get(roleId)!.body;
      // A 60-char window well past any incidental short match, from partway
      // into the body so it isn't just a heading fragment.
      distinctiveSnippets.push(body.slice(40, 100));
    }
    distinctiveSnippets.push(templates.conductor.body.slice(40, 100));

    for (const snippet of distinctiveSnippets) {
      if (snippet.trim().length < 40) continue; // skip if a body is too short to yield a safe window
      expect(allSource.includes(snippet)).toBe(false);
    }
  });
});

describe('non-mutation: templates/ and .claude/ are byte-for-byte unchanged (R16, guarantee 5) (T41)', () => {
  it('shows no git changes under templates/ or .claude/ after the suite has exercised runInit', async () => {
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--', 'templates', '.claude'],
      { cwd: REPO_ROOT },
    );
    expect(stdout.trim()).toBe('');
  });
});
