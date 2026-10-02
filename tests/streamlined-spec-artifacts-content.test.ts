/**
 * Spec: specs/streamlined-spec-artifacts
 * Covers: contract.md SA-1, SA-2 (schema file set and section order), SA-5, SA-6,
 * SA-7 (prompt content); intent.md SC1-SC4; audit.md Test Coverage T1, T6.
 *
 * These are prompt-content checks, justified the same way
 * `tests/test-writer-templates.test.ts` justifies its own: the contract pins
 * what shipped prompt text must say (and must stop saying), and the only way to
 * verify prompt prose is to read it. They are deliberately coarse (structure and
 * token presence, never exact sentences), so rewording survives.
 *
 * Red-phase note: every test below fails today on genuinely missing behavior
 * (no `execution-plan.md` template, prompts still cite `contract.md`/`roadmap.md`
 * and carry the `**Plan status**` line).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

function listMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out.sort();
}

const rel = (file: string) => path.relative(REPO_ROOT, file).split(path.sep).join('/');
const read = (relative: string) => fs.readFileSync(path.join(REPO_ROOT, relative), 'utf8');

/** SA-6's trees: roles, skills and conductor text, shipped and dogfood. */
const PROMPT_TREES = [
  'templates/roles',
  'templates/conductor',
  'templates/skills',
  'templates/doctor/README.md',
  '.agents/skills',
  '.claude/agents',
  '.claude/skills/sdd-conductor',
];

function promptFiles(): string[] {
  const files: string[] = [];
  for (const tree of PROMPT_TREES) {
    const abs = path.join(REPO_ROOT, tree);
    if (!fs.existsSync(abs)) continue;
    files.push(...(fs.statSync(abs).isDirectory() ? listMarkdown(abs) : [abs]));
  }
  return files;
}

describe('spec-schema templates (SA-1, SA-2) (T1)', () => {
  it('templates/spec-schema holds exactly intent, execution-plan, tasks and audit', () => {
    const names = fs.readdirSync(path.join(REPO_ROOT, 'templates', 'spec-schema')).sort();

    expect(names).toEqual(['audit.md', 'execution-plan.md', 'intent.md', 'tasks.md']);
  });

  const SECTIONS: Record<string, string[]> = {
    intent: ['Outcome', 'Acceptance criteria', 'Scope', 'Constraints', 'Open questions', 'Revision history'],
    'execution-plan': [
      'Guidance consulted',
      'Ownership',
      'Binding constraints',
      'Proposed approach',
      'Consumers and migration',
      'Risks',
      'Validation',
      'Revision log',
    ],
    tasks: ['Status', 'Baseline', 'Outcomes', 'Working state', 'Finding responses', 'Checkpoint'],
    audit: [
      'AC results',
      'Binding-constraint compliance',
      'Test coverage',
      'Findings',
      'Audit log',
      'Final verdict',
    ],
  };

  it.each(Object.entries(SECTIONS))(
    '%s.md keeps the Spec Schema wrapper and carries its sections as headings, in order',
    (name, sections) => {
      const source = read(`templates/spec-schema/${name}.md`);

      expect(source.startsWith(`# Spec Schema: ${name}.md`)).toBe(true);
      expect(source).toContain('## Template');

      const headings = [...source.matchAll(/^#{1,6}\s+(.*)$/gm)].map((m) => m[1].toLowerCase());
      let cursor = -1;
      for (const section of sections) {
        const index = headings.findIndex((h, i) => i > cursor && h.includes(section.toLowerCase()));
        expect(index, `${name}.md has no heading "${section}" after the previous section`).toBeGreaterThan(cursor);
        cursor = index;
      }
    },
  );

  it('intent.md header carries Revision and the Pending|Approved approval line', () => {
    const source = read('templates/spec-schema/intent.md');

    expect(source).toMatch(/Revision:\s*N/);
    expect(source).toMatch(/Approval:\s*Pending\s*\|\s*Approved revision N by/);
  });

  it('audit.md checks tiers against § Validation in a Tier Results subsection', () => {
    const source = read('templates/spec-schema/audit.md');

    expect(source).toContain('Tier Results');
    expect(source).toContain('Validation');
  });
});

describe('prompt content never names the removed schema files outside a legacy note (SA-6) (T6)', () => {
  it('every contract.md / roadmap.md mention in role, skill and conductor text sits beside a legacy-shape note', () => {
    const offenders: string[] = [];
    for (const file of promptFiles()) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/\b(contract|roadmap)\.md\b/.test(line)) return;
        const window = lines.slice(Math.max(0, i - 2), i + 3).join('\n');
        if (!/legacy/i.test(window)) offenders.push(`${rel(file)}:${i + 1}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});

describe('the separate Test Plan is gone from prompt content (SA-7) (T6)', () => {
  it('no role, skill or conductor text carries a Plan status line or a Test Plan subsection', () => {
    const offenders: string[] = [];
    for (const file of promptFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      if (/\*\*Plan status\*\*/.test(source) || /^#{2,4}\s+Test Plan\b/m.test(source)) {
        offenders.push(rel(file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it.each(['templates/roles/sdd-test-writer.md', 'templates/skills/harny-test/SKILL.md', 'templates/conductor/sdd-conductor.md'])(
    '%s keeps the stop marker and ties it to the approved Validation section',
    (file) => {
      const source = read(file);

      expect(source).toContain('TEST PLAN AWAITING CONFIRMATION');
      expect(source).toMatch(/Validation/);
    },
  );
});

describe('the architect writes three files and never audit.md (SA-5) (T6)', () => {
  it.each(['templates/skills/harny-propose/SKILL.md', '.agents/skills/harny-propose/SKILL.md'])(
    '%s names the three architect files and forbids writing audit.md',
    (file) => {
      const source = read(file);

      for (const name of ['intent.md', 'execution-plan.md', 'tasks.md']) {
        expect(source, `${file} does not name ${name}`).toContain(name);
      }
      const auditLines = source.split('\n').filter((l) => l.includes('audit.md'));
      expect(auditLines.some((l) => /never|not|only the auditor|auditor (creates|writes)/i.test(l))).toBe(true);
      expect(source).not.toMatch(/exactly five files|five files|5-file/i);
    },
  );

  it.each(['templates/roles/sdd-architect.md', '.claude/agents/sdd-architect.md'])(
    '%s owns three spec files, not five',
    (file) => {
      const source = read(file);

      expect(source).toMatch(/\bthree\b[^\n]*spec files|spec files[^\n]*\bthree\b|execution-plan\.md/i);
      expect(source).not.toMatch(/five spec files|5-file/i);
    },
  );
});
