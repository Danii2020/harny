/**
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantee 11 ("Declared-divergence fidelity");
 * intent.md SC5; roadmap.md Phase 4.7; tasks.md Task 4.17.
 *
 * This is the direct mitigation for the `canonical-role-templates` AL-2 drift
 * failure recurring across two skill trees (intent.md G2, problem-statement
 * item 4) — per `tasks.md`'s own note, "if one test in this feature must be
 * excellent, it is that one." It follows `tests/canonical-fidelity.test.ts`'s
 * shape: a non-self-referential, filesystem-level comparison between the
 * dogfood `.agents/skills/` tree (the oracle) and the shipped
 * `templates/skills/` tree, never routed through `loadCanonicalTemplates`.
 *
 * Post-audit rewrite (finding AL-P2, HIGH). The prior version of this file
 * asserted byte-identity for exactly one skill (`harny-propose`) and
 * residue-absence for exactly three (`harny-standards`, `harny-sync`,
 * `harny-adr`), leaving `harny-test`, `harny-implement`, `harny-audit`,
 * `harny-document` and `README.md` — five of the nine
 * `.agents/skills/` <-> `templates/skills/` pairs Gu 11 covers — with **no
 * assertion of any kind**. That is exactly how finding AL-P1's `S1`-`S7`
 * residue shipped undetected in `harny-audit` and `harny-implement`.
 *
 * This version is exhaustive **by construction**, not by enumeration: every
 * name the bijection discovers (the eight `harny-*` skills, plus `README.md`
 * as a ninth pseudo-entry) MUST have an entry in `DIVERGENCE_TABLE` below.
 * Discovery is still driven by `fs.readdirSync`, never a hardcoded skill-name
 * list, so a *tenth* skill added to either tree without a matching entry
 * fails this test loudly (`expect(entry, ...).toBeDefined()`) instead of
 * passing silently — the same class of gap AL-P2 found, closed structurally
 * rather than by adding three more enumerated cases.
 *
 * Each entry is either:
 *   - `{ kind: 'byte-identical' }` — the two `SKILL.md` files must be exactly
 *     equal (`harny-propose`, `harny-test`, `harny-implement`, `harny-audit`:
 *     measured with `cmp`-equivalent comparison to be genuinely unchanged
 *     today, per the divergence table's "Near-identical"/"None expected" rows
 *     corrected post-audit).
 *   - `{ kind: 'diverges', forbiddenInTemplate, requiredInTemplate }` — for a
 *     skill whose shipped copy is deliberately edited: `forbiddenInTemplate`
 *     lists harny-only substrings known (verified by reading the real files)
 *     to exist in the dogfood copy that must be **absent** from the shipped
 *     copy (a removed-residue divergence — DC-1/DC-2 neutralization);
 *     `requiredInTemplate` lists substrings that must be **present** in the
 *     shipped copy but are absent from the dogfood copy (an additive
 *     divergence — DC-3 clarification, e.g. `harny-document`). Every
 *     `forbiddenInTemplate` needle is also asserted present in the dogfood
 *     source first, so this test cannot pass merely because the oracle itself
 *     changed shape out from under it.
 *
 * (Coordinator review fix, carried from the original version.) Markdown
 * source soft-wraps prose across physical lines, so a needle copied from
 * *rendered* text can contain a space where the raw file has a newline +
 * indentation. `normalizeWhitespace` collapses every run of whitespace to a
 * single space in both the source and each needle before comparing, so
 * line-wrapping cannot produce a silent, permanent false miss (the exact
 * AL-S2-class failure this repo's audits flag).
 *
 * Red-phase note: `templates/skills/` does not exist yet, so every discovery
 * below is empty. Each discovery is asserted non-empty as a precondition
 * before any comparison runs, so an absent tree fails loudly rather than
 * vacuously matching an equally-empty "oracle absent" state.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md § "Public API — src/vocabulary.ts (MODIFIED)" naming
 * `harny-feedback`; Behavior Guarantee 16 (skill parity); intent.md SC9;
 * roadmap.md Phase 3.1–3.2, 3.5; tasks.md Task 3.4.
 *
 * `harny-feedback` is not yet authored (Task 3.6/3.8, deferred to
 * `harny-implement`), so this is a genuinely new, targeted assertion rather
 * than an extension of the generic, glob-driven bijection/`DIVERGENCE_TABLE`
 * machinery above: that machinery discovers a skill only once it exists on
 * disk under `.agents/skills/`, so it stays vacuously green for a
 * not-yet-created ninth skill and cannot serve as red-phase coverage here.
 * `harny-feedback`'s own `DIVERGENCE_TABLE` entry (if any) is `harny-implement`'s
 * concern once the file exists, per its declared-divergence classification.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './helpers/paths.js';

const AGENTS_SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');
const TEMPLATES_SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'skills');

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

function discoverTemplateHarnySkillNames(): string[] {
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

function readIfExists(file: string): string | undefined {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

describe('discovery precondition — both skill trees exist', () => {
  it('discovers at least one harny-* skill under both .agents/skills/ and templates/skills/', () => {
    const agentsNames = discoverAgentsHarnySkillNames();
    const templateNames = discoverTemplateHarnySkillNames();

    expect(agentsNames.length, 'no .agents/skills/harny-* directory exists').toBeGreaterThan(0);
    expect(
      templateNames.length,
      'no templates/skills/harny-* directory exists yet — expected once Phase 1 lands',
    ).toBeGreaterThan(0);
  });
});

describe('bijection: every dogfood harny-* skill has a shipped counterpart, and vice versa (Gu 11, SC5)', () => {
  it('the name sets are equal', () => {
    const agentsNames = discoverAgentsHarnySkillNames();
    expect(agentsNames.length).toBeGreaterThan(0);

    const templateNames = discoverTemplateHarnySkillNames();
    expect(new Set(templateNames)).toEqual(new Set(agentsNames));
  });
});

/**
 * The exhaustive-by-construction oracle (AL-P2 fix). One entry per
 * `harny-*` skill name PLUS `README.md`, covering all nine
 * `.agents/skills/` <-> `templates/skills/` pairs this feature's divergence
 * table (`contract.md` § Data Models) commits to. `checkDivergenceTable`
 * below fails loudly if the live bijection ever contains a name absent here.
 */
interface ByteIdenticalExpectation {
  readonly kind: 'byte-identical';
}
interface DivergesExpectation {
  readonly kind: 'diverges';
  /** Harny-only substrings that must exist in the dogfood copy and be absent
   *  from the shipped copy (a removed-residue divergence). */
  readonly forbiddenInTemplate?: readonly string[];
  /** Substrings that must exist in the shipped copy and be absent from the
   *  dogfood copy (an additive divergence). */
  readonly requiredInTemplate?: readonly string[];
}
type DivergenceExpectation = ByteIdenticalExpectation | DivergesExpectation;

const DIVERGENCE_TABLE: Readonly<Record<string, DivergenceExpectation>> = {
  // Byte-identical today (contract.md's corrected divergence table): no DC-1/
  // DC-2/DC-3 edit was needed for these three.
  'harny-propose': { kind: 'byte-identical' },
  'harny-test': { kind: 'byte-identical' },

  // DC-1 (corrected post-audit, AL-P1): harny-audit's own compliance-check
  // step named the standard count and ids directly ("seven standards
  // (S1–S7)") — the exact DC-1 material the divergence table's own preamble
  // names, mis-classified pre-audit as "DC-2 only."
  'harny-audit': {
    kind: 'diverges',
    forbiddenInTemplate: ['seven standards (S1'],
  },
  // DC-1 (corrected post-audit, AL-P1): both "S1–S6" occurrences named
  // harny's own standard ids directly, mis-classified pre-audit as
  // "DC-2 only."
  'harny-implement': {
    kind: 'diverges',
    forbiddenInTemplate: ['S1–S6'],
  },

  // DC-1: the harny-stack (TypeScript/vitest/src/, and its own standard ids
  // and count — the exact AL-P1 residue) checklist, neutralized.
  'harny-standards': {
    kind: 'diverges',
    forbiddenInTemplate: [
      'S1 (TypeScript/ESM',
      'tests mirror `src/`',
      'seven standards',
      'seven coding standards',
    ],
  },

  // DC-2: the dated in-repo ADR-registry incident anecdote.
  'harny-sync': {
    kind: 'diverges',
    forbiddenInTemplate: ['This exact mistake was found and fixed by hand on 2026-09-09'],
  },
  // DC-2: the "features migrated before this one get no backfill" clause,
  // and the named-feature history it cites.
  'harny-adr': {
    kind: 'diverges',
    forbiddenInTemplate: [
      'canonical-role-templates',
      'cursor-kiro-copilot-generators',
      'codex-generator',
      'sdd-skill-library',
    ],
  },
  // DC-3: states the archive hand-off without assuming harny's own
  // specs/current/ history — an additive clarification, not a removal.
  'harny-document': {
    kind: 'diverges',
    requiredInTemplate: ['rather than assuming any prior history exists'],
  },
  // DC-3: the "Adding a ninth skill" procedure never symlinks into
  // .claude/skills/.
  'README.md': {
    kind: 'diverges',
    forbiddenInTemplate: ['ln -s ../../.agents/skills'],
  },

  // agent-feedback-controls Task 3.6/3.8: byte-identical today, same as
  // harny-propose/harny-test — no dogfood-only residue was authored into the
  // shared-skill body, so no DC-1/DC-2/DC-3 divergence applies.
  'harny-feedback': { kind: 'byte-identical' },
};

function expectationFor(name: string): DivergenceExpectation | undefined {
  return DIVERGENCE_TABLE[name];
}

/** The full set of names this test must cover: every discovered skill plus
 *  the README pseudo-entry, deduped. Built from discovery, never hardcoded,
 *  so a 10th skill is automatically included in the sweep below. */
function allCoveredNames(): string[] {
  const names = new Set<string>([...discoverAgentsHarnySkillNames(), 'README.md']);
  return [...names].sort();
}

describe('every name in the bijection has a declared-divergence entry (Gu 11, SC5) (AL-P2 fix)', () => {
  it('DIVERGENCE_TABLE covers every discovered harny-* skill plus README.md, with no gaps', () => {
    const names = allCoveredNames();
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      expect(expectationFor(name), `no DIVERGENCE_TABLE entry for "${name}" — a name discovered on disk must be covered explicitly, never silently skipped`).toBeDefined();
    }
  });
});

describe('declared-divergence fidelity, exhaustive over every pair (Gu 11, SC5) (AL-P2 fix)', () => {
  const names = allCoveredNames();

  it.each(names)('%s: byte-identical, or diverges only within its declared, verified class', (name) => {
    const relativePath = name === 'README.md' ? 'README.md' : path.join(name, 'SKILL.md');
    const agentsFile = path.join(AGENTS_SKILLS_ROOT, relativePath);
    const templateFile = path.join(TEMPLATES_SKILLS_ROOT, relativePath);

    const agentsSourceRaw = readIfExists(agentsFile);
    expect(agentsSourceRaw, `${agentsFile} does not exist`).toBeDefined();
    const templateSourceRaw = readIfExists(templateFile);
    expect(templateSourceRaw, `${templateFile} does not exist yet`).toBeDefined();

    const expectation = expectationFor(name);
    expect(expectation, `no DIVERGENCE_TABLE entry for "${name}"`).toBeDefined();

    if (expectation!.kind === 'byte-identical') {
      expect(templateSourceRaw).toBe(agentsSourceRaw);
      return;
    }

    const agentsSource = normalizeWhitespace(agentsSourceRaw!);
    const templateSource = normalizeWhitespace(templateSourceRaw!);

    for (const needle of expectation!.forbiddenInTemplate ?? []) {
      // Confirm the residue really is present in the oracle first, so this
      // test cannot pass merely because the dogfood copy itself changed shape.
      expect(
        agentsSource.includes(normalizeWhitespace(needle)),
        `test assumption broken: ${agentsFile} no longer contains "${needle}"`,
      ).toBe(true);
      expect(
        templateSource.includes(normalizeWhitespace(needle)),
        `${relativePath} still carries dogfood-only residue: "${needle}"`,
      ).toBe(false);
    }

    for (const needle of expectation!.requiredInTemplate ?? []) {
      expect(
        agentsSource.includes(normalizeWhitespace(needle)),
        `test assumption broken: ${agentsFile} unexpectedly already contains "${needle}"`,
      ).toBe(false);
      expect(
        templateSource.includes(normalizeWhitespace(needle)),
        `${relativePath} is missing its declared additive divergence: "${needle}"`,
      ).toBe(true);
    }
  });
});

describe('bundled resources default to byte-identical (no divergence declared for them) (Gu 11, Gu 12)', () => {
  it('harny-sync/capability-template.md is byte-identical between the two trees', () => {
    const agentsFile = path.join(AGENTS_SKILLS_ROOT, 'harny-sync', 'capability-template.md');
    const templateFile = path.join(TEMPLATES_SKILLS_ROOT, 'harny-sync', 'capability-template.md');

    const agentsSource = readIfExists(agentsFile);
    expect(agentsSource, `${agentsFile} does not exist`).toBeDefined();
    const templateSource = readIfExists(templateFile);
    expect(templateSource, `${templateFile} does not exist yet`).toBeDefined();

    expect(templateSource).toBe(agentsSource);
  });

  it('harny-adr/adr-template.md is byte-identical between the two trees', () => {
    const agentsFile = path.join(AGENTS_SKILLS_ROOT, 'harny-adr', 'adr-template.md');
    const templateFile = path.join(TEMPLATES_SKILLS_ROOT, 'harny-adr', 'adr-template.md');

    const agentsSource = readIfExists(agentsFile);
    expect(agentsSource, `${agentsFile} does not exist`).toBeDefined();
    const templateSource = readIfExists(templateFile);
    expect(templateSource, `${templateFile} does not exist yet`).toBeDefined();

    expect(templateSource).toBe(agentsSource);
  });
});

describe('allowed-tools is kept uniformly, never stripped for the shipped copy (D1)', () => {
  it('every .agents/skills/harny-*/SKILL.md that declares allowed-tools keeps it, unchanged, in templates/skills/', () => {
    const names = discoverAgentsHarnySkillNames();
    expect(names.length).toBeGreaterThan(0);

    let checkedAtLeastOne = false;
    for (const name of names) {
      const agentsSource = readIfExists(path.join(AGENTS_SKILLS_ROOT, name, 'SKILL.md'));
      if (agentsSource === undefined) continue;
      const match = /^allowed-tools:.*$/m.exec(agentsSource);
      if (!match) continue;

      checkedAtLeastOne = true;
      const templateSource = readIfExists(path.join(TEMPLATES_SKILLS_ROOT, name, 'SKILL.md'));
      expect(templateSource, `templates/skills/${name}/SKILL.md does not exist yet`).toBeDefined();
      expect(
        templateSource!.includes(match[0]),
        `templates/skills/${name}/SKILL.md dropped or altered its allowed-tools line`,
      ).toBe(true);
    }
    expect(checkedAtLeastOne, 'no dogfood skill declares allowed-tools — test fixture assumption broken').toBe(true);
  });
});

describe('harny-feedback is byte-identical between the two skill roots (Gu 16, SC9) (agent-feedback-controls Task 3.4)', () => {
  it('.agents/skills/harny-feedback/SKILL.md and templates/skills/harny-feedback/SKILL.md exist and are byte-identical', () => {
    const agentsFile = path.join(AGENTS_SKILLS_ROOT, 'harny-feedback', 'SKILL.md');
    const templateFile = path.join(TEMPLATES_SKILLS_ROOT, 'harny-feedback', 'SKILL.md');

    const agentsSource = readIfExists(agentsFile);
    expect(agentsSource, `${agentsFile} does not exist yet`).toBeDefined();
    const templateSource = readIfExists(templateFile);
    expect(templateSource, `${templateFile} does not exist yet`).toBeDefined();

    expect(templateSource).toBe(agentsSource);
  });
});
