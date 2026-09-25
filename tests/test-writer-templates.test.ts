/**
 * Spec: specs/test-tiers
 * Covers: contract.md TT-2, TT-3, TT-5, TT-16, TT-17, TT-28; intent.md SC3,
 * SC4, SC6, SC7; audit.md Test Coverage T3, T4, T5, T6, T14, T15; tasks.md
 * Tasks R.3, R.4, R.5, R.6, R.13.
 *
 * Reads the real, production `templates/` files directly with `node:fs` —
 * never through a fixture or the loader — the same "read the shipped source
 * of truth" convention `tests/skills-fidelity.test.ts` and
 * `tests/skills-templates.test.ts` already use. These are prompt-content
 * text/token-coupling checks (AGENTS.md § Working conventions; the
 * high-value-tests rubric's "Using this in the SDD workflow" §), justified
 * because contract.md TT-5/TT-16/TT-17/TT-28 pin the *exact* literal tokens
 * five shipped files must agree on — the only way to verify that coupling is
 * to read the files, the same class of check
 * `tests/skills-fidelity.test.ts`'s "never commit or push" and
 * "completion precondition" blocks already use for prose commitments with no
 * other means of verification.
 *
 * Red-phase note: `templates/skills/harny-test/high-value-tests.md` does not
 * exist yet, so the rubric-structure and rubric-citation blocks fail on a
 * missing file. `templates/skills/harny-test/SKILL.md`,
 * `templates/roles/sdd-test-writer.md`, `templates/conductor/sdd-conductor.md`,
 * `templates/skills/harny-audit/SKILL.md` and `templates/roles/sdd-auditor.md`
 * do not carry the TT-17 protocol tokens or the TT-28 severity table yet, so
 * the protocol-coupling and severity-parity blocks fail on genuinely missing
 * substrings. The gate-count block is a declared regression guard: the
 * conductor's pipeline diagram already contains exactly three `[HUMAN GATE`
 * entries today, and the three pre-existing load-bearing phrases already
 * survive — that block is expected to PASS already at red time and stay
 * green through the feature, the same documented posture
 * `tests/canonical-fidelity.test.ts`'s DR-4 block uses.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from './helpers/paths.js';

function readIfExists(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

const RUBRIC_PATH = path.join(REAL_TEMPLATES_ROOT, 'skills', 'harny-test', 'high-value-tests.md');
const HARNY_TEST_SKILL_PATH = path.join(REAL_TEMPLATES_ROOT, 'skills', 'harny-test', 'SKILL.md');
const TEST_WRITER_ROLE_PATH = path.join(REAL_TEMPLATES_ROOT, 'roles', 'sdd-test-writer.md');
const CONDUCTOR_PATH = path.join(REAL_TEMPLATES_ROOT, 'conductor', 'sdd-conductor.md');
const HARNY_AUDIT_SKILL_PATH = path.join(REAL_TEMPLATES_ROOT, 'skills', 'harny-audit', 'SKILL.md');
const AUDITOR_ROLE_PATH = path.join(REAL_TEMPLATES_ROOT, 'roles', 'sdd-auditor.md');

const PINNED_RUBRIC_HEADINGS = [
  '## The one question',
  "## Don't write these",
  '## Do write these',
  '## Picking the right tier',
  '## Using this in the SDD workflow',
] as const;

describe('the rubric has one H1, the five pinned H2 headings in order, and no frontmatter (TT-2, TT-3) (T6)', () => {
  it('templates/skills/harny-test/high-value-tests.md carries the pinned section structure', () => {
    const source = readIfExists(RUBRIC_PATH);
    expect(source, `${RUBRIC_PATH} does not exist yet`).toBeDefined();

    expect(source!.startsWith('---'), 'the rubric must carry no YAML frontmatter').toBe(false);

    const h1Matches = [...source!.matchAll(/^#\s+\S.*$/gm)];
    expect(h1Matches.length, 'expected exactly one H1').toBe(1);

    let cursor = h1Matches[0].index!;
    for (const heading of PINNED_RUBRIC_HEADINGS) {
      const headingIndex = source!.indexOf(heading, cursor);
      expect(headingIndex, `missing "${heading}" after position ${cursor}, or out of order`).toBeGreaterThan(cursor);
      cursor = headingIndex;
    }
  });

  it('ends in exactly one trailing newline (S3)', () => {
    const source = readIfExists(RUBRIC_PATH);
    expect(source, `${RUBRIC_PATH} does not exist yet`).toBeDefined();
    expect(source!.endsWith('\n')).toBe(true);
    expect(source!.endsWith('\n\n')).toBe(false);
  });

  it('contains no \'\'\' (Codex TOML-literal safety, TT-3)', () => {
    const source = readIfExists(RUBRIC_PATH);
    expect(source, `${RUBRIC_PATH} does not exist yet`).toBeDefined();
    expect(source).not.toContain("'''");
  });
});

/** Every `` `high-value-tests.md` § "<heading>" `` citation in `source`. */
function extractRubricCitations(source: string): string[] {
  const pattern = /`high-value-tests\.md`\s+§\s+"([^"]+)"/g;
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    headings.push(match[1]);
  }
  return headings;
}

describe('the skill and the role cite the rubric by bare file name and section (TT-5) (T3)', () => {
  it.each([
    ['templates/skills/harny-test/SKILL.md', HARNY_TEST_SKILL_PATH],
    ['templates/roles/sdd-test-writer.md', TEST_WRITER_ROLE_PATH],
  ])('%s cites at least "The one question" and "Picking the right tier", and every cited heading exists in the rubric', (_label, filePath) => {
    const source = readIfExists(filePath);
    expect(source, `${filePath} does not exist`).toBeDefined();

    const citations = extractRubricCitations(source!);
    expect(citations, `${filePath} carries no \`high-value-tests.md\` § citation`).toContain('The one question');
    expect(citations).toContain('Picking the right tier');

    const rubricSource = readIfExists(RUBRIC_PATH);
    expect(rubricSource, `${RUBRIC_PATH} does not exist yet`).toBeDefined();
    for (const heading of citations) {
      expect(
        rubricSource!.includes(`## ${heading}`),
        `${filePath} cites § "${heading}", which is not an H2 in the rubric`,
      ).toBe(true);
    }
  });

  it('the role no longer carries the "vendors a dedicated rubric" conditional', () => {
    const source = readIfExists(TEST_WRITER_ROLE_PATH);
    expect(source, `${TEST_WRITER_ROLE_PATH} does not exist`).toBeDefined();
    expect(source).not.toContain('vendors a dedicated rubric');
  });
});

const TT17_MARKER = 'TEST PLAN AWAITING CONFIRMATION';
const TT17_STATUS_VALUES = ['PROPOSED', 'CONFIRMED', 'NOT REQUIRED'] as const;

describe('the TT-17 protocol tokens are identical across the four shipped files that carry them (TT-17) (T4, T14)', () => {
  const FILES: ReadonlyArray<[string, string]> = [
    ['templates/skills/harny-test/SKILL.md', HARNY_TEST_SKILL_PATH],
    ['templates/roles/sdd-test-writer.md', TEST_WRITER_ROLE_PATH],
    ['templates/conductor/sdd-conductor.md', CONDUCTOR_PATH],
    ['templates/skills/harny-audit/SKILL.md', HARNY_AUDIT_SKILL_PATH],
  ];

  it.each(FILES)('%s carries the literal awaiting-confirmation marker', (_label, filePath) => {
    const source = readIfExists(filePath);
    expect(source, `${filePath} does not exist`).toBeDefined();
    expect(source, `${filePath} is missing "${TT17_MARKER}"`).toContain(TT17_MARKER);
  });

  it.each(FILES)('%s carries all three `**Plan status**:` literals', (_label, filePath) => {
    const source = readIfExists(filePath);
    expect(source, `${filePath} does not exist`).toBeDefined();
    for (const value of TT17_STATUS_VALUES) {
      const needle = `**Plan status**: ${value}`;
      expect(source, `${filePath} is missing "${needle}"`).toContain(needle);
    }
  });
});

describe('the conductor keeps exactly three human gates, and the checkpoint is not a fourth one (TT-16) (T5)', () => {
  it('the pipeline diagram contains exactly three [HUMAN GATE entries', () => {
    const source = readIfExists(CONDUCTOR_PATH);
    expect(source, `${CONDUCTOR_PATH} does not exist`).toBeDefined();

    const gateMatches = source!.match(/\[HUMAN GATE/g) ?? [];
    expect(gateMatches.length).toBe(3);
  });

  it('keeps the three pre-existing load-bearing phrases', () => {
    const source = readIfExists(CONDUCTOR_PATH);
    expect(source, `${CONDUCTOR_PATH} does not exist`).toBeDefined();

    for (const phrase of ['documentation follows automatically', 'auditor → documentation', 'confirms the archive landed']) {
      expect(source, `${CONDUCTOR_PATH} is missing "${phrase}"`).toContain(phrase);
    }
  });
});

/** The five TT-28 conditions this contract pins at severity `HIGH`, plus the
 *  two `MEDIUM` and one `LOW` conditions from the same table — each keyed to
 *  a short, distinctive substring of the contract's own condition wording
 *  (`contract.md` § Behavior Guarantees, TT-28's table), so a table-row match
 *  is scoped to a single markdown line rather than the whole file. */
const TT28_CONDITIONS: ReadonlyArray<{ name: string; fragment: string; severity: 'HIGH' | 'MEDIUM' | 'LOW' }> = [
  { name: 'unconfirmed non-unit test', fragment: 'the plan is not `CONFIRMED`', severity: 'HIGH' },
  { name: 'unnamed setup', fragment: 'the plan did not name', severity: 'HIGH' },
  { name: 'confirmed/not-required tier with no tests', fragment: 'has no tests', severity: 'HIGH' },
  { name: 'plan left PROPOSED', fragment: 'still `PROPOSED` at audit time', severity: 'HIGH' },
  { name: 'misapplied NOT REQUIRED', fragment: 'confirmation rule was misapplied', severity: 'HIGH' },
];

/** Finds the severity token on the first line of `source` that also contains
 *  `fragment` — markdown table rows are single lines, so this scopes the
 *  match to one row rather than the whole file. */
function severityForFragment(source: string, fragment: string): string | undefined {
  for (const line of source.split('\n')) {
    if (line.includes(fragment)) {
      const match = /\*\*(HIGH|MEDIUM|LOW|CRITICAL)\*\*/.exec(line);
      if (match) return match[1];
    }
  }
  return undefined;
}

describe('the auditor skill lists the tier findings at the pinned severities (TT-28) (T15)', () => {
  it.each(TT28_CONDITIONS)('$name is rated $severity in the skill', ({ fragment, severity }) => {
    const skillSource = readIfExists(HARNY_AUDIT_SKILL_PATH);
    expect(skillSource, `${HARNY_AUDIT_SKILL_PATH} does not exist`).toBeDefined();

    expect(
      severityForFragment(skillSource!, fragment),
      `templates/skills/harny-audit/SKILL.md has no row for "${fragment}"`,
    ).toBe(severity);
  });

  it('the auditor role delegates to the skill instead of restating the table', () => {
    const roleSource = readIfExists(AUDITOR_ROLE_PATH);
    expect(roleSource, `${AUDITOR_ROLE_PATH} does not exist`).toBeDefined();
    expect(roleSource).toContain('`harny-audit`');
    expect(roleSource).not.toContain('| Condition | Severity |');
  });
});
