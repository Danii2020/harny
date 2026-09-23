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
 * sdd-skill-library amendment round: T41's non-mutation check is now an absolute
 * assertion that filters out the 8 contracted `.claude/skills/harny-*` bridge
 * symlinks — see specs/sdd-skill-library/contract.md § Amendment A1 (AL-S3
 * correction: a before/after differential inside this describe block cannot
 * detect a mutation that is already present before the "before" snapshot is
 * taken, which is exactly the shape of a leaked file sitting in templates/).
 *
 * Guarantee 4's "no tier literal in src/" clause is NOT re-verified here by a
 * source-text grep: tests/config.test.ts's mutated-cost-tier fixture test
 * (T10) already proves it behaviorally — a hardcoded role->tier map would fail
 * that test outright, which a grep for the substring "most-capable" could
 * never catch reliably (vocabulary.ts and the Claude Code model-mapping table
 * legitimately contain those same strings for unrelated, contract-mandated
 * reasons). Per the high-value-tests rubric, the stronger behavioral test wins
 * and the grep is intentionally not duplicated.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md § Integration Points ("templates/mcp/README.md" — new
 * canonical content). `isContractedEntry` gains an eighth allowlisted class,
 * `templates/mcp/`, the same "new canonical content this feature introduces"
 * rationale as every prior class above — consequential test maintenance, not
 * part of context7-mcp's own approved 55-test red phase; see the executor's
 * final report.
 *
 * Spec: specs/dogfood-quick-fixes (item 2, G2)
 * Covers: contract.md GR-4, GR-5; intent.md SC8, SC9; roadmap.md Phase 2
 * steps 1-2; tasks.md Tasks 2.1, 2.2.
 *
 * `templates/roles/sdd-documentation.md` does not carry the "never commit or
 * push" bullet yet at red time (verified absent, repo-wide, before writing
 * these tests), so the two describe blocks below fail on a genuine missing
 * substring, not a wrong assumption about `renderRole`'s canonical-body
 * mechanism (already proven by the T40/Task-4.1 blocks above — no generator
 * change is needed for GR-5 to hold once the bullet lands in the template).
 * `isContractedEntry` above already allowlists
 * `templates/roles/sdd-documentation.md` by exact match (XC-4); this feature
 * adds no allowlist entry.
 *
 * ---
 * Spec: specs/ci-workflow-root
 * Covers: contract.md Behavior Guarantee DR-4 ("No runner changes...
 * `templates/doctor/run-doctor.mjs`, `templates/shared/probes.mjs`, and
 * `templates/hooks/run-feedback.mjs` are byte-unchanged by this feature");
 * intent.md SC13; audit.md Test Coverage T31. The golden copies under
 * `tests/fixtures/golden/ci-workflow-root/` were captured from this
 * repository's committed `templates/` tree before this feature's own
 * implementation phase, so this is a real regression guard, not a
 * self-referential comparison against the very file it protects.
 *
 * This describe block is expected to PASS already at red time — nothing has
 * touched these three files yet — and stays the live regression guard through
 * every later phase of this feature, the same documented posture the BG-7
 * gate in `tests/feedback.test.ts` and this file's own T13/T14/T16 blocks
 * above already use for their "declared regression guard" assertions.
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
  it('shows no git changes under templates/ or .claude/ other than the contracted harny-* bridge symlinks', async () => {
    // sdd-skill-library amendment round (contract.md § Amendment A1, corrected per
    // AL-S3): the original form here was an absolute `expect(stdout.trim()).toBe('')`
    // check, which conflated "no mutation occurred" with "no uncommitted state exists
    // at all" -- indistinguishable only because `.claude/` used to be entirely
    // gitignored. A first fix attempt replaced it with a before/after differential
    // taken back-to-back with no work in between, which the auditor proved can never
    // fail (AL-S3): a *persistent* leak -- e.g. a stray file already sitting in
    // templates/ before this test even starts -- is present identically in both
    // snapshots, so the two are always equal regardless of whether anything actually
    // mutated either directory. A differential structurally cannot catch a leak that
    // predates the test, which is exactly the shape of mutation this check exists to
    // catch (a prior `runInit` run, or any other process, leaving a file behind).
    //
    // The fix is an absolute assertion again, but one that explicitly filters out the
    // known-contracted state this feature's own contract says legitimately exists here
    // instead of asserting total emptiness: the 8 `.claude/skills/harny-*` bridge
    // symlinks (contract.md § Interfaces). `--untracked-files=all` is required so
    // `.claude/` is reported entry-by-entry rather than folded to a single `?? .claude/`
    // line, which would make every legitimate entry indistinguishable from a real leak.
    const { stdout } = await execFileAsync(
      'git',
      ['status', '--porcelain', '--untracked-files=all', '--', 'templates', '.claude'],
      { cwd: REPO_ROOT },
    );

    const CONTRACTED_BRIDGE_SYMLINKS = new Set(
      [
        'harny-propose',
        'harny-test',
        'harny-implement',
        'harny-audit',
        'harny-document',
        'harny-sync',
        'harny-adr',
        'harny-standards',
        // (agent-feedback-controls, Phase 3.) `harny-feedback`'s own tracked
        // relative symlink, the ninth bridge (contract.md § Interfaces, SL-2).
        'harny-feedback',
        // (readiness-doctor, Phase 5.) `harny-doctor`'s own tracked relative
        // symlink, the tenth bridge (contract.md § "Public API — the
        // harny-doctor skill", SC3).
        'harny-doctor',
      ].map((name) => `.claude/skills/${name}`),
    );

    // (templates-skill-library-parity amendment round.) Two more classes of
    // `templates/` change are now contracted and legitimate, alongside the
    // pre-existing bridge symlinks above: `templates/skills/**` is new
    // canonical content this feature introduces (Phase 1, intent.md SC1), and
    // `templates/roles/sdd-documentation.md` is the single sanctioned
    // canonical-body content change (contract.md S5, Amendment A1). Neither
    // is a mutation this check exists to catch.
    //
    // (agent-feedback-controls, Phase 1 amendment round.) A third class joins
    // the same way `templates/skills/**` did above: `templates/hooks/**` is new
    // canonical content this feature introduces (Phase 1, contract.md "Canonical
    // templates — templates/hooks/").
    //
    // (agent-feedback-controls, Phase 2 amendment round.) A fourth class joins:
    // `templates/ci/**` (contract.md "templates/ci/harny-feedback.yml (NEW)") now
    // exists as of this phase, so it is allowlisted here too — the same
    // "new canonical content this feature introduces" rationale as the other
    // three classes above, not a mutation this check exists to catch.
    //
    // (agent-feedback-controls, Phase 4 amendment round.) A fifth class joins:
    // `.claude/settings.json` is this repo's own generated, now-tracked hook config
    // (contract.md "`.gitignore` amendment (G5, SC13, SL-10)", Task 4.3) — a
    // one-time re-inclusion contracted by this feature, not a mutation. Note this
    // is a `.claude/` entry, not a `templates/` one, unlike the other four classes.
    //
    // (readiness-doctor amendment round.) A sixth and seventh class join the
    // same way `templates/hooks/**` and `templates/ci/**` did above:
    // `templates/doctor/**` (the canonical readiness runner + its behavior
    // doc) and `templates/shared/**` (the probe module both generated
    // runners import) are new canonical content this feature introduces
    // (contract.md "Public API — the canonical runner", "Public API —
    // templates/shared/probes.mjs").
    //
    // (context7-mcp amendment round.) An eighth class joins the same way:
    // `templates/mcp/**` (the tool-neutral Context7 MCP mechanism doc) is new
    // canonical content this feature introduces (contract.md § Integration
    // Points, "templates/mcp/README.md").
    const isContractedEntry = (relativePath: string): boolean =>
      CONTRACTED_BRIDGE_SYMLINKS.has(relativePath) ||
      relativePath.startsWith('templates/skills/') ||
      relativePath.startsWith('templates/hooks/') ||
      relativePath.startsWith('templates/ci/') ||
      relativePath.startsWith('templates/doctor/') ||
      relativePath.startsWith('templates/shared/') ||
      relativePath.startsWith('templates/mcp/') ||
      relativePath === 'templates/roles/sdd-documentation.md' ||
      relativePath === '.claude/settings.json';

    // (templates-skill-library-parity fix.) Each porcelain line is a fixed-width
    // `XY <path>` — the 2-char status can legitimately be a leading space (e.g.
    // ` M path` for "modified, not staged"). The previous `.trim()` here stripped
    // that leading space before the fixed `slice(3)`, silently truncating the
    // first three characters of `path` instead of the status prefix — a latent
    // bug that only ever manifested once this feature introduced the first
    // *modified* (not merely untracked) entry under `templates/`. Only trailing
    // `\r`/empty lines are stripped now; the status-prefix width is never
    // disturbed by trimming.
    const unexpectedEntries = stdout
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line.length > 0)
      .filter((line) => !isContractedEntry(line.slice(3)));

    expect(unexpectedEntries).toEqual([]);
  });
});

/**
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: roadmap.md Phase 4.1/4.2/4.3, tasks.md Task 4.1, 4.2, 4.3; contract.md
 * Behavior Guarantees 3, 8, 12.
 *
 * The blocks below are independent of the T40 block above: T40 compares
 * generated output against `template.body`, the **parser's own output** — which
 * is exactly the self-referential shape AL-6/AL-23 warn against (a defect in
 * `extractBody` would silently pass a fidelity check phrased that way). Every
 * assertion here instead slices the canonical body directly out of the raw file
 * with `fs.readFile`, via a from-scratch reimplementation of the slicing rule
 * that never calls `parseRoleTemplate` or `parseConductorTemplate`.
 */

/** Mirrors `trimBlankLines` in src/templates.ts, reimplemented independently
 *  for this non-self-referential check (never imported from src/). */
function trimBlankLinesIndependently(text: string): string {
  const lines = text.split('\n');
  let start = 0;
  let end = lines.length - 1;
  while (start <= end && lines[start].trim() === '') start++;
  while (end >= start && lines[end].trim() === '') end--;
  if (start > end) return '';
  return lines.slice(start, end + 1).join('\n');
}

/** Slices a role's canonical body straight out of the raw file text: everything
 *  after the "## Role body" heading line, with a leading authoring blockquote
 *  (if any) excluded, blank-line-trimmed. Independent of src/templates.ts. */
async function sliceRawRoleBody(roleId: string): Promise<string> {
  const raw = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'roles', `${roleId}.md`), 'utf8');
  const lines = raw.split('\n');
  const headingIndex = lines.findIndex((line) => /^##\s+Role body\s*$/.test(line));
  if (headingIndex === -1) {
    throw new Error(`fixture bug: ${roleId}.md has no "## Role body" heading`);
  }
  let i = headingIndex + 1;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^>/.test(lines[i])) {
    while (i < lines.length && /^>/.test(lines[i])) i++;
  }
  return trimBlankLinesIndependently(lines.slice(i).join('\n'));
}

/** Slices the conductor's canonical body straight out of the raw file text:
 *  everything after the metadata bullet list and a leading authoring
 *  blockquote (if any), blank-line-trimmed. Independent of src/templates.ts. */
async function sliceRawConductorBody(): Promise<string> {
  const raw = await fs.readFile(path.join(REAL_TEMPLATES_ROOT, 'conductor', 'sdd-conductor.md'), 'utf8');
  const lines = raw.split('\n');
  const metadataHeadingIndex = lines.findIndex((line) => /^##\s+(Role )?Metadata\s*$/.test(line));
  if (metadataHeadingIndex === -1) {
    throw new Error('fixture bug: sdd-conductor.md has no "## Metadata" heading');
  }
  let i = metadataHeadingIndex + 1;
  while (i < lines.length && (lines[i].trim() === '' || /^-\s+[a-z_]+:/.test(lines[i]))) i++;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length && /^>/.test(lines[i])) {
    while (i < lines.length && /^>/.test(lines[i])) i++;
  }
  return trimBlankLinesIndependently(lines.slice(i).join('\n'));
}

async function allGenerators() {
  const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');
  const { cursorGenerator } = await import('../src/generators/cursor.js');
  const { kiroGenerator } = await import('../src/generators/kiro.js');
  const { githubCopilotGenerator } = await import('../src/generators/github-copilot.js');
  const { codexGenerator } = await import('../src/generators/codex.js');
  return [claudeCodeGenerator, cursorGenerator, kiroGenerator, githubCopilotGenerator, codexGenerator];
}

const SAMPLE_PROJECT = {
  enabledRoles: [...ROLE_IDS],
  gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
  specSchemaDir: '.sdd/spec-schema',
  reducedGates: false,
};

describe('canonical fidelity across all five generators, verified non-self-referentially (guarantee 12; AL-6/AL-23) (Task 4.1)', () => {
  it('carries every role\'s raw-file-sliced canonical body byte-for-byte in each generator\'s output', async () => {
    const templates = await loadRealTemplates();
    const generators = await allGenerators();

    for (const generator of generators) {
      for (const roleId of ROLE_IDS) {
        const template = templates.roles.get(roleId)!;
        const rawBody = await sliceRawRoleBody(roleId);
        expect(rawBody.length).toBeGreaterThan(0);

        const generated = generator.renderRole({ template, tier: template.metadata.costTier });
        expect(
          generated.contents.includes(rawBody),
          `${generator.id}'s generated ${roleId} artifact does not contain the raw-file-sliced body`,
        ).toBe(true);
      }
    }
  });

  it('carries the raw-file-sliced conductor body byte-for-byte in each generator\'s output', async () => {
    const templates = await loadRealTemplates();
    const generators = await allGenerators();
    const rawConductorBody = await sliceRawConductorBody();
    expect(rawConductorBody.length).toBeGreaterThan(0);

    for (const generator of generators) {
      const generated = generator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });
      expect(
        generated.contents.includes(rawConductorBody),
        `${generator.id}'s generated conductor artifact does not contain the raw-file-sliced body`,
      ).toBe(true);
    }
  });

  it('the raw-file-sliced role body also equals the corresponding prefix of the decoded developer_instructions, for the fifth (Codex) generator', async () => {
    // Guarantee 4's second half, specific to Codex: the canonical body must
    // survive not merely as a raw-file substring of the .toml text (already
    // proven above), but also as the exact prefix of the *decoded*
    // developer_instructions string -- proving the TOML embedding neither
    // escapes nor re-indents it. Uses the test-local minimal decoder
    // (tests/helpers/toml-decode.ts), never a TOML package dependency.
    const { codexGenerator } = await import('../src/generators/codex.js');
    const { decodeToml } = await import('./helpers/toml-decode.js');
    const templates = await loadRealTemplates();

    for (const roleId of ROLE_IDS) {
      const template = templates.roles.get(roleId)!;
      const rawBody = await sliceRawRoleBody(roleId);
      expect(rawBody.length).toBeGreaterThan(0);

      const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });
      const decoded = decodeToml(generated.contents);

      expect(
        decoded.developer_instructions.startsWith(rawBody),
        `codex's decoded developer_instructions for ${roleId} does not start with the raw-file-sliced body`,
      ).toBe(true);
    }
  });

  it('the raw-file-sliced conductor body appears byte-for-byte inside the generated Codex SKILL.md (Markdown, not TOML)', async () => {
    const { codexGenerator } = await import('../src/generators/codex.js');
    const templates = await loadRealTemplates();
    const rawConductorBody = await sliceRawConductorBody();
    expect(rawConductorBody.length).toBeGreaterThan(0);

    const generated = codexGenerator.renderConductor({ template: templates.conductor, project: SAMPLE_PROJECT });
    expect(generated.contents.includes(rawConductorBody)).toBe(true);
  });
});

describe('no per-tool YAML machinery outside the shared module (guarantee 3) (Task 4.2)', () => {
  it('has no "---" literal, hand-rolled quoting routine or frontmatter serializer in any generator file other than markdown-yaml.ts', async () => {
    const generatorsDir = path.join(REPO_ROOT, 'src', 'generators');
    const entries = await fs.readdir(generatorsDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && e.name.endsWith('.ts') && e.name !== 'markdown-yaml.ts')
      .map((e) => e.name);

    // Every per-tool generator plus the interface file and the registry must be
    // present, so a future generator addition is automatically swept too.
    expect(files.length).toBeGreaterThanOrEqual(5);

    for (const file of files) {
      const contents = await fs.readFile(path.join(generatorsDir, file), 'utf8');
      const code = contents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

      expect(code.includes('---'), `${file} contains a "---" literal`).toBe(false);
      expect(
        /function\s+\w*[Qq]uote\w*\s*\(/.test(code) || /const\s+\w*[Qq]uote\w*\s*=/.test(code),
        `${file} defines its own quoting routine instead of reusing yamlQuote/yamlFlowSequence`,
      ).toBe(false);
      expect(
        /function\s+render[A-Z]\w*[Ff]rontmatter\w*\s*\(/.test(code),
        `${file} defines its own frontmatter serializer instead of reusing renderFrontmatter`,
      ).toBe(false);
    }
  });
});

describe('the AL-5 spec-schema pointer block reaches all 5 x 5 role artifacts (guarantee 8) (Task 4.3)', () => {
  it('names exactly SPEC_SCHEMA_DIR, inside the generated-block markers, for every role x generator pair', async () => {
    const { SPEC_SCHEMA_DIR } = await import('../src/engine.js');
    const { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END } = await import('../src/generators/markdown-yaml.js');
    const templates = await loadRealTemplates();
    const generators = await allGenerators();

    for (const generator of generators) {
      for (const roleId of ROLE_IDS) {
        const template = templates.roles.get(roleId)!;
        const generated = generator.renderRole({ template, tier: template.metadata.costTier });

        const beginIndex = generated.contents.indexOf(GENERATED_BLOCK_BEGIN);
        const endIndex = generated.contents.indexOf(GENERATED_BLOCK_END);
        expect(beginIndex, `${generator.id}/${roleId} is missing the generated-block begin marker`).toBeGreaterThan(-1);
        expect(endIndex, `${generator.id}/${roleId} is missing the generated-block end marker`).toBeGreaterThan(beginIndex);

        const block = generated.contents.slice(beginIndex, endIndex);
        expect(block, `${generator.id}/${roleId} pointer block does not name SPEC_SCHEMA_DIR`).toContain(
          SPEC_SCHEMA_DIR,
        );
      }
    }
  });
});

const NEVER_COMMIT_OR_PUSH = 'Never commit or push.';

describe('the "never commit or push" hard rule reaches all five generators\' sdd-documentation artifact, verbatim, with no generator change (GR-5) (dogfood-quick-fixes)', () => {
  it('is present in the generated sdd-documentation artifact for every one of the five generators', async () => {
    const templates = await loadRealTemplates();
    const generators = await allGenerators();
    const template = templates.roles.get('sdd-documentation')!;

    for (const generator of generators) {
      const generated = generator.renderRole({ template, tier: template.metadata.costTier });
      expect(
        generated.contents,
        `${generator.id}'s generated sdd-documentation artifact is missing the "never commit or push" rule`,
      ).toContain(NEVER_COMMIT_OR_PUSH);
    }
  });

  it('is present inside Codex\'s decoded developer_instructions string specifically, not merely somewhere in the raw .toml text', async () => {
    const { codexGenerator } = await import('../src/generators/codex.js');
    const { decodeToml } = await import('./helpers/toml-decode.js');
    const templates = await loadRealTemplates();
    const template = templates.roles.get('sdd-documentation')!;

    const generated = codexGenerator.renderRole({ template, tier: template.metadata.costTier });
    const decoded = decodeToml(generated.contents);

    expect(decoded.developer_instructions).toContain(NEVER_COMMIT_OR_PUSH);
  });
});

describe('the "never commit or push" hard rule reaches sdd-documentation only, never the other four roles (GR-4) (dogfood-quick-fixes)', () => {
  const OTHER_ROLE_IDS = ['sdd-architect', 'sdd-test-writer', 'sdd-executor', 'sdd-auditor'] as const;

  it('for every generator, the rule is present in the sdd-documentation artifact and absent from every other role\'s artifact', async () => {
    const templates = await loadRealTemplates();
    const generators = await allGenerators();

    for (const generator of generators) {
      const docTemplate = templates.roles.get('sdd-documentation')!;
      const docGenerated = generator.renderRole({ template: docTemplate, tier: docTemplate.metadata.costTier });
      expect(
        docGenerated.contents,
        `${generator.id}'s sdd-documentation artifact is missing the "never commit or push" rule`,
      ).toContain(NEVER_COMMIT_OR_PUSH);

      for (const roleId of OTHER_ROLE_IDS) {
        const template = templates.roles.get(roleId)!;
        const generated = generator.renderRole({ template, tier: template.metadata.costTier });
        expect(
          generated.contents,
          `${generator.id}'s ${roleId} artifact unexpectedly carries the sdd-documentation-only rule`,
        ).not.toContain(NEVER_COMMIT_OR_PUSH);
      }
    }
  });
});

/**
 * (Retired — templates-skill-library-parity post-audit fix, AL-P5/finding
 * "Recommendations".) A `codex-generator` regression test used to live here:
 * `describe('no regression: the four shipped generators, the shared
 * interface/Markdown layer, templates/, and every module outside
 * src/generators/ are byte-identical (guarantee 12) (Task 4.2)')`, asserting
 * `git status --porcelain` was empty for `templates/`, the four pre-Codex
 * generator files, and every `src/` module outside `src/generators/`.
 *
 * `contract.md` S1 narrows `tool-generators.md` TG-1's "no amendment" claim
 * and D3 mandates a new `skillsDir` member on the `Generator` interface and
 * on all five generator files; Phase 1 adds eleven files under `templates/`
 * and S5 edits `templates/roles/sdd-documentation.md`; Phase 3 modifies seven
 * modules outside `src/generators/`. Every one of those is contract-mandated
 * and every one falsified this test's assertions, so it could never pass
 * again once this feature landed and could never be un-skipped afterward —
 * `specs/archived/codex-generator/audit.md`'s own finding CG-7 already named
 * this test "a *this-feature* gate, not a standing regression test." See
 * `contract.md` § SUPERSEDES row S7 for the full retirement record.
 *
 * The guarantees it recorded that remain load-bearing are re-asserted
 * elsewhere and still run: canonical body fidelity (T40/T41 above), the five
 * pinned `skillsDir` values (`tests/generators/registry.test.ts`), and the
 * `.agents/skills/` / `templates/skills/` divergence fidelity
 * (`tests/skills-fidelity.test.ts`).
 */

describe('ci-workflow-root — the three generated-entry-point runner templates are byte-unchanged by this feature (DR-4) (T31)', () => {
  const RUNNER_TEMPLATES = [
    ['templates/doctor/run-doctor.mjs', 'run-doctor.mjs'],
    ['templates/shared/probes.mjs', 'probes.mjs'],
    ['templates/hooks/run-feedback.mjs', 'run-feedback.mjs'],
  ] as const;

  it.each(RUNNER_TEMPLATES)('%s is byte-identical to the golden captured before this feature', async (relativePath, goldenName) => {
    const live = await fs.readFile(path.join(REPO_ROOT, relativePath), 'utf8');
    const golden = await fs.readFile(
      path.join(REPO_ROOT, 'tests', 'fixtures', 'golden', 'ci-workflow-root', goldenName),
      'utf8',
    );
    expect(live).toBe(golden);
  });
});
