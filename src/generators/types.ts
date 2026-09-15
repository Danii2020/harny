/**
 * The `Generator` adapter interface — the contract every per-tool generator
 * implements. Interface only; no implementation lives here.
 */
import type { Capability } from '../templates.js';
import type { CostTier, RoleId, ToolId } from '../vocabulary.js';
import type { ConductorPayload, HookPayload, RolePayload } from '../engine.js';

export type WrapperFormat = 'markdown-yaml' | 'toml';

export interface GeneratedFile {
  /** POSIX-style path relative to the target repo root. Never absolute, never `..`. */
  readonly path: string;
  /** Full file contents, ending in exactly one `\n`. */
  readonly contents: string;
}

export interface CapabilityMapping {
  /** Tool-native tool/permission names, deduped, in a stable order. */
  readonly tokens: readonly string[];
  /** Anything the target format cannot express natively — scoped capabilities and
   *  unknown tokens. MUST be surfaced in the rendered output, never dropped. */
  readonly notes: readonly string[];
}

/**
 * The contract every per-tool generator implements. Deliberately sufficient for all
 * five known targets: `.claude/agents/<role>.md`, `.cursor/agents/<role>.md`,
 * `.kiro/agents/<role>.md`, `.github/agents/<role>.agent.md` (markdown-yaml), and
 * `.codex/agents/<role>.toml` (toml).
 */
export interface Generator {
  readonly id: ToolId;
  readonly displayName: string;
  /** Target directory for role files, POSIX, relative to the target repo root. */
  readonly agentsDir: string;
  readonly wrapperFormat: WrapperFormat;
  /** Full path for the conductor artifact — deliberately NOT derived from
   *  `agentsDir`, because at least one target places it elsewhere entirely
   *  (Claude Code: `.claude/skills/sdd-conductor/SKILL.md`). */
  readonly conductorPath: string;
  /** **(NEW — templates-skill-library-parity.)** This tool's own skill-discovery
   *  root, POSIX, relative to the target repo root. A fixed per-generator constant:
   *  it never varies with which other tools are selected (D2). Several generators
   *  deliberately share one value — `.agents/skills` is read by Cursor (V9), Codex
   *  (V13) and GitHub Copilot (V10) — which is what `buildSkillFiles`' dedup keys
   *  on. */
  readonly skillsDir: string;
  /** **(NEW — agent-feedback-controls.)** Where this tool reads its hook config,
   *  POSIX, relative to the target repo root. A fixed per-generator constant (V1).
   *  Unlike `skillsDir`, no two generators share a value. */
  readonly hooksPath: string;
  /** **(NEW — ai-sdlc-readiness.)** This tool's own root instruction file, POSIX,
   *  relative to the target repo root — the file it reads for project-wide guidance
   *  before any task. `undefined` means this tool's root guidance file *is* the
   *  cross-tool `AGENTS.md`, so it needs no entry of its own.
   *
   *  A declarative member, not a method: a fixed per-tool path fact, exactly like
   *  `skillsDir` (ADR 0011) and `hooksPath` — nothing is rendered, so the `renderHook`
   *  departure (ADR 0014) does not apply. Generators may share a value or share
   *  `undefined`, which is what `dedupePreserveOrder` keys on. */
  readonly guidancePath: string | undefined;

  /** File name only. Accommodates `<role>.md`, `<role>.agent.md`, and `<role>.toml`. */
  roleFileName(roleId: RoleId): string;

  /** cost_tier → this tool's own model id. `override`, when present, is returned
   *  verbatim: the user's literal model id always wins over the tier mapping. */
  mapModel(tier: CostTier, override?: string): string;

  mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping;

  renderRole(payload: RolePayload): GeneratedFile;
  renderConductor(payload: ConductorPayload): GeneratedFile;

  /** **(NEW — agent-feedback-controls.)** Renders this tool's native hook config.
   *  Returns `undefined` when the tool's hook surface is unavailable for the
   *  resolved profile, in which case the generator contributes no hook artifact
   *  (never an empty or placeholder file at a path the tool would read).
   *
   *  A method, not a declarative member — a conscious departure from ADR 0011
   *  (see contract.md § Interfaces): hook configs vary structurally per tool
   *  (nested vs. flat, `command` vs. `bash`, …), which is exactly what
   *  `renderRole`/`renderConductor` already exist for. */
  renderHook(payload: HookPayload): GeneratedFile | undefined;
}
