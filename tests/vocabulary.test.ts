/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/vocabulary.ts" (G2, G3),
 *         Behavior Guarantee 21 (no runtime import cycles), C3, C39, T1.
 *
 * `src/vocabulary.ts` is the closed-vocabulary source of truth every other
 * module imports and which itself imports nothing. These tests protect two
 * things: (1) the vocabulary content/shape every downstream module and every
 * future per-tool generator relies on, and (2) the acyclic import graph the
 * contract calls out by name (the config.ts <-> templates.ts cycle that was
 * deliberately designed away by extracting this module).
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes "Vocabulary" (`harny-doctor` appended
 * last to `CORE_SKILL_IDS`); Behavior Guarantee 12; intent.md SC1; audit.md
 * Test Coverage T17.
 *
 * Red-phase note: `src/vocabulary.ts` has not yet gained `harny-doctor`, so
 * `CORE_SKILL_IDS`/`OPTIONAL_SKILL_IDS`/`SKILL_IDS` are still 7/2/9 today —
 * every assertion in the new describe block below is expected to fail against
 * those counts, not on a wrong assumption about the vocabulary's shape.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

describe('vocabulary content (contract.md src/vocabulary.ts)', () => {
  it('exposes the five closed vocabularies fixed by canonical-role-templates/contract.md', async () => {
    const {
      TOOL_IDS,
      ROLE_IDS,
      GATE_IDS,
      COST_TIERS,
      CAPABILITY_NAMES,
    } = await import('../src/vocabulary.js');

    expect(TOOL_IDS).toEqual(['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']);
    expect(ROLE_IDS).toEqual([
      'sdd-architect',
      'sdd-test-writer',
      'sdd-executor',
      'sdd-auditor',
      'sdd-documentation',
    ]);
    expect(GATE_IDS).toEqual(['post-specs', 'post-red-tests', 'post-audit']);
    expect(COST_TIERS).toEqual(['most-capable', 'mid', 'cheapest']);
    expect(CAPABILITY_NAMES).toEqual([
      'read-files',
      'write-files',
      'run-shell',
      'web-search',
      'docs-lookup',
      'task-tracking',
    ]);
  });
});

describe('harny-doctor is the tenth skill and the eighth core skill (readiness-doctor, BG-12, SC1, T17)', () => {
  it('CORE_SKILL_IDS/OPTIONAL_SKILL_IDS/SKILL_IDS hold the contracted 8/2/10 counts', async () => {
    const { CORE_SKILL_IDS, OPTIONAL_SKILL_IDS, SKILL_IDS } = await import('../src/vocabulary.js');

    expect(CORE_SKILL_IDS).toHaveLength(8);
    expect(OPTIONAL_SKILL_IDS).toHaveLength(2);
    expect(SKILL_IDS).toHaveLength(10);
  });

  it('harny-doctor is appended last in CORE_SKILL_IDS, after harny-feedback, preserving every existing member\'s index', async () => {
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');

    // Independent of CORE_SKILL_IDS itself, so this cannot pass merely because
    // both this list and the source were edited together.
    const PRE_EXISTING_SEVEN_IN_ORDER = [
      'harny-propose',
      'harny-test',
      'harny-implement',
      'harny-audit',
      'harny-document',
      'harny-sync',
      'harny-feedback',
    ];

    expect(CORE_SKILL_IDS.slice(0, 7)).toEqual(PRE_EXISTING_SEVEN_IN_ORDER);
    expect(CORE_SKILL_IDS[CORE_SKILL_IDS.length - 1]).toBe('harny-doctor');
  });

  it('harny-doctor is in CORE_SKILL_IDS, never in OPTIONAL_SKILL_IDS', async () => {
    const { CORE_SKILL_IDS, OPTIONAL_SKILL_IDS } = await import('../src/vocabulary.js');

    expect(CORE_SKILL_IDS).toContain('harny-doctor');
    expect(OPTIONAL_SKILL_IDS).not.toContain('harny-doctor');
  });
});

describe('acyclic module graph (guarantee 21)', () => {
  /** Extracts relative-import specifiers (`from '...'`) from a TS source file. */
  function extractRelativeImports(source: string): string[] {
    const specifiers: string[] = [];
    const importRe = /(?:import|export)[^'"]*from\s+['"](\.[^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(source))) {
      specifiers.push(match[1]);
    }
    return specifiers;
  }

  async function listSourceFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await listSourceFiles(full)));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
    return files;
  }

  it('src/vocabulary.ts imports nothing', async () => {
    const source = await fs.readFile(path.join(REPO_ROOT, 'src', 'vocabulary.ts'), 'utf8');
    expect(extractRelativeImports(source)).toEqual([]);
    // Also guard against a bare/side-effect import of another local module.
    expect(source).not.toMatch(/^\s*import\s+['"]\./m);
  });

  it('no two src/ modules import each other at runtime (no cycles)', async () => {
    const srcDir = path.join(REPO_ROOT, 'src');
    const files = await listSourceFiles(srcDir);
    expect(files.length).toBeGreaterThan(0);

    const graph = new Map<string, string[]>();
    for (const file of files) {
      const source = await fs.readFile(file, 'utf8');
      const isTypeOnlyLine = (line: string) => /^\s*import\s+type\b/.test(line);
      const lines = source.split('\n');
      const deps: string[] = [];
      for (const line of lines) {
        if (isTypeOnlyLine(line)) continue; // type-only imports are erased at runtime
        for (const spec of extractRelativeImports(line)) {
          const resolved = path
            .normalize(path.join(path.dirname(file), spec))
            .replace(/\.js$/, '.ts');
          deps.push(resolved);
        }
      }
      graph.set(path.normalize(file), deps);
    }

    // DFS cycle detection over the runtime (non-type-only) import graph.
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    const cycleNodes: string[] = [];

    function visit(node: string): boolean {
      color.set(node, GRAY);
      for (const dep of graph.get(node) ?? []) {
        if (!graph.has(dep)) continue; // external or unresolved — not part of this graph
        const depColor = color.get(dep) ?? WHITE;
        if (depColor === GRAY) {
          cycleNodes.push(node, dep);
          return true;
        }
        if (depColor === WHITE && visit(dep)) {
          return true;
        }
      }
      color.set(node, BLACK);
      return false;
    }

    let foundCycle = false;
    for (const file of graph.keys()) {
      if ((color.get(file) ?? WHITE) === WHITE) {
        if (visit(file)) {
          foundCycle = true;
          break;
        }
      }
    }

    expect({ foundCycle, cycleNodes }).toEqual({ foundCycle: false, cycleNodes: [] });
  });
});
