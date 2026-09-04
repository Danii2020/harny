/**
 * Spec: specs/codex-generator
 * Covers: contract.md "Public API — src/generators/codex.ts (NEW) (G1)" and its
 * normative mapping tables (`mapModel`, `mapCapabilities`, "Keys emitted on a
 * role artifact"); "Role artifact shape — normative"; "Conductor artifact shape
 * — normative"; Behavior Guarantees 2, 3, 6, 7, 8, 9, 10; roadmap.md Phase 2.1–
 * 2.5; tasks.md Task 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7; T6–T12.
 *
 * `src/generators/codex.ts` does not exist yet at red time — every test below
 * is expected to fail on module resolution or on a missing export, not on a
 * typo in this file.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROLE_IDS } from '../../src/vocabulary.js';
import { REAL_TEMPLATES_ROOT, REPO_ROOT } from '../helpers/paths.js';
import { decodeToml } from '../helpers/toml-decode.js';

async function loadRealTemplates() {
  const { loadCanonicalTemplates } = await import('../../src/templates.js');
  return loadCanonicalTemplates(REAL_TEMPLATES_ROOT);
}

describe('codexGenerator.mapModel (guarantee 10) (T6)', () => {
  it('maps each cost tier to the verified Codex model id', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    expect(codexGenerator.mapModel('most-capable')).toBe('gpt-5.6-sol');
    expect(codexGenerator.mapModel('mid')).toBe('gpt-5.6-terra');
    expect(codexGenerator.mapModel('cheapest')).toBe('gpt-5.6-luna');
  });

  it('returns a modelOverride verbatim and untranslated, even a retired id the user explicitly supplies', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    expect(codexGenerator.mapModel('mid', 'gpt-5.4-mini')).toBe('gpt-5.4-mini');
    expect(codexGenerator.mapModel('most-capable', 'custom-model-id')).toBe('custom-model-id');
  });
});

describe('the retiring gpt-5.4 model family appears nowhere in the Codex model table (guarantee 10, discrepancy D2) (T6)', () => {
  // Scoped to src/generators/codex.ts, NOT a repo-wide "under src/" sweep:
  // guarantee 10 pins this claim to "codex.ts declares ... and contains no
  // gpt-5.4 id" specifically. src/generators/cursor.ts already legitimately
  // contains "gpt-5.4-mini" as its own, separately-verified, already-shipped
  // `cheapest`-tier Cursor model id (specs/cursor-kiro-copilot-generators,
  // read-only per this feature's G9) -- an unscoped repo-wide grep for this
  // substring would permanently fail against that correct, out-of-scope file.
  it('contains no "gpt-5.4" substring in src/generators/codex.ts', async () => {
    const codexSourcePath = path.join(REPO_ROOT, 'src', 'generators', 'codex.ts');
    const contents = await fs.readFile(codexSourcePath, 'utf8');

    expect(contents.includes('gpt-5.4'), 'src/generators/codex.ts contains the retiring "gpt-5.4" model id').toBe(
      false,
    );
  });
});

describe('codexSandboxMode (guarantee 7) (T7)', () => {
  it('returns "read-only" for a synthetic capability set declaring neither write-files nor run-shell', async () => {
    const { codexSandboxMode } = await import('../../src/generators/codex.js');

    expect(
      codexSandboxMode([
        { name: 'read-files', known: true },
        { name: 'docs-lookup', known: true },
      ]),
    ).toBe('read-only');
  });

  it('returns undefined for an empty capability list', async () => {
    const { codexSandboxMode } = await import('../../src/generators/codex.js');

    expect(codexSandboxMode([])).toBeUndefined();
  });

  it('returns undefined for each of the five real roles (all declare write-files today)', async () => {
    const { codexSandboxMode } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      expect(codexSandboxMode(template.metadata.capabilities)).toBeUndefined();
    }
  });

  it('never returns "workspace-write", regardless of capability shape', async () => {
    const { codexSandboxMode } = await import('../../src/generators/codex.js');

    expect(codexSandboxMode([{ name: 'write-files', known: true }])).not.toBe('workspace-write');
    expect(codexSandboxMode([{ name: 'run-shell', known: true }])).not.toBe('workspace-write');
    expect(codexSandboxMode([{ name: 'read-files', known: true }])).not.toBe('workspace-write');
    expect(codexSandboxMode([])).not.toBe('workspace-write');
  });

  it('is false-y when write-files is scoped, not just when unscoped', async () => {
    const { codexSandboxMode } = await import('../../src/generators/codex.js');

    expect(codexSandboxMode([{ name: 'write-files', scope: 'audit.md only', known: true }])).toBeUndefined();
  });
});

describe('codexGenerator.mapCapabilities (guarantee 6) (T8)', () => {
  it('never emits a tool-allowlist token: tokens is always empty', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
    ]);

    expect(mapping.tokens).toEqual([]);
  });

  it('emits the Codex-specific advisory note for a known, unscoped capability', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([{ name: 'read-files', known: true }]);

    expect(mapping.notes).toContain(
      'read-files (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)',
    );
  });

  it('adds a scope note in addition to the advisory note for a scoped capability', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([
      { name: 'write-files', scope: 'audit.md only', known: true },
    ]);

    expect(mapping.notes).toContain(
      'write-files (no Codex tool-allowlist field; a subagent uses the tools available to the parent chat; advisory only)',
    );
    expect(mapping.notes).toContain('write-files is scoped to audit.md only');
  });

  it('surfaces an unknown capability token as "unmapped capability: <name>", never dropping it', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([{ name: 'ask-human', known: false }]);

    expect(mapping.notes).toContain('unmapped capability: ask-human');
  });

  it("the real sdd-auditor's write-files scope survives mapping as an 'audit.md only' note", async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const mapping = codexGenerator.mapCapabilities(auditorTemplate.metadata.capabilities);

    expect(mapping.notes.some((note) => note.includes('audit.md only'))).toBe(true);
  });

  it('adds exactly one harny-level note about sandbox_mode when the capability list is non-empty', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([
      { name: 'read-files', known: true },
      { name: 'write-files', known: true },
      { name: 'run-shell', known: true },
    ]);

    const sandboxNotes = mapping.notes.filter((note) => note.includes('sandbox_mode'));
    expect(sandboxNotes).toHaveLength(1);
  });

  it('emits no notes at all for an empty capability list (no adapter note either)', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    const mapping = codexGenerator.mapCapabilities([]);

    expect(mapping.notes).toEqual([]);
  });
});

describe('codexGenerator.renderRole (guarantees 2, 3, 15) (T9, T12)', () => {
  it('writes to .codex/agents/<role>.toml, comment header before the key/value lines, single trailing newline', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = codexGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.path).toBe('.codex/agents/sdd-auditor.toml');
    expect(generated.contents.startsWith('#')).toBe(true);

    const nameLineIndex = generated.contents.indexOf('\nname = "sdd-auditor"');
    expect(nameLineIndex).toBeGreaterThan(0); // must come after at least the comment header

    expect(generated.contents.endsWith('\n')).toBe(true);
    expect(generated.contents.endsWith('\n\n')).toBe(false);
  });

  it('renders provenance as a TOML "#" comment naming the source path, never an HTML comment', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = codexGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).toMatch(/^#.*generated by harny from templates\/roles\/sdd-auditor\.md/m);

    // Scoped to the comment header (everything before the first top-level
    // "name =" line), not the whole file: per contract.md guarantee 9 and its
    // "Illustrative output — Codex auditor role" example, the spec-schema
    // pointer block -- produced unchanged by the shared
    // renderSpecSchemaPointerBlock and using its existing HTML-comment-shaped
    // harny:begin/harny:end markers -- lands *inside* developer_instructions
    // for every role, including this one. An unscoped "no <!-- anywhere in
    // the file" assertion would contradict that mandated, illustrated shape.
    const nameIndex = generated.contents.indexOf('\nname =');
    const commentHeader = generated.contents.slice(0, nameIndex);
    expect(commentHeader).not.toContain('<!--');
  });

  it('parses as TOML and decodes to exactly the key set {name, description, model, developer_instructions} for all five real roles', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });

      const decoded = decodeToml(generated.contents);
      expect(Object.keys(decoded).sort()).toEqual(['description', 'developer_instructions', 'model', 'name']);
    }
  });

  it('decoded name/description/model equal the contract-specified values for every real role', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });
      const decoded = decodeToml(generated.contents);

      expect(decoded.name).toBe(template.metadata.id);
      expect(decoded.description).toBe(`${template.metadata.purpose} ${template.metadata.invocation}`);
      expect(decoded.model).toBe(codexGenerator.mapModel(template.metadata.costTier));
    }
  });

  it('omits the sandbox_mode key entirely for all five real roles (none is read-only today)', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });

      expect(generated.contents).not.toMatch(/^sandbox_mode/m);
    }
  });

  it('emits sandbox_mode = "read-only" for a synthetic read-only role', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const base = templates.roles.get('sdd-architect')!;
    const readonlyTemplate = {
      ...base,
      metadata: { ...base.metadata, capabilities: [{ name: 'read-files', known: true }] },
    };

    const generated = codexGenerator.renderRole({ template: readonlyTemplate, tier: 'most-capable' });

    expect(generated.contents).toMatch(/^sandbox_mode = "read-only"$/m);
  });

  it('honors a modelOverride verbatim in the rendered model key', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const executorTemplate = templates.roles.get('sdd-executor')!;

    const generated = codexGenerator.renderRole({
      template: executorTemplate,
      tier: 'mid',
      modelOverride: 'gpt-5.4-mini',
    });
    const decoded = decodeToml(generated.contents);

    expect(decoded.model).toBe('gpt-5.4-mini');
    expect(generated.contents).not.toContain('gpt-5.6-terra');
  });

  it('never emits a hand-written "sandbox_mode = \\"workspace-write\\"" line', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });
      expect(generated.contents).not.toContain('workspace-write');
    }
  });
});

describe("the auditor's audit.md-only scope reaches the generated Codex artifact (guarantee 6) (T9)", () => {
  it('preserves "audit.md only" as a comment in the rendered auditor role file', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const auditorTemplate = templates.roles.get('sdd-auditor')!;

    const generated = codexGenerator.renderRole({ template: auditorTemplate, tier: 'most-capable' });

    expect(generated.contents).toContain('audit.md only');
  });

  it('renders "unmapped capability: <name>" for a synthetic role carrying an unknown capability token', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const base = templates.roles.get('sdd-architect')!;
    const withUnknownCapability = {
      ...base,
      metadata: { ...base.metadata, capabilities: [{ name: 'ask-human', known: false }] },
    };

    const generated = codexGenerator.renderRole({ template: withUnknownCapability, tier: 'most-capable' });

    expect(generated.contents).toContain('unmapped capability: ask-human');
  });
});

describe('the spec-schema pointer block lives inside developer_instructions, not a TOML comment (guarantee 9) (T10)', () => {
  it("decodes the harny:begin/harny:end pointer block out of developer_instructions, naming SPEC_SCHEMA_DIR from src/engine.ts", async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = codexGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });
    const decoded = decodeToml(generated.contents);

    expect(decoded.developer_instructions).toContain(GENERATED_BLOCK_BEGIN);
    expect(decoded.developer_instructions).toContain(GENERATED_BLOCK_END);
    expect(decoded.developer_instructions).toContain(SPEC_SCHEMA_DIR);
  });

  it('does NOT carry the pointer block in the comment header — a comment would satisfy a substring grep while being invisible to the model', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');
    const { GENERATED_BLOCK_BEGIN } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = codexGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });

    // The comment header is everything before the first top-level "name ="
    // key/value line -- the channel the model never reads.
    const nameIndex = generated.contents.indexOf('\nname =');
    expect(nameIndex).toBeGreaterThan(0);
    const commentHeader = generated.contents.slice(0, nameIndex);

    expect(commentHeader).not.toContain(GENERATED_BLOCK_BEGIN);
    expect(commentHeader).not.toContain(SPEC_SCHEMA_DIR);
  });

  it("the pointer block's directory equals SPEC_SCHEMA_DIR imported from src/engine.ts, not a literal duplicated in codex.ts", async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const { SPEC_SCHEMA_DIR } = await import('../../src/engine.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = codexGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });
    const decoded = decodeToml(generated.contents);

    expect(SPEC_SCHEMA_DIR).toBe('.sdd/spec-schema');
    expect(decoded.developer_instructions).toContain(`\`${SPEC_SCHEMA_DIR}\``);
  });
});

describe('codexGenerator.renderConductor (guarantee 8) (T11)', () => {
  const SAMPLE_PROJECT = {
    enabledRoles: ['sdd-architect', 'sdd-executor'] as const,
    gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    specSchemaDir: '.sdd/spec-schema',
    reducedGates: false,
  };

  it('writes to .agents/skills/sdd-conductor/SKILL.md as Markdown+YAML, not TOML', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    const generated = codexGenerator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });

    expect(generated.path).toBe('.agents/skills/sdd-conductor/SKILL.md');
    expect(generated.contents.startsWith('---\n')).toBe(true);
    expect(generated.contents).not.toContain("'''");
  });

  it('emits frontmatter with exactly name and description, derived from ConductorMetadata id/purpose (AL-7)', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    // The real ConductorMetadata type carries only id/purpose; this proves
    // renderConductor succeeds against it without reaching for a field the
    // type does not have (costTier/capabilities/invocation/handoff).
    expect(Object.keys(templates.conductor.metadata).sort()).toEqual(['id', 'purpose']);

    const generated = codexGenerator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });

    expect(generated.contents).toContain('name: "sdd-conductor"');
  });

  it('discloses both harny-note caveats about .agents/skills/ inside the generated artifact', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    const generated = codexGenerator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });

    expect(generated.contents).toContain(
      'Codex discovers repo skills under .agents/skills/ (not .codex/skills/). Start the pipeline with $sdd-conductor, or run /skills to confirm Codex has loaded it; restart Codex after this file is first written.',
    );
    expect(generated.contents).toContain(
      '.agents/skills/ is a shared, tool-neutral directory — unlike .claude/, .cursor/, .kiro/ and .github/, it is not namespaced to one tool. Another agent tool that adopts the same convention will read this file too.',
    );
  });

  it('places the project-config block after the canonical conductor body', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import('../../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();

    const generated = codexGenerator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });

    const bodyIndex = generated.contents.indexOf(templates.conductor.body);
    const blockBeginIndex = generated.contents.indexOf(GENERATED_BLOCK_BEGIN);

    expect(bodyIndex).toBeGreaterThan(-1);
    expect(blockBeginIndex).toBeGreaterThan(bodyIndex);
    expect(generated.contents).toContain(GENERATED_BLOCK_END);
    expect(generated.contents.endsWith('\n')).toBe(true);
  });

  it('renders successfully against the real templates/conductor/sdd-conductor.md with a reduced-gates project', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    const generated = codexGenerator.renderConductor({
      template: templates.conductor,
      project: { enabledRoles: [], gates: [], specSchemaDir: '.sdd/spec-schema', reducedGates: true },
    });

    expect(generated.path).toBe('.agents/skills/sdd-conductor/SKILL.md');
    expect(generated.contents).toContain('name: "sdd-conductor"');
  });
});

describe('decoded-value correctness for every generated role artifact (guarantee 3) (T12)', () => {
  it('carries the raw canonical body byte-for-byte as a prefix of the decoded developer_instructions, for all five real roles', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });
      const decoded = decodeToml(generated.contents);

      expect(decoded.developer_instructions.startsWith(template.body)).toBe(true);
    }
  });

  it('decodes developer_instructions ending in a trailing newline, per the literal-string decode rule', async () => {
    // Not asserting the exact newline *count* here: contract.md's decode
    // semantics guarantee the decoded string ends in `\n` (the mechanical
    // '''\n<value>\n''' -> value + "\n" rule), but whether the embedded
    // pointer block itself already ends in `\n` before that rule applies is
    // an implementation-internal assembly detail, not a pinned contract fact.
    const { codexGenerator } = await import('../../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const architectTemplate = templates.roles.get('sdd-architect')!;

    const generated = codexGenerator.renderRole({ template: architectTemplate, tier: 'most-capable' });
    const decoded = decodeToml(generated.contents);

    expect(decoded.developer_instructions.endsWith('\n')).toBe(true);
  });
});

describe('no TOML syntax literal outside toml.ts (guarantee 5) (Task 2.10)', () => {
  it('src/generators/codex.ts contains no \'\'\', no """, no hand-written "key = value" line, and no #-comment serializer', async () => {
    const codexSourcePath = path.join(REPO_ROOT, 'src', 'generators', 'codex.ts');
    const contents = await fs.readFile(codexSourcePath, 'utf8');
    const code = contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

    expect(code.includes("'''"), 'codex.ts contains a TOML multi-line literal-string delimiter').toBe(false);
    expect(code.includes('"""'), 'codex.ts contains a TOML multi-line basic-string delimiter').toBe(false);

    // No hand-written "key = value" TOML line assembled as a string/template
    // literal -- as opposed to TypeScript's own "=" assignment operator,
    // which never appears inside a quote/backtick.
    const stringAndTemplateLiterals = code.match(/`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g) ?? [];
    for (const literal of stringAndTemplateLiterals) {
      expect(
        /^[`"']\s*\$?\{?[A-Za-z0-9_.]*\}?\s*=\s*/.test(literal),
        `codex.ts contains a hand-written "key = value" TOML line: ${literal}`,
      ).toBe(false);
    }

    // No hand-rolled "#"-comment serializer: a function that assembles its
    // own "# "-prefixed lines instead of calling the shared renderTomlComments.
    expect(
      /function\s+\w*[Cc]omment\w*\s*\(/.test(code) || /const\s+\w*[Cc]omment\w*\s*=\s*\(/.test(code),
      'codex.ts defines its own comment-line serializer instead of reusing renderTomlComments',
    ).toBe(false);
    expect(
      code.includes('renderTomlComments'),
      'codex.ts must render comments via the shared renderTomlComments',
    ).toBe(true);
    expect(
      code.includes('renderTomlKeyValues'),
      'codex.ts must render key/value lines via the shared renderTomlKeyValues',
    ).toBe(true);
  });
});
