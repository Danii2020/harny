/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/claude-code.ts and index.ts"
 * and "src/generators/types.ts" (G5); Behavior Guarantees 11, 18; C9, C13, C29;
 * T25, T26.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "SUPERSEDES — src/generators/index.ts" (G10); Behavior
 * Guarantee 1; tasks.md Task 3.1; T20. Supersedes this file's own pre-feature
 * assertion that `availableToolIds()` is exactly `['claude-code']` — updated
 * here, not merely loosened, per roadmap.md Phase 3.2. The five-target
 * interface-sufficiency evidence table below is retained unchanged: it
 * exists to prove the `Generator` shape independently of which tools are
 * actually registered, and it still covers `codex`, which remains
 * unimplemented after this feature.
 */
import { describe, expect, it } from 'vitest';
// Type-only import: erased at runtime, so this does not require src/generators/types.ts
// to exist for this file's *other* tests to still fail for the right reason.
import type { CapabilityMapping, Generator, GeneratedFile, WrapperFormat } from '../../src/generators/types.js';

describe('generator registry (guarantee 1, 18) (T20, T25)', () => {
  it('resolves claude-code, cursor, kiro and github-copilot; codex remains the only tool with no generator', async () => {
    const { getGenerator } = await import('../../src/generators/index.js');

    expect(getGenerator('claude-code')).toBeDefined();
    expect(getGenerator('cursor')).toBeDefined();
    expect(getGenerator('kiro')).toBeDefined();
    expect(getGenerator('github-copilot')).toBeDefined();
    expect(getGenerator('codex')).toBeUndefined();
  });

  it('availableToolIds() is exactly the four shipped ids, in TOOL_IDS order (T20)', async () => {
    const { availableToolIds } = await import('../../src/generators/index.js');
    expect(availableToolIds()).toEqual(['claude-code', 'cursor', 'kiro', 'github-copilot']);
  });
});

describe('Generator interface sufficiency for all five known targets (guarantee 11) (T26)', () => {
  /**
   * Minimal fake implementations of the `Generator` interface for the four
   * targets that do NOT ship in this feature. These exist purely as
   * compile-time- and runtime-checked evidence that the interface accommodates
   * every known target's facts from intent.md's Constraints — they are not,
   * and must not become, real generators (that would violate the single
   * reference-generator non-goal, separately enforced by the registry test above).
   */
  function fakeGenerator(descriptor: {
    id: Generator['id'];
    agentsDir: string;
    conductorPath: string;
    wrapperFormat: WrapperFormat;
    extension: (roleId: string) => string;
  }): Generator {
    return {
      id: descriptor.id,
      displayName: `fake ${descriptor.id} generator (test evidence only)`,
      agentsDir: descriptor.agentsDir,
      wrapperFormat: descriptor.wrapperFormat,
      conductorPath: descriptor.conductorPath,
      roleFileName: (roleId) => descriptor.extension(roleId),
      mapModel: (tier, override) => override ?? tier,
      mapCapabilities: (): CapabilityMapping => ({ tokens: [], notes: [] }),
      renderRole: (): GeneratedFile => ({ path: 'unused.md', contents: '\n' }),
      renderConductor: (): GeneratedFile => ({ path: 'unused.md', contents: '\n' }),
    };
  }

  const expectedTargets: Array<{
    id: Generator['id'];
    agentsDir: string;
    wrapperFormat: WrapperFormat;
    expectedRolePath: string;
  }> = [
    {
      id: 'claude-code',
      agentsDir: '.claude/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.claude/agents/sdd-architect.md',
    },
    {
      id: 'cursor',
      agentsDir: '.cursor/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.cursor/agents/sdd-architect.md',
    },
    {
      id: 'kiro',
      agentsDir: '.kiro/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.kiro/agents/sdd-architect.md',
    },
    {
      id: 'github-copilot',
      agentsDir: '.github/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.github/agents/sdd-architect.agent.md',
    },
    {
      id: 'codex',
      agentsDir: '.codex/agents',
      wrapperFormat: 'toml',
      expectedRolePath: '.codex/agents/sdd-architect.toml',
    },
  ];

  it.each(expectedTargets)(
    'expresses $id\'s agentsDir/roleFileName/wrapperFormat exactly as fixed by intent.md Constraints',
    ({ id, agentsDir, wrapperFormat, expectedRolePath }) => {
      const generator = fakeGenerator({
        id,
        agentsDir,
        wrapperFormat,
        // conductorPath deliberately NOT derived from agentsDir, proving the two
        // are independent for every target, not only Claude Code.
        conductorPath: `.somewhere-else/${id}/sdd-conductor.${wrapperFormat === 'toml' ? 'toml' : 'md'}`,
        extension: (roleId) =>
          wrapperFormat === 'toml' ? `${roleId}.toml` : id === 'github-copilot' ? `${roleId}.agent.md` : `${roleId}.md`,
      });

      expect(`${generator.agentsDir}/${generator.roleFileName('sdd-architect')}`).toBe(expectedRolePath);
      expect(generator.wrapperFormat).toBe(wrapperFormat);
      expect(generator.conductorPath.startsWith(generator.agentsDir)).toBe(false);
    },
  );
});
