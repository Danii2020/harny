/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/config.ts" (G2, G8);
 * Behavior Guarantee 7 (tier defaults track canonical content);
 * Error Handling Contract rows for USAGE; C4; T10, T11, T12, T13, T14.
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
