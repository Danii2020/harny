/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/generators/claude-code.ts and index.ts"
 * and "src/generators/types.ts" (G5); Behavior Guarantees 11, 18; C9, C13, C29;
 * T25, T26.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: contract.md "SUPERSEDES — src/generators/index.ts" (G10); Behavior
 * Guarantee 1; tasks.md Task 3.1; T20.
 *
 * Spec: specs/codex-generator
 * Covers: contract.md "SUPERSEDES — src/generators/index.ts" (G8), which itself
 * supersedes `cursor-kiro-copilot-generators`' guarantee 1; Behavior Guarantees
 * 1, 13; roadmap.md Phase 3; tasks.md Task 3.2. Supersedes this file's own
 * pre-feature assertion that `availableToolIds()` is exactly the four
 * Markdown-target ids and that `codex` "remains unimplemented after this
 * feature" — updated here, not merely loosened, per roadmap.md Phase 3.2. The
 * five-target interface-sufficiency evidence table below is retained
 * unchanged in shape: it exists to prove the `Generator` shape independently
 * of which tools are actually registered, and its `codex` row is now also
 * asserted against the real `codexGenerator`, promoting it from prediction to
 * regression test.
 *
 * Spec: specs/templates-skill-library-parity
 * Covers: contract.md "Public API — src/generators/types.ts" (the new
 * `skillsDir` member, D3) and its pinned-values table; Behavior Guarantees 2,
 * 29; intent.md SC16; roadmap.md Phase 4.5; tasks.md Task 4.27.
 */
import { describe, expect, it } from 'vitest';
// Type-only import: erased at runtime, so this does not require src/generators/types.ts
// to exist for this file's *other* tests to still fail for the right reason.
import type { CapabilityMapping, Generator, GeneratedFile, WrapperFormat } from '../../src/generators/types.js';

describe('generator registry (guarantee 1, 18) (T20, T25)', () => {
  it('resolves all five TOOL_IDS to a Generator: claude-code, cursor, kiro, github-copilot and codex', async () => {
    const { getGenerator } = await import('../../src/generators/index.js');

    expect(getGenerator('claude-code')).toBeDefined();
    expect(getGenerator('cursor')).toBeDefined();
    expect(getGenerator('kiro')).toBeDefined();
    expect(getGenerator('github-copilot')).toBeDefined();
    expect(getGenerator('codex')).toBeDefined();
  });

  it('availableToolIds() is exactly the five TOOL_IDS, in TOOL_IDS order (T20)', async () => {
    const { availableToolIds } = await import('../../src/generators/index.js');
    const { TOOL_IDS } = await import('../../src/vocabulary.js');

    expect(availableToolIds()).toEqual(['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']);
    expect(availableToolIds()).toEqual([...TOOL_IDS]);
  });
});

describe('every generator exposes skillsDir, matching the pinned values table exactly (Gu 2, Gu 29, D2) (Task 4.27)', () => {
  it('claude-code -> .claude/skills, cursor/github-copilot/codex -> .agents/skills, kiro -> .kiro/skills', async () => {
    const { claudeCodeGenerator } = await import('../../src/generators/claude-code.js');
    const { cursorGenerator } = await import('../../src/generators/cursor.js');
    const { kiroGenerator } = await import('../../src/generators/kiro.js');
    const { githubCopilotGenerator } = await import('../../src/generators/github-copilot.js');
    const { codexGenerator } = await import('../../src/generators/codex.js');

    expect((claudeCodeGenerator as any).skillsDir).toBe('.claude/skills');
    expect((cursorGenerator as any).skillsDir).toBe('.agents/skills');
    expect((kiroGenerator as any).skillsDir).toBe('.kiro/skills');
    expect((githubCopilotGenerator as any).skillsDir).toBe('.agents/skills');
    expect((codexGenerator as any).skillsDir).toBe('.agents/skills');
  });
});

describe('the real codexGenerator matches the interface-sufficiency evidence table\'s codex row (guarantee 1) (Task 3.2)', () => {
  it('has agentsDir .codex/agents, wrapperFormat toml, roleFileName sdd-architect.toml, and a conductorPath not under agentsDir', async () => {
    const { codexGenerator } = await import('../../src/generators/codex.js');

    expect(codexGenerator.agentsDir).toBe('.codex/agents');
    expect(codexGenerator.wrapperFormat).toBe('toml');
    expect(`${codexGenerator.agentsDir}/${codexGenerator.roleFileName('sdd-architect')}`).toBe(
      '.codex/agents/sdd-architect.toml',
    );
    expect(codexGenerator.conductorPath.startsWith(codexGenerator.agentsDir)).toBe(false);
  });
});

describe('Generator interface sufficiency for all five known targets (guarantee 11) (T26)', () => {
  /**
   * Minimal fake implementations of the `Generator` interface for all five
   * known targets, independent of which ones are actually registered. These
   * exist purely as compile-time- and runtime-checked evidence that the
   * interface accommodates every known target's facts from intent.md's
   * Constraints — they are not, and must not become, real generators. The
   * `codex` row is additionally cross-checked against the real
   * `codexGenerator` above, now that codex ships too.
   */
  function fakeGenerator(descriptor: {
    id: Generator['id'];
    agentsDir: string;
    conductorPath: string;
    wrapperFormat: WrapperFormat;
    skillsDir: string;
    extension: (roleId: string) => string;
  }): Generator {
    return {
      id: descriptor.id,
      displayName: `fake ${descriptor.id} generator (test evidence only)`,
      agentsDir: descriptor.agentsDir,
      wrapperFormat: descriptor.wrapperFormat,
      conductorPath: descriptor.conductorPath,
      skillsDir: descriptor.skillsDir,
      roleFileName: (roleId) => descriptor.extension(roleId),
      mapModel: (tier, override) => override ?? tier,
      mapCapabilities: (): CapabilityMapping => ({ tokens: [], notes: [] }),
      renderRole: (): GeneratedFile => ({ path: 'unused.md', contents: '\n' }),
      renderConductor: (): GeneratedFile => ({ path: 'unused.md', contents: '\n' }),
    } as Generator;
  }

  const expectedTargets: Array<{
    id: Generator['id'];
    agentsDir: string;
    wrapperFormat: WrapperFormat;
    expectedRolePath: string;
    skillsDir: string;
  }> = [
    {
      id: 'claude-code',
      agentsDir: '.claude/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.claude/agents/sdd-architect.md',
      skillsDir: '.claude/skills',
    },
    {
      id: 'cursor',
      agentsDir: '.cursor/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.cursor/agents/sdd-architect.md',
      skillsDir: '.agents/skills',
    },
    {
      id: 'kiro',
      agentsDir: '.kiro/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.kiro/agents/sdd-architect.md',
      skillsDir: '.kiro/skills',
    },
    {
      id: 'github-copilot',
      agentsDir: '.github/agents',
      wrapperFormat: 'markdown-yaml',
      expectedRolePath: '.github/agents/sdd-architect.agent.md',
      skillsDir: '.agents/skills',
    },
    {
      id: 'codex',
      agentsDir: '.codex/agents',
      wrapperFormat: 'toml',
      expectedRolePath: '.codex/agents/sdd-architect.toml',
      skillsDir: '.agents/skills',
    },
  ];

  it.each(expectedTargets)(
    'expresses $id\'s agentsDir/roleFileName/wrapperFormat/skillsDir exactly as fixed by contract.md Constraints',
    ({ id, agentsDir, wrapperFormat, expectedRolePath, skillsDir }) => {
      const generator = fakeGenerator({
        id,
        agentsDir,
        wrapperFormat,
        skillsDir,
        // conductorPath deliberately NOT derived from agentsDir, proving the two
        // are independent for every target, not only Claude Code.
        conductorPath: `.somewhere-else/${id}/sdd-conductor.${wrapperFormat === 'toml' ? 'toml' : 'md'}`,
        extension: (roleId) =>
          wrapperFormat === 'toml' ? `${roleId}.toml` : id === 'github-copilot' ? `${roleId}.agent.md` : `${roleId}.md`,
      });

      expect(`${generator.agentsDir}/${generator.roleFileName('sdd-architect')}`).toBe(expectedRolePath);
      expect(generator.wrapperFormat).toBe(wrapperFormat);
      expect(generator.conductorPath.startsWith(generator.agentsDir)).toBe(false);
      expect((generator as any).skillsDir).toBe(skillsDir);
    },
  );
});
