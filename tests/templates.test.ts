/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/templates.ts" and its normative
 * parsing rules 1-8 (G3, G4); Behavior Guarantees 1, 5, 12;
 * Error Handling Contract rows for TEMPLATE; C5, C6, C7;
 * Test Coverage T3, T4, T5, T6, T7, T8, T9.
 *
 * AL-6 amendment round: parsing rules 9, 10 (leading authoring blockquote
 * excluded from body and surfaced as authoringNote, general to both entry
 * points, not conductor-only) and Behavior Guarantee 23 — Task 5.15, T5.15.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md "Public API — src/templates.ts" (`SkillResource`,
 * `SkillTemplate`, `CanonicalTemplates.skills`/`.skillsReadme`, the
 * byte-only, tolerated-absence loading rules); Behavior Guarantees 9, 12, 18;
 * roadmap.md Phase 4.4; tasks.md Task 4.26. Driven against the well-formed
 * fixture's `skills/` subtree (`tests/fixtures/templates/well-formed/
 * skills/**`, created for this feature), which carries exactly the seven
 * default-selected skills and deliberately omits `harny-adr` and a
 * `README.md`, to exercise tolerated absence at both the single-skill and
 * whole-tree level.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes ("Templates root: `CanonicalTemplates`
 * gains `doctorRunner?`, `doctorReadme?` and `sharedProbes?`, all loaded
 * through the existing `loadOptionalResource`"); Behavior Guarantee 18;
 * Error Handling Contract row for a lean templates root missing
 * `templates/doctor/run-doctor.mjs` or `templates/shared/probes.mjs`;
 * audit.md Test Coverage T23.
 *
 * Red-phase note: `CanonicalTemplates` does not carry `doctorRunner`,
 * `doctorReadme`, or `sharedProbes` yet, so the new describe block below is
 * expected to fail with `undefined` where a `SkillResource` was expected
 * against the real templates root. `resolveTemplatesRoot`'s directory-listing
 * assertion is amended in place (six entries -> eight, `doctor` and `shared`
 * added) — the exact "modified existing test, fails until the amendment
 * lands" case AGENTS.md S6 describes.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md § Integration Points ("`templates/` — one new
 * documentation file, `templates/mcp/README.md`"). `resolveTemplatesRoot`'s
 * directory-listing assertion is amended in place again (eight entries ->
 * nine, `mcp` added) — consequential test maintenance for a declared
 * `CLI-10` amendment, not part of context7-mcp's own approved 55-test red
 * phase; see the executor's final report.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  FIXTURES_TEMPLATES_ROOT,
  REAL_TEMPLATES_ROOT,
  fixtureTemplatesRoot,
} from './helpers/paths.js';

const ARCHITECT_SOURCE = `# sdd-architect

## Role Metadata

- id: sdd-architect
- purpose: Explain the design: rationale and tradeoffs, in one line.
- cost_tier: most-capable
- cost_rationale: Deepest reasoning role.
- capabilities: read-files, write-files, run-shell, web-search, docs-lookup, task-tracking
- invocation: Invoke first.
- handoff: Hands off to the test-writer.

## Role body

BODY TEXT.
`;

describe('parseRoleTemplate — parsing rules 1-3, 7, 8 (T3)', () => {
  it('extracts all seven role metadata keys with snake_case -> camelCase mapping', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const template = parseRoleTemplate(ARCHITECT_SOURCE, 'roles/sdd-architect.md');

    expect(template.metadata.id).toBe('sdd-architect');
    expect(template.metadata.costTier).toBe('most-capable');
    expect(template.metadata.costRationale).toBe('Deepest reasoning role.');
    expect(template.metadata.invocation).toBe('Invoke first.');
    expect(template.metadata.handoff).toBe('Hands off to the test-writer.');
  });

  it('splits each metadata entry on the first ": " only, so values containing colons survive intact (rule 2)', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const template = parseRoleTemplate(ARCHITECT_SOURCE, 'roles/sdd-architect.md');

    expect(template.metadata.purpose).toBe('Explain the design: rationale and tradeoffs, in one line.');
  });

  it('extracts the body verbatim from after "## Role body", blank-line-trimmed (rule 8)', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const template = parseRoleTemplate(ARCHITECT_SOURCE, 'roles/sdd-architect.md');

    expect(template.body).toBe('BODY TEXT.');
    expect(template.sourcePath).toBe('roles/sdd-architect.md');
  });
});

describe('parseRoleTemplate — fatal error rows (rules 4, 5, 7, 8) (T4)', () => {
  it('raises a TEMPLATE error naming the file and the missing key when a required key is absent', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const missingCostRationale = ARCHITECT_SOURCE.replace(
      '- cost_rationale: Deepest reasoning role.\n',
      '',
    );

    try {
      parseRoleTemplate(missingCostRationale, 'roles/sdd-architect.md');
      expect.unreachable('expected parseRoleTemplate to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('roles/sdd-architect.md');
      expect(message).toContain('cost_rationale');
    }
  });

  it('raises a TEMPLATE error when "## Role body" is absent', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const noBody = ARCHITECT_SOURCE.replace('## Role body\n\nBODY TEXT.\n', '');

    try {
      parseRoleTemplate(noBody, 'roles/sdd-architect.md');
      expect.unreachable('expected parseRoleTemplate to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('roles/sdd-architect.md');
      expect(message.toLowerCase()).toContain('role body');
    }
  });

  it('raises a TEMPLATE error when the metadata id does not match the file\'s H1 (rule 7)', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const mismatched = ARCHITECT_SOURCE.replace('# sdd-architect', '# sdd-someone-else');

    try {
      parseRoleTemplate(mismatched, 'roles/sdd-architect.md');
      expect.unreachable('expected parseRoleTemplate to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as Error).message).toContain('roles/sdd-architect.md');
    }
  });
});

describe('parseRoleTemplate — the deliberate asymmetry between rules 4 and 5 (T5)', () => {
  it('ignores an unknown extra metadata key rather than failing', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');

    const withExtraKey = ARCHITECT_SOURCE.replace(
      '- handoff: Hands off to the test-writer.\n',
      '- handoff: Hands off to the test-writer.\n- difficulty: high\n',
    );

    const template = parseRoleTemplate(withExtraKey, 'roles/sdd-architect.md');
    expect(template.metadata.id).toBe('sdd-architect');
  });

  it('raises a TEMPLATE error naming the file, value, and valid enum when cost_tier is out of range', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const badTier = ARCHITECT_SOURCE.replace('cost_tier: most-capable', 'cost_tier: expensive');

    try {
      parseRoleTemplate(badTier, 'roles/sdd-architect.md');
      expect.unreachable('expected parseRoleTemplate to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('roles/sdd-architect.md');
      expect(message).toContain('expensive');
      expect(message).toContain('most-capable');
      expect(message).toContain('mid');
      expect(message).toContain('cheapest');
    }
  });
});

describe('parseCapabilityList (rule 6, guarantee 8) (T6)', () => {
  it('parses plain tokens, "name (scope)" tokens, and preserves unknown tokens as known: false', async () => {
    const { parseCapabilityList } = await import('../src/templates.js');

    const result = parseCapabilityList(
      'read-files, write-files (audit.md only), run-shell, ask-human',
    );

    expect(result).toEqual([
      { name: 'read-files', known: true },
      { name: 'write-files', scope: 'audit.md only', known: true },
      { name: 'run-shell', known: true },
      { name: 'ask-human', known: false },
    ]);
  });
});

describe('parseConductorTemplate — accepts id/purpose-only metadata (T7, closes AL-7)', () => {
  it('parses the real templates/conductor/sdd-conductor.md with only id and purpose', async () => {
    const { parseConductorTemplate } = await import('../src/templates.js');

    const conductorPath = path.join(REAL_TEMPLATES_ROOT, 'conductor', 'sdd-conductor.md');
    const source = await fs.readFile(conductorPath, 'utf8');

    const conductor = parseConductorTemplate(source, 'conductor/sdd-conductor.md');

    expect(conductor.metadata.id).toBe('sdd-conductor');
    expect(conductor.metadata.purpose.length).toBeGreaterThan(0);
    expect(conductor.body.length).toBeGreaterThan(0);
  });
});

describe('loadCanonicalTemplates — the real eleven-file tree (T8, T9)', () => {
  it('loads all five roles, the conductor, and the five spec-schema files from the real templates/ root', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(REAL_TEMPLATES_ROOT);

    expect(templates.roles.size).toBe(5);
    for (const id of [
      'sdd-architect',
      'sdd-test-writer',
      'sdd-executor',
      'sdd-auditor',
      'sdd-documentation',
    ] as const) {
      expect(templates.roles.has(id)).toBe(true);
    }
    expect(templates.conductor.metadata.id).toBe('sdd-conductor');
    expect(templates.specSchema).toHaveLength(5);
  });

  it('loads spec-schema templates byte-for-byte with no reformatting (guarantee 12)', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(REAL_TEMPLATES_ROOT);

    for (const schema of templates.specSchema) {
      const onDisk = await fs.readFile(
        path.join(REAL_TEMPLATES_ROOT, 'spec-schema', `${schema.name}.md`),
        'utf8',
      );
      expect(schema.contents).toBe(onDisk);
    }
  });

  it('raises a TEMPLATE error naming the resolved root and the missing file when a canonical file is absent', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const brokenRoot = fixtureTemplatesRoot('missing-file');

    try {
      await loadCanonicalTemplates(brokenRoot);
      expect.unreachable('expected loadCanonicalTemplates to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain(brokenRoot);
      expect(message).toContain('sdd-executor');
    }
  });

  it('raises a TEMPLATE error naming file and key when a role in the tree has a malformed metadata block', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');
    const { isHarnessError } = await import('../src/errors.js');

    const brokenRoot = fixtureTemplatesRoot('malformed-metadata');

    try {
      await loadCanonicalTemplates(brokenRoot);
      expect.unreachable('expected loadCanonicalTemplates to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('sdd-test-writer');
      expect(message).toContain('cost_rationale');
    }
  });
});

describe('authoring-commentary rule 9/10 — leading blockquote excluded, later blockquote preserved (AL-6, guarantee 23) (T5.15)', () => {
  it('excludes the real conductor\'s leading authoring blockquote from body and retains it verbatim on authoringNote (rule 9, 10)', async () => {
    const { parseConductorTemplate } = await import('../src/templates.js');

    const conductorPath = path.join(REAL_TEMPLATES_ROOT, 'conductor', 'sdd-conductor.md');
    const source = await fs.readFile(conductorPath, 'utf8');

    const conductor = parseConductorTemplate(source, 'conductor/sdd-conductor.md');

    expect(conductor.body).not.toContain('Canonical orchestration content');
    expect(conductor.body.startsWith('You are the **conductor**')).toBe(true);
    expect(conductor.authoringNote).toBeDefined();
    expect(conductor.authoringNote).toContain('Canonical orchestration content');
    expect(conductor.authoringNote!.split('\n').every((line) => line.startsWith('>'))).toBe(true);
  });

  it('excludes a leading blockquote from a role body too — rule 9 is general, not a conductor special case', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');

    const withLeadingBlockquote = ARCHITECT_SOURCE.replace(
      '## Role body\n\nBODY TEXT.\n',
      '## Role body\n\n> Maintainers: keep this section short.\n\nBODY TEXT.\n',
    );

    const template = parseRoleTemplate(withLeadingBlockquote, 'roles/sdd-architect.md');

    expect(template.body).toBe('BODY TEXT.');
    expect(template.authoringNote).toBe('> Maintainers: keep this section short.');
  });

  it('preserves a blockquote appearing later in a role body as ordinary content, not authoring commentary', async () => {
    const { parseRoleTemplate } = await import('../src/templates.js');

    const withLaterBlockquote = ARCHITECT_SOURCE.replace(
      '## Role body\n\nBODY TEXT.\n',
      '## Role body\n\nOpening line of the body.\n\n> This is ordinary quoted content inside the body.\n\nClosing line.\n',
    );

    const template = parseRoleTemplate(withLaterBlockquote, 'roles/sdd-architect.md');

    expect(template.authoringNote).toBeUndefined();
    expect(template.body).toContain('Opening line of the body.');
    expect(template.body).toContain('> This is ordinary quoted content inside the body.');
    expect(template.body).toContain('Closing line.');
  });
});

describe('resolveTemplatesRoot (C7)', () => {
  it('resolves to the real package templates/ directory independent of cwd', async () => {
    const { resolveTemplatesRoot } = await import('../src/templates.js');

    const resolved = path.normalize(resolveTemplatesRoot());
    expect(resolved).toBe(path.normalize(REAL_TEMPLATES_ROOT));

    const entries = await fs.readdir(resolved);
    // templates-skill-library-parity (SC1) adds a fourth top-level directory,
    // `skills/`, to the real package templates root. agent-feedback-controls
    // (Phase 1, contract.md "Canonical templates — templates/hooks/") adds a
    // fifth, `hooks/`, and Phase 2 (contract.md "templates/ci/harny-feedback.yml")
    // adds a sixth, `ci/`. readiness-doctor adds a seventh, `doctor/`, and an
    // eighth, `shared/`. context7-mcp adds a ninth, `mcp/`
    // (`templates/mcp/README.md`, documentation only, not scaffolded — SC20).
    expect(entries.sort()).toEqual([
      'ci',
      'conductor',
      'doctor',
      'hooks',
      'mcp',
      'permissions',
      'roles',
      'shared',
      'skills',
      'spec-schema',
    ]);
  });
});

describe('loadCanonicalTemplates — doctor/shared optional resources (readiness-doctor, BG-18, T23)', () => {
  it('loads doctorRunner, doctorReadme, and sharedProbes byte-for-byte from the real templates root', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
    const withDoctor = templates as unknown as {
      doctorRunner?: { name: string; contents: string; sourcePath: string };
      doctorReadme?: { name: string; contents: string; sourcePath: string };
      sharedProbes?: { name: string; contents: string; sourcePath: string };
    };

    expect(withDoctor.doctorRunner, 'CanonicalTemplates has no doctorRunner yet').toBeDefined();
    expect(withDoctor.doctorReadme, 'CanonicalTemplates has no doctorReadme yet').toBeDefined();
    expect(withDoctor.sharedProbes, 'CanonicalTemplates has no sharedProbes yet').toBeDefined();

    const onDiskRunner = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'doctor', 'run-doctor.mjs'), 'utf8');
    expect(withDoctor.doctorRunner?.contents).toBe(onDiskRunner);

    const onDiskReadme = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'doctor', 'README.md'), 'utf8');
    expect(withDoctor.doctorReadme?.contents).toBe(onDiskReadme);

    const onDiskProbes = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'shared', 'probes.mjs'), 'utf8');
    expect(withDoctor.sharedProbes?.contents).toBe(onDiskProbes);
  });

  it('tolerates a lean templates root that models neither templates/doctor/ nor templates/shared/', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
    const withDoctor = templates as unknown as {
      doctorRunner?: unknown;
      doctorReadme?: unknown;
      sharedProbes?: unknown;
    };

    expect(withDoctor.doctorRunner).toBeUndefined();
    expect(withDoctor.doctorReadme).toBeUndefined();
    expect(withDoctor.sharedProbes).toBeUndefined();
  });
});

describe('loadCanonicalTemplates — skill loading, sort order, and tolerated absence (Gu 9, Gu 12, Gu 18) (Task 4.26)', () => {
  it('loads exactly the eight skill directories present in the well-formed fixture, byte-for-byte', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));

    const skills = (templates as any).skills as Map<string, { files: Array<{ name: string; contents: string }> }>;
    expect(skills, 'CanonicalTemplates has no "skills" map yet').toBeDefined();
    // agent-feedback-controls (Task 3.10) adds `harny-feedback` to CORE_SKILL_IDS,
    // always scaffolded — the well-formed fixture gained a matching stub skill
    // directory so a default runInit over this fixture can still resolve it.
    // readiness-doctor adds `harny-doctor` the same way (8 -> 9).
    expect(skills.size).toBe(9);

    for (const id of [
      'harny-propose',
      'harny-test',
      'harny-implement',
      'harny-audit',
      'harny-document',
      'harny-sync',
      'harny-standards',
      'harny-feedback',
      'harny-doctor',
    ]) {
      expect(skills.has(id), `missing loaded skill "${id}"`).toBe(true);
      const onDisk = await fs.readFile(
        path.join(FIXTURES_TEMPLATES_ROOT, 'well-formed', 'skills', id, 'SKILL.md'),
        'utf8',
      );
      const loaded = skills.get(id)!.files.find((f) => f.name === 'SKILL.md');
      expect(loaded, `${id} has no loaded SKILL.md resource`).toBeDefined();
      expect(loaded!.contents).toBe(onDisk);
    }
  });

  it('tolerates a skill absent from templates/skills/ — harny-adr is not in the well-formed fixture, and no throw occurs', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
    const skills = (templates as any).skills as Map<string, unknown>;

    expect(skills.has('harny-adr')).toBe(false);
  });

  it('tolerates a templates/skills/ directory that does not exist at all (mutated-cost-tier fixture)', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('mutated-cost-tier'));
    const skills = (templates as any).skills as Map<string, unknown>;

    expect(skills).toBeDefined();
    expect(skills.size).toBe(0);
    expect((templates as any).skillsReadme).toBeUndefined();
  });

  it('sorts a skill\'s files by name, independent of filesystem enumeration order', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));
    const skills = (templates as any).skills as Map<string, { files: Array<{ name: string }> }>;

    const syncFiles = skills.get('harny-sync')!.files.map((f) => f.name);
    expect(syncFiles).toEqual(['SKILL.md', 'capability-template.md']);
  });

  it('loads templates/skills/README.md into skillsReadme when present, absent for the well-formed fixture (no README.md there)', async () => {
    const { loadCanonicalTemplates } = await import('../src/templates.js');

    const templates = await loadCanonicalTemplates(fixtureTemplatesRoot('well-formed'));

    expect((templates as any).skillsReadme).toBeUndefined();
  });

});

describe('fixture sanity (test-writer plumbing, not a contract item)', () => {
  it('the well-formed and mutated-cost-tier fixtures differ only in the architect cost_tier', async () => {
    const wellFormed = await fs.readFile(
      path.join(FIXTURES_TEMPLATES_ROOT, 'well-formed', 'roles', 'sdd-architect.md'),
      'utf8',
    );
    const mutated = await fs.readFile(
      path.join(FIXTURES_TEMPLATES_ROOT, 'mutated-cost-tier', 'roles', 'sdd-architect.md'),
      'utf8',
    );
    expect(wellFormed).toContain('cost_tier: most-capable');
    expect(mutated).toContain('cost_tier: cheapest');
  });
});
