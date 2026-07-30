/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/claude-code.ts and index.ts"
 * and "src/generators/types.ts" (G5); Behavior Guarantees 11, 18; C9, C13, C29;
 * T25, T26.
 */
import { describe, expect, it } from 'vitest';
// Type-only import: erased at runtime, so this does not require src/generators/types.ts
// to exist for this file's *other* tests to still fail for the right reason.
import type { CapabilityMapping, Generator, GeneratedFile, WrapperFormat } from '../../src/generators/types.js';

describe('generator registry (guarantee 18) (T25)', () => {
  it('resolves claude-code and reports the four unimplemented tools as absent', async () => {
    const { getGenerator } = await import('../../src/generators/index.js');

    expect(getGenerator('claude-code')).toBeDefined();
    expect(getGenerator('cursor')).toBeUndefined();
    expect(getGenerator('kiro')).toBeUndefined();
    expect(getGenerator('github-copilot')).toBeUndefined();
    expect(getGenerator('codex')).toBeUndefined();
  });

  it('availableToolIds() is exactly ["claude-code"], enforcing the single-reference-generator non-goal', async () => {
    const { availableToolIds } = await import('../../src/generators/index.js');
    expect(availableToolIds()).toEqual(['claude-code']);
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
