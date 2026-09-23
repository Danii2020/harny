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
 *
 * Spec: specs/agent-feedback-controls
 * Covers: contract.md "Public API — src/generators/types.ts (MODIFIED)" (the new
 * `hooksPath`/`renderHook` members); roadmap.md Phase 2 step 3 ("guard the stubs so
 * they cannot silently persist" — the AL-P9 silent-stub class: a ninth thing never
 * shipped, with no test detecting it at authorship time); tasks.md Task 2.3; T10.
 * `renderHook`/`hooksPath` do not exist on any generator yet at red time, so every
 * test in the block below is expected to fail with a `TypeError`
 * ("generator.renderHook is not a function") or a `hooksPath` of `undefined`, not a
 * wrong assumption about which generators emit hooks.
 *
 * Spec: specs/agent-feedback-controls (Phase 6)
 * Covers: contract.md § Verified per-tool facts V1 (all five tools' hook paths/
 * wrapper shapes are now fixed and real); tasks.md Task 6.2 ("flip the guard set to
 * assert all five generator ids emit hooks"); roadmap.md Phase 6.5. Supersedes this
 * file's own Phase-2 assertion that only `claude-code` emits a hook artifact — at
 * red time here, `cursor`/`kiro`/`github-copilot`/`codex`'s `renderHook` are still
 * the documented Phase 2 stubs returning `undefined` (Task 2.11), so the first test
 * below is expected to fail on the four now-required `toBeDefined()` assertions,
 * not on a wrong assumption about which ids ship hooks.
 *
 * Spec: specs/agent-feedback-controls (Post-audit amendment A1)
 * Covers: contract.md Behavior Guarantee 20 (CI never touches turn state / no
 * generated hook config passes `--whole-project`), CI-only half. See the
 * dedicated `it` at the end of the "hook-emitting generator set" describe block
 * below for its own red-phase note.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md "Public API — src/generators/types.ts" (the new,
 * required `Generator.mcpConfig` member) and § "Verified per-tool MCP facts"
 * (the normative per-tool path/rootKey/entry table); Behavior Guarantees MC-2,
 * MC-13; intent.md SC13, SC15, SC17; audit.md Test Coverage T12.
 *
 * None of the five generators declares `mcpConfig` yet at red time, so every
 * assertion in the new "mcpConfig" describe block below reads `undefined`
 * where the table expects a real value, not a wrong assumption about the
 * per-tool facts themselves.
 *
 * Spec: specs/dogfood-quick-fixes (item 1, G1)
 * Covers: contract.md MO-3; intent.md SC3; roadmap.md Phase 1 step 3;
 * tasks.md Task 1.5.
 *
 * The "mcpConfig — every generator declares the required member" `it.each`
 * block's five expected `entry.url` values now name the new
 * `https://mcp.context7.com/mcp/oauth` endpoint. Each generator's real
 * `mcpConfig.entry` still carries the pre-departure value (imported straight
 * from `src/mcp.ts`'s still-unchanged `CONTEXT7_MCP_URL`), so all five
 * `it.each` cases fail on a genuine value mismatch, not a missing member.
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

describe('hook-emitting generator set — guards the AL-P9 silent-stub class (Task 2.3, Task 6.2)', () => {
  // Flipped to all five TOOL_IDS: Phase 6 ships the remaining four generators' real
  // `renderHook` implementations (roadmap.md Phase 6.5, tasks.md Task 6.2). A
  // forgotten stub among cursor/kiro/github-copilot/codex must fail this test, not
  // ship quiet.
  const HOOK_EMITTING_GENERATOR_IDS: readonly string[] = [
    'claude-code',
    'cursor',
    'kiro',
    'github-copilot',
    'codex',
  ];

  function fakeHookPayload(profile: unknown) {
    return {
      project: {
        enabledRoles: [],
        gates: [],
        specSchemaDir: '.sdd/spec-schema',
        reducedGates: false,
        stack: (profile as { id?: string } | undefined)?.id,
        stackProfile: profile,
      },
      profile,
      runner: { name: 'run-feedback.mjs', contents: '#!/usr/bin/env node\n', sourcePath: 'hooks/run-feedback.mjs' },
    } as any;
  }

  it('renderHook returns a GeneratedFile only for the currently hook-emitting generators, and undefined for every other registered generator', async () => {
    const { generators } = await import('../../src/generators/index.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const payload = fakeHookPayload(profile);

    for (const [id, generator] of generators) {
      const result = (generator as any).renderHook(payload);
      if (HOOK_EMITTING_GENERATOR_IDS.includes(id)) {
        expect(result, `${id} was expected to emit a hook artifact at this phase`).toBeDefined();
      } else {
        expect(
          result,
          `${id} must not emit a hook artifact yet (Phase 6) — a forgotten stub should fail this test, not ship quiet`,
        ).toBeUndefined();
      }
    }
  });

  it('every registered generator declares a non-empty hooksPath, and no two generators share one (contract V1)', async () => {
    const { generators } = await import('../../src/generators/index.js');

    const hooksPaths: string[] = [];
    for (const [id, generator] of generators) {
      const hooksPath = (generator as any).hooksPath;
      expect(typeof hooksPath, `${id}.hooksPath`).toBe('string');
      expect(hooksPath.length, `${id}.hooksPath must not be empty`).toBeGreaterThan(0);
      hooksPaths.push(hooksPath);
    }
    expect(new Set(hooksPaths).size, 'hooksPath values must be mutually distinct').toBe(hooksPaths.length);
  });

  // Spec: specs/agent-feedback-controls (Post-audit amendment A1)
  // Covers: contract.md Behavior Guarantee 20's second half — "no generated hook
  // config passes --whole-project" — the CI-only flag exists solely because CI has
  // no turn to scope to; a hook that passed it would silently re-check the whole
  // project on every turn, defeating BG-1's one-cheap-run-per-turn design.
  //
  // Red-phase note: `--whole-project` does not exist anywhere in this codebase yet,
  // so this test is expected to PASS already today (there is nothing to violate) —
  // the same "nothing to violate yet, becomes a live regression guard" situation
  // `tests/feedback.test.ts`'s BG-7 grep gate documents for itself. It stays live
  // and reported here, not skipped, so it starts protecting the instant any
  // generator's `renderHook` is touched.
  it('no generated hook config passes --whole-project — that flag is CI-only (BG-20)', async () => {
    const { generators } = await import('../../src/generators/index.js');
    const { STACK_PROFILES } = await import('../../src/feedback.js');
    const profile = STACK_PROFILES.find((p) => p.id === 'typescript');
    const payload = fakeHookPayload(profile);

    for (const [id, generator] of generators) {
      const result = (generator as any).renderHook(payload);
      if (result === undefined) continue;
      expect(
        result.contents,
        `${id}'s rendered hook config must never pass --whole-project (CI-only, BG-20)`,
      ).not.toContain('--whole-project');
    }
  });
});

describe('mcpConfig — every generator declares the required member, matching the verified per-tool facts table exactly', () => {
  const EXPECTED = [
    {
      id: 'claude-code',
      path: '.mcp.json',
      format: 'json',
      rootKey: 'mcpServers',
      entry: { type: 'http', url: 'https://mcp.context7.com/mcp/oauth' },
    },
    {
      id: 'cursor',
      path: '.cursor/mcp.json',
      format: 'json',
      rootKey: 'mcpServers',
      entry: { url: 'https://mcp.context7.com/mcp/oauth' },
    },
    {
      // The single highest-value row: GitHub Copilot's .vscode/mcp.json is
      // the only one of the five that uses "servers", not "mcpServers".
      id: 'github-copilot',
      path: '.vscode/mcp.json',
      format: 'json',
      rootKey: 'servers',
      entry: { type: 'http', url: 'https://mcp.context7.com/mcp/oauth' },
    },
    {
      id: 'kiro',
      path: '.kiro/settings/mcp.json',
      format: 'json',
      rootKey: 'mcpServers',
      entry: { url: 'https://mcp.context7.com/mcp/oauth' },
    },
    {
      id: 'codex',
      path: '.codex/config.toml',
      format: 'toml',
      rootKey: 'mcp_servers',
      entry: { url: 'https://mcp.context7.com/mcp/oauth' },
    },
  ] as const;

  it.each(EXPECTED)('$id declares mcpConfig exactly as contract.md’s verified-facts table fixes it', async (expected) => {
    const { generators } = await import('../../src/generators/index.js');
    const generator = generators.get(expected.id as any) as any;

    expect(generator).toBeDefined();
    expect(generator.mcpConfig).toEqual({
      path: expected.path,
      format: expected.format,
      rootKey: expected.rootKey,
      entry: expected.entry,
    });
  });

  it('GitHub Copilot’s rootKey is "servers", explicitly distinct from every other tool’s "mcpServers"/"mcp_servers"', async () => {
    const { generators } = await import('../../src/generators/index.js');

    const rootKeys = [...generators.entries()].map(([id, generator]) => [id, (generator as any).mcpConfig?.rootKey]);
    const copilotRootKey = rootKeys.find(([id]) => id === 'github-copilot')?.[1];
    expect(copilotRootKey).toBe('servers');

    for (const [id, rootKey] of rootKeys) {
      if (id === 'github-copilot') continue;
      expect(rootKey, `${id} unexpectedly shares GitHub Copilot's rootKey`).not.toBe('servers');
    }
  });

  it('is a required member: every registered generator has an "mcpConfig" key, never simply missing', async () => {
    const { generators } = await import('../../src/generators/index.js');

    for (const [id, generator] of generators) {
      expect('mcpConfig' in (generator as object), `${id} has no mcpConfig key at all`).toBe(true);
    }
  });
});
