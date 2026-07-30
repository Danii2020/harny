/**
 * The `Generator` adapter interface — the contract every per-tool generator
 * implements. Interface only; no implementation lives here.
 */
import type { Capability } from '../templates.js';
import type { CostTier, RoleId, ToolId } from '../vocabulary.js';
import type { ConductorPayload, RolePayload } from '../engine.js';

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

  /** File name only. Accommodates `<role>.md`, `<role>.agent.md`, and `<role>.toml`. */
  roleFileName(roleId: RoleId): string;

  /** cost_tier → this tool's own model id. `override`, when present, is returned
   *  verbatim: the user's literal model id always wins over the tier mapping. */
  mapModel(tier: CostTier, override?: string): string;

  mapCapabilities(capabilities: readonly Capability[]): CapabilityMapping;

  renderRole(payload: RolePayload): GeneratedFile;
  renderConductor(payload: ConductorPayload): GeneratedFile;
}
