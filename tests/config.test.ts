/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/config.ts" (G2, G8);
 * Behavior Guarantee 7 (tier defaults track canonical content);
 * Error Handling Contract rows for USAGE; C4; T10, T11, T12, T13, T14.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md Behavior Guarantees 14, 15, 16, 17; Error Handling
 * Contract rows for `--skills` and a config file's `skills` array; intent.md
 * SC11, SC12; roadmap.md Phase 4.8; tasks.md Tasks 4.18, 4.19, 4.20, 4.21.
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md § Interfaces "Public API — src/vocabulary.ts (MODIFIED)"
 * (`harny-feedback` appended to `CORE_SKILL_IDS`); Behavior Guarantee 15
 * (`harny-feedback` is core); intent.md SC9a; roadmap.md Phase 3.3;
 * tasks.md Tasks 3.1, 3.2.
 *
 * Red-phase note: `src/vocabulary.ts` has not yet gained `harny-feedback` (Task
 * 3.10, deferred to `harny-implement`), so every assertion below is expected to
 * fail against today's 6/2/8 CORE/OPTIONAL/SKILL_IDS counts and today's
 * "unknown skill id" `parseSkillList` message.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md § State Changes "Vocabulary" (`harny-doctor` appended
 * last to `CORE_SKILL_IDS`, after `harny-feedback`); Behavior Guarantee 12.
 *
 * Red-phase note (amendment): the two hardcoded counts and the
 * "last-in-core" assertion below are updated from 7/2/9 (`harny-feedback`
 * last) to 8/2/10 (`harny-doctor` last) — this is the exact "modified
 * existing test, fails until the amendment lands" case AGENTS.md S6
 * describes, not a new gap. `harny-feedback` remains core; it simply is no
 * longer the *last* core skill once `harny-doctor` is appended after it.
 *
 * ---
 * Spec: specs/monorepo-mode
 * Covers: contract.md "Public API — src/config.ts" (`ComponentSelection`,
 * `normalizeComponentPath`, `parseComponentAssignment`, `validateComponentList`);
 * § Data Models (`HarnessConfig.components`, `PartialHarnessConfig.components`,
 * `mergeConfig` step 3's drop-the-superseded-field rule, `serializeConfig` key
 * order); Behavior Guarantees MC-1, MC-4, MC-7, MC-8, MC-24; Error Handling
 * Contract rows for `stack`/`components` exclusivity, a malformed `--component`
 * assignment, an absolute/escaping component path, a duplicate normalized path,
 * and an empty `components` array; audit.md Test Coverage T3-T8.
 *
 * None of `ComponentSelection`, `normalizeComponentPath`,
 * `parseComponentAssignment`, or `validateComponentList` exist on
 * `src/config.ts` yet at red time, and `mergeConfig`/`serializeConfig` do not
 * handle a `components` field at all. Every describe block below is therefore
 * expected to fail either on "does not provide an export named …" (the four
 * new functions) or on a genuine behavioral mismatch (`mergeConfig` silently
 * ignoring `components` instead of merging or throwing; `serializeConfig`
 * never emitting a `components` key), not on a test-authoring bug.
 */
import { describe, expect, it } from 'vitest';
import { fixtureTemplatesRoot } from './helpers/paths.js';

async function loadTemplates(fixture: string) {
  const { loadCanonicalTemplates } = await import('../src/templates.js');
  return loadCanonicalTemplates(fixtureTemplatesRoot(fixture));
}

describe('defaultConfig — tiers derived from canonical cost_tier (guarantee 7, T10)', () => {
  it('reads every role\'s tier from its template\'s parsed costTier, matching the well-formed fixture', async () => {
    const { defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');

    const config = defaultConfig(templates);

    const tierById = Object.fromEntries(config.roles.map((r) => [r.id, r.tier]));
    expect(tierById).toEqual({
      'sdd-architect': 'most-capable',
      'sdd-test-writer': 'mid',
      'sdd-executor': 'mid',
      'sdd-auditor': 'most-capable',
      'sdd-documentation': 'cheapest',
    });
  });

  it('enables all five roles and all three gates by default', async () => {
    const { defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');

    const config = defaultConfig(templates);

    expect(config.roles.map((r) => r.id)).toHaveLength(5);
    expect(config.gates).toEqual(['post-specs', 'post-red-tests', 'post-audit']);
  });

  it('changes the computed default with no source change when the canonical cost_tier is mutated', async () => {
    const { defaultConfig } = await import('../src/config.js');

    const original = defaultConfig(await loadTemplates('well-formed'));
    const mutated = defaultConfig(await loadTemplates('mutated-cost-tier'));

    const originalArchitect = original.roles.find((r) => r.id === 'sdd-architect');
    const mutatedArchitect = mutated.roles.find((r) => r.id === 'sdd-architect');

    expect(originalArchitect?.tier).toBe('most-capable');
    expect(mutatedArchitect?.tier).toBe('cheapest');
  });
});

describe('validateConfig — USAGE rejections (T11)', () => {
  it('rejects an unknown tool id, naming the offending value and the valid set', async () => {
    const { validateConfig } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateConfig(
        {
          version: 1,
          tools: ['cursorr'],
          roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
          gates: [],
        },
        'test-fixture',
      );
      expect.unreachable('expected validateConfig to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('cursorr');
      expect(message).toContain('claude-code');
      expect(message).toContain('codex');
    }
  });

  it('rejects an empty tool selection', async () => {
    const { validateConfig } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateConfig(
        {
          version: 1,
          tools: [],
          roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
          gates: [],
        },
        'test-fixture',
      );
      expect.unreachable('expected validateConfig to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
    }
  });

  it('rejects an empty role selection', async () => {
    const { validateConfig } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateConfig(
        { version: 1, tools: ['claude-code'], roles: [], gates: [] },
        'test-fixture',
      );
      expect.unreachable('expected validateConfig to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
    }
  });

  it('rejects a wrong config version, naming the field and expectation', async () => {
    const { validateConfig, CONFIG_VERSION } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateConfig(
        {
          version: 999,
          tools: ['claude-code'],
          roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
          gates: [],
        },
        'test-fixture',
      );
      expect.unreachable('expected validateConfig to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      const message = (err as Error).message;
      expect(message).toContain('version');
      expect(message).toContain(String(CONFIG_VERSION));
    }
  });
});

describe('mergeConfig — right-biased, per-role-id merge (T12)', () => {
  /**
   * (Test-writer round 2 fix, task-writer note.) Rewritten onto the amended
   * `PartialHarnessConfig` shape: the superseded single `roles` field this test
   * used to exercise no longer exists — `roleOverrides` is the per-id-tweak
   * counterpart contract.md now specifies (roleIds carries membership only).
   * `mergeConfig` also gained a required third `templates` parameter. The
   * assertions (merge by id, unrelated roles untouched) are unchanged in
   * substance; only the shape driving them was updated.
   */
  it('merges role overrides by id rather than by array position, leaving unrelated roles untouched', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const merged = mergeConfig(
      base,
      {
        roleOverrides: [{ id: 'sdd-executor', tier: 'most-capable', modelOverride: 'literal-model-x' }],
      },
      templates,
    );

    const byId = Object.fromEntries(merged.roles.map((r) => [r.id, r]));
    expect(byId['sdd-executor'].tier).toBe('most-capable');
    expect(byId['sdd-executor'].modelOverride).toBe('literal-model-x');
    // Unrelated roles survive from base, unaffected by array position.
    expect(byId['sdd-architect'].tier).toBe('most-capable');
    expect(byId['sdd-test-writer'].tier).toBe('mid');
    expect(byId['sdd-auditor'].tier).toBe('most-capable');
    expect(byId['sdd-documentation'].tier).toBe('cheapest');
  });

  it('is right-biased for scalar-list fields such as tools and gates', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const merged = mergeConfig(base, { gates: ['post-audit'] }, templates);

    expect(merged.gates).toEqual(['post-audit']);
    expect(merged.tools).toEqual(['claude-code']);
  });
});

describe('serializeConfig / loadConfigFile round trip (T13)', () => {
  it('produces stable, deterministic JSON with one trailing newline', async () => {
    const { serializeConfig } = await import('../src/config.js');

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
      gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    };

    const first = serializeConfig(config as any);
    const second = serializeConfig(config as any);

    expect(first).toBe(second);
    expect(first.endsWith('\n')).toBe(true);
    expect(first.endsWith('\n\n')).toBe(false);
  });

  /**
   * (Test-writer round 2 fix.) `loadConfigFile`'s amended contract translates the
   * persisted `roles: RoleSelection[]` field into `roleIds` + `roleOverrides` (see
   * contract.md's doc comment on `loadConfigFile`) rather than returning a `roles`
   * field, which no longer exists on `PartialHarnessConfig`. The round-trip
   * guarantee this test protects is unchanged — every id, tier, and modelOverride
   * written by `serializeConfig` must reappear after `loadConfigFile` — only the
   * field names asserted against were updated to match the amendment.
   */
  it('round-trips tools/roles/gates/stack through loadConfigFile, translating persisted roles into roleIds + roleOverrides', async () => {
    const { serializeConfig, loadConfigFile } = await import('../src/config.js');

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [
        { id: 'sdd-architect' as const, tier: 'most-capable' as const },
        { id: 'sdd-executor' as const, tier: 'mid' as const, modelOverride: 'literal-model' },
      ],
      gates: ['post-specs'] as const,
      stack: 'node-typescript',
    };

    const serialized = serializeConfig(config as any);
    const parsed = loadConfigFile(serialized, 'harness.json');

    expect(parsed.tools).toEqual(['claude-code']);
    expect(parsed.gates).toEqual(['post-specs']);
    expect(parsed.stack).toBe('node-typescript');
    expect(parsed.roleIds).toEqual(['sdd-architect', 'sdd-executor']);
    expect(parsed.roleOverrides).toEqual([
      { id: 'sdd-architect', tier: 'most-capable' },
      { id: 'sdd-executor', tier: 'mid', modelOverride: 'literal-model' },
    ]);
  });

  it('raises USAGE with path and parse position on invalid JSON', async () => {
    const { loadConfigFile } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      loadConfigFile('{ not valid json', '/tmp/harness.json');
      expect.unreachable('expected loadConfigFile to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as Error).message).toContain('/tmp/harness.json');
    }
  });
});

describe('flag-list parsers (T14)', () => {
  it('parseToolList expands "all" to TOOL_IDS and rejects unknown ids', async () => {
    const { parseToolList } = await import('../src/config.js');
    const { TOOL_IDS } = await import('../src/vocabulary.js');
    const { isHarnessError } = await import('../src/errors.js');

    expect(parseToolList('all')).toEqual(TOOL_IDS);
    expect(parseToolList('claude-code,cursor')).toEqual(['claude-code', 'cursor']);

    try {
      parseToolList('claude-code,cursorr');
      expect.unreachable('expected parseToolList to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
    }
  });

  it('parseGateList supports "all" and "none"', async () => {
    const { parseGateList } = await import('../src/config.js');
    const { GATE_IDS } = await import('../src/vocabulary.js');

    expect(parseGateList('all')).toEqual(GATE_IDS);
    expect(parseGateList('none')).toEqual([]);
    expect(parseGateList('post-specs')).toEqual(['post-specs']);
  });

  it('parseModelAssignment distinguishes a cost-tier value from a literal model override', async () => {
    const { parseModelAssignment } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    expect(parseModelAssignment('sdd-executor=mid')).toEqual({
      role: 'sdd-executor',
      tier: 'mid',
    });
    expect(parseModelAssignment('sdd-executor=gpt-5-custom')).toEqual({
      role: 'sdd-executor',
      modelOverride: 'gpt-5-custom',
    });

    try {
      parseModelAssignment('sdd-executor-no-equals-sign');
      expect.unreachable('expected parseModelAssignment to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      expect((err as Error).message).toContain('sdd-executor-no-equals-sign');
    }
  });
});

describe('defaultConfig — skills default to CORE_SKILL_IDS + harny-standards (Gu 16, Task 4.20)', () => {
  it('a flagless default resolves to exactly the six core skills plus harny-standards, harny-adr absent', async () => {
    const { defaultConfig } = await import('../src/config.js');
    const { CORE_SKILL_IDS, DEFAULT_OPTIONAL_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');

    const config = defaultConfig(templates);

    expect(config.skills).toEqual([...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]);
    expect(config.skills).toContain('harny-standards');
    expect(config.skills).not.toContain('harny-adr');
  });
});

describe('parseSkillList — "all"/"none", unknown ids, and the always-on core set (Gu 15, Task 4.19)', () => {
  it('expands "all" to both optional ids and "none" to an empty array', async () => {
    const { parseSkillList } = await import('../src/config.js');
    const { OPTIONAL_SKILL_IDS } = await import('../src/vocabulary.js');

    expect(parseSkillList('all')).toEqual(OPTIONAL_SKILL_IDS);
    expect(parseSkillList('none')).toEqual([]);
  });

  it('parses a comma list of optional ids', async () => {
    const { parseSkillList } = await import('../src/config.js');

    expect(parseSkillList('harny-standards')).toEqual(['harny-standards']);
  });

  it('throws USAGE naming the valid optional ids for an unrecognized id', async () => {
    const { parseSkillList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      parseSkillList('harny-nonexistent');
      expect.unreachable('expected parseSkillList to throw');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
    }
  });

  it('throws USAGE naming the always-on core set when a core skill id is named, distinct from an unknown-id error', async () => {
    const { parseSkillList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      parseSkillList('harny-propose');
      expect.unreachable('expected parseSkillList to throw for a core skill id');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = (err as Error).message;
      expect(message).toContain('harny-propose');
      expect(message.toLowerCase()).toContain('always');
    }
  });
});

describe('the six core skills are never deselectable (Gu 14, Task 4.18)', () => {
  it('mergeConfig always re-adds every CORE_SKILL_IDS member, even when optionalSkillIds omits them all', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const merged = mergeConfig(base, { optionalSkillIds: [] }, templates);

    for (const coreId of CORE_SKILL_IDS) {
      expect(merged.skills, `${coreId} missing from merged.skills`).toContain(coreId);
    }
  });

  it('mergeConfig replaces only the optional portion, never dropping the core six, when optionalSkillIds is supplied', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const merged = mergeConfig(base, { optionalSkillIds: ['harny-adr'] }, templates);

    expect(merged.skills).toContain('harny-adr');
    expect(merged.skills).not.toContain('harny-standards');
    for (const coreId of CORE_SKILL_IDS) {
      expect(merged.skills).toContain(coreId);
    }
  });

  it("a config file's skills array naming a core id is accepted and normalized, never rejected (Error Handling Contract)", async () => {
    const { loadConfigFile, mergeConfig, defaultConfig } = await import('../src/config.js');
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');

    // A persisted config naming only some of the core ids plus one optional id;
    // loadConfigFile must not throw, and the merge must still yield every core id.
    const persisted = JSON.stringify({
      version: 1,
      tools: ['claude-code'],
      roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
      gates: [],
      skills: ['harny-propose', 'harny-standards'],
    });

    const parsed = loadConfigFile(persisted, 'harness.json');
    expect(parsed.optionalSkillIds).toEqual(['harny-standards']);

    const merged = mergeConfig(defaultConfig(templates), parsed, templates);
    for (const coreId of CORE_SKILL_IDS) {
      expect(merged.skills).toContain(coreId);
    }
    expect(merged.skills).toContain('harny-standards');
  });
});

describe('skills round-trip through serializeConfig / loadConfigFile / mergeConfig (Gu 17, Task 4.21)', () => {
  it('preserves the full skills array across a serialize -> load -> merge cycle', async () => {
    const { serializeConfig, loadConfigFile, mergeConfig, defaultConfig } = await import('../src/config.js');
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');

    const original = {
      ...defaultConfig(templates),
      skills: [...CORE_SKILL_IDS, 'harny-adr'] as any,
    };

    const serialized = serializeConfig(original as any);
    const parsed = loadConfigFile(serialized, 'harness.json');
    const merged = mergeConfig(defaultConfig(templates), parsed, templates);

    expect(merged.skills).toContain('harny-adr');
    for (const coreId of CORE_SKILL_IDS) {
      expect(merged.skills).toContain(coreId);
    }
  });

  it('a pre-feature config literal with no "skills" key resolves to the defaults at CONFIG_VERSION 1, without error', async () => {
    const { loadConfigFile, mergeConfig, defaultConfig, CONFIG_VERSION } = await import('../src/config.js');
    const { CORE_SKILL_IDS, DEFAULT_OPTIONAL_SKILL_IDS } = await import('../src/vocabulary.js');
    const templates = await loadTemplates('well-formed');

    // A literal config file exactly as a pre-feature harness.json would have
    // written it -- no "skills" key exists on disk at all.
    const preFeatureConfig = JSON.stringify({
      version: CONFIG_VERSION,
      tools: ['claude-code'],
      roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
    });

    const parsed = loadConfigFile(preFeatureConfig, 'harness.json');
    expect(parsed.optionalSkillIds).toBeUndefined();

    const merged = mergeConfig(defaultConfig(templates), parsed, templates);
    expect(merged.skills).toEqual([...CORE_SKILL_IDS, ...DEFAULT_OPTIONAL_SKILL_IDS]);
    expect(merged.version).toBe(1);
  });
});

describe('harny-feedback is core (Gu 15, SC9a) (agent-feedback-controls Task 3.1)', () => {
  it('CORE_SKILL_IDS contains harny-feedback, OPTIONAL_SKILL_IDS does not, and the three arrays hold the contracted counts', async () => {
    const { CORE_SKILL_IDS, OPTIONAL_SKILL_IDS, SKILL_IDS } = await import('../src/vocabulary.js');

    expect(CORE_SKILL_IDS).toContain('harny-feedback');
    expect(OPTIONAL_SKILL_IDS).not.toContain('harny-feedback');
    // (readiness-doctor amendment) 7/2/9 -> 8/2/10: harny-doctor is appended
    // last in CORE_SKILL_IDS, after harny-feedback.
    expect(CORE_SKILL_IDS).toHaveLength(8);
    expect(OPTIONAL_SKILL_IDS).toHaveLength(2);
    expect(SKILL_IDS).toHaveLength(10);
  });

  it('harny-feedback is the second-to-last entry of CORE_SKILL_IDS, immediately before harny-doctor (readiness-doctor amendment)', async () => {
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');

    expect(CORE_SKILL_IDS[CORE_SKILL_IDS.length - 2]).toBe('harny-feedback');
    expect(CORE_SKILL_IDS[CORE_SKILL_IDS.length - 1]).toBe('harny-doctor');
  });
});

describe('harny-feedback is always scaffolded, never nameable via --skills (Gu 15) (agent-feedback-controls Task 3.2)', () => {
  it('mergeConfig still includes harny-feedback in the merged skill set for "--skills none" (optionalSkillIds: [])', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const merged = mergeConfig(base, { optionalSkillIds: [] }, templates);

    expect(merged.skills).toContain('harny-feedback');
  });

  it('parseSkillList throws USAGE naming harny-feedback as always scaffolded when named directly, distinct from an unknown-id error', async () => {
    const { parseSkillList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      parseSkillList('harny-feedback');
      expect.unreachable('expected parseSkillList to throw for a core skill id');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = (err as Error).message;
      expect(message).toContain('harny-feedback');
      expect(message.toLowerCase()).toContain('always');
    }
  });
});

// ---------------------------------------------------------------------------
// specs/monorepo-mode
// ---------------------------------------------------------------------------

describe('normalizeComponentPath — the five-step rule plus containment rejections (MC-7, MC-8, T3)', () => {
  it.each([
    ['', '.'],
    ['.', '.'],
    ['./apps/web', 'apps/web'],
    ['apps/web/', 'apps/web'],
    ['apps//web', 'apps/web'],
    ['apps\\web', 'apps/web'],
  ])('normalizes %j to %j', async (raw, expected) => {
    const { normalizeComponentPath } = await import('../src/config.js');
    expect(normalizeComponentPath(raw, 'test-fixture')).toBe(expected);
  });

  it.each([['/abs/path'], ['C:/abs/path'], ['..'], ['../x'], ['apps/../../escape']])(
    'rejects %j as HarnessError USAGE naming the offending path',
    async (raw) => {
      const { normalizeComponentPath } = await import('../src/config.js');
      const { isHarnessError } = await import('../src/errors.js');

      try {
        normalizeComponentPath(raw, 'test-fixture');
        expect.unreachable(`expected normalizeComponentPath(${JSON.stringify(raw)}) to throw`);
      } catch (err) {
        expect(isHarnessError(err)).toBe(true);
        expect((err as any).code).toBe('USAGE');
      }
    },
  );
});

describe('validateComponentList — normalize, reject empty/duplicate, sort ascending (MC-7, T4)', () => {
  it('rejects an empty list naming that at least one component is required', async () => {
    const { validateComponentList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateComponentList([], 'test-fixture');
      expect.unreachable('expected validateComponentList to throw on an empty list');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
    }
  });

  it('rejects two entries whose normalized paths collide, naming the duplicate', async () => {
    const { validateComponentList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    try {
      validateComponentList(
        [{ path: 'apps/web' }, { path: './apps/web/' }],
        'test-fixture',
      );
      expect.unreachable('expected validateComponentList to throw on a duplicate normalized path');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      expect((err as Error).message).toContain('apps/web');
    }
  });

  it('normalizes and sorts entries ascending by path, independent of input order', async () => {
    const { validateComponentList } = await import('../src/config.js');

    const result = validateComponentList(
      [{ path: 'services/api', stack: 'python' }, { path: './apps/web/', stack: 'typescript' }, { path: '.' }],
      'test-fixture',
    );

    expect(result.map((c) => c.path)).toEqual(['.', 'apps/web', 'services/api']);
    expect(result.find((c) => c.path === 'apps/web')?.stack).toBe('typescript');
  });

  it('rejects a non-array components value, an entry that is not an object, and a non-string path', async () => {
    const { validateComponentList } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    for (const bad of ['not-an-array', ['a-string-entry'], [{ path: 42 }]]) {
      try {
        validateComponentList(bad, 'test-fixture');
        expect.unreachable(`expected validateComponentList(${JSON.stringify(bad)}) to throw`);
      } catch (err) {
        expect(isHarnessError(err)).toBe(true);
        expect((err as any).code).toBe('USAGE');
      }
    }
  });
});

describe('parseComponentAssignment — first-=-wins, empty stack accepted, malformed rejected (MC-24, T5)', () => {
  it('splits on the first "=" only, so a stack value may itself contain "="', async () => {
    const { parseComponentAssignment } = await import('../src/config.js');
    expect(parseComponentAssignment('apps/web=typescript')).toEqual({ path: 'apps/web', stack: 'typescript' });
    expect(parseComponentAssignment('apps/web=ty=pescript')).toEqual({ path: 'apps/web', stack: 'ty=pescript' });
  });

  it('an empty right-hand side yields a component with no stack — legal and inert', async () => {
    const { parseComponentAssignment } = await import('../src/config.js');
    const result = parseComponentAssignment('apps/web=');
    expect(result.path).toBe('apps/web');
    expect(result.stack).toBeUndefined();
  });

  it('throws USAGE for a missing "=" or an empty left-hand side', async () => {
    const { parseComponentAssignment } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');

    for (const bad of ['apps/web-no-equals', '=typescript']) {
      try {
        parseComponentAssignment(bad);
        expect.unreachable(`expected parseComponentAssignment(${JSON.stringify(bad)}) to throw`);
      } catch (err) {
        expect(isHarnessError(err)).toBe(true);
        expect((err as any).code).toBe('USAGE');
      }
    }
  });
});

describe('mergeConfig — stack/components mutual exclusivity from a single source (MC-1, T6)', () => {
  it('throws USAGE naming both fields when an .sdd/harness.json-shaped file declares both, translated through loadConfigFile', async () => {
    const { mergeConfig, defaultConfig, loadConfigFile } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const persisted = JSON.stringify({
      version: 1,
      tools: ['claude-code'],
      roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
      gates: [],
      stack: 'typescript',
      components: [{ path: 'apps/web', stack: 'typescript' }],
    });
    const fileConfig = loadConfigFile(persisted, '.sdd/harness.json');

    try {
      mergeConfig(base, fileConfig, templates);
      expect.unreachable('expected mergeConfig to throw for stack+components from one .sdd/harness.json');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = (err as Error).message;
      expect(message).toContain('stack');
      expect(message).toContain('components');
    }
  });

  it('throws USAGE naming both fields when a --config file declares both', async () => {
    const { mergeConfig, defaultConfig, loadConfigFile } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    const configFileContents = JSON.stringify({
      version: 1,
      stack: 'python',
      components: [{ path: '.', stack: 'python' }],
    });
    const fileConfig = loadConfigFile(configFileContents, '/tmp/harny-config.json');

    try {
      mergeConfig(base, fileConfig, templates);
      expect.unreachable('expected mergeConfig to throw for stack+components from one --config file');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
    }
  });

  it('throws USAGE naming both fields when a single flag invocation supplies both --stack and --component', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const { isHarnessError } = await import('../src/errors.js');
    const templates = await loadTemplates('well-formed');
    const base = defaultConfig(templates);

    // The shape cli.ts's buildOverrides would produce from one invocation of
    // `--stack typescript --component apps/web=typescript` — a single
    // PartialHarnessConfig carrying both fields non-empty.
    const overrides = { stack: 'typescript', components: [{ path: 'apps/web', stack: 'typescript' }] };

    try {
      mergeConfig(base, overrides as any, templates);
      expect.unreachable('expected mergeConfig to throw for stack+components from one flag invocation');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
    }
  });
});

describe('mergeConfig — an override replacing the shape answer drops the superseded field, never errors (MC-1, T7)', () => {
  it('an override supplying components drops a base stack, without throwing', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');
    const base = { ...defaultConfig(templates), stack: 'typescript' };

    const merged = mergeConfig(base, { components: [{ path: '.', stack: 'python' }] } as any, templates);

    expect((merged as any).components).toEqual([{ path: '.', stack: 'python' }]);
    expect(merged.stack).toBeUndefined();
  });

  it('an override supplying stack drops a base components list, without throwing', async () => {
    const { mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');
    const base = { ...defaultConfig(templates), components: [{ path: 'apps/web', stack: 'typescript' }] } as any;

    const merged = mergeConfig(base, { stack: 'python' }, templates);

    expect(merged.stack).toBe('python');
    expect((merged as any).components).toBeUndefined();
  });
});

describe('serializeConfig / loadConfigFile round-trip components (MC-4, MC-7, T8)', () => {
  it('appends components last, only when present, each entry serialized as {path} or {path, stack}', async () => {
    const { serializeConfig } = await import('../src/config.js');

    const config = {
      version: 1 as const,
      tools: ['claude-code'] as const,
      roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
      gates: [] as const,
      skills: [] as const,
      components: [{ path: '.', stack: 'python' }, { path: 'apps/web' }],
    };

    const serialized = serializeConfig(config as any);
    const parsed = JSON.parse(serialized);
    const keys = Object.keys(parsed);

    expect(keys[keys.length - 1]).toBe('components');
    expect(parsed.components).toEqual([{ path: '.', stack: 'python' }, { path: 'apps/web' }]);
  });

  it('a components-free config serializes with no "components" key at all — byte-identical to today (MC-4)', async () => {
    const { serializeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');

    const serialized = serializeConfig(defaultConfig(templates));

    expect(JSON.parse(serialized)).not.toHaveProperty('components');
    expect(serialized).not.toContain('"components"');
  });

  it('round-trips a declared components list through serializeConfig -> loadConfigFile -> mergeConfig -> serializeConfig, byte-identically', async () => {
    const { serializeConfig, loadConfigFile, mergeConfig, defaultConfig } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');

    const original = {
      ...defaultConfig(templates),
      stack: undefined,
      components: [{ path: '.', stack: 'python' }, { path: 'apps/web', stack: 'typescript' }],
    } as any;

    const firstSerialization = serializeConfig(original);
    // Guards against a vacuous round-trip: today, before this feature,
    // serializeConfig drops "components" entirely, so a naive round-trip would
    // pass trivially with an empty components set surviving at every step. This
    // assertion forces the round-trip to be over a REAL, non-empty components
    // array.
    expect(JSON.parse(firstSerialization).components).toEqual(original.components);

    const parsed = loadConfigFile(firstSerialization, 'harness.json');
    const merged = mergeConfig(defaultConfig(templates), parsed, templates);
    const secondSerialization = serializeConfig(merged);

    expect(secondSerialization).toBe(firstSerialization);
  });

  it('an existing .sdd/harness.json carrying only "stack" is never rewritten to a components form and never warned about (SC4)', async () => {
    const { serializeConfig, loadConfigFile, mergeConfig, defaultConfig, CONFIG_VERSION } = await import('../src/config.js');
    const templates = await loadTemplates('well-formed');

    const preFeatureConfig = JSON.stringify({
      version: CONFIG_VERSION,
      tools: ['claude-code'],
      roles: [{ id: 'sdd-architect', tier: 'most-capable' }],
      gates: ['post-specs', 'post-red-tests', 'post-audit'],
      stack: 'typescript',
    });

    const parsed = loadConfigFile(preFeatureConfig, 'harness.json');
    expect((parsed as any).components).toBeUndefined();

    const merged = mergeConfig(defaultConfig(templates), parsed, templates);
    expect((merged as any).components).toBeUndefined();
    expect(merged.stack).toBe('typescript');

    const reserialized = serializeConfig(merged);
    expect(reserialized).not.toContain('"components"');
  });
});
