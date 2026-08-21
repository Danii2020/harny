/**
 * Generator registry and availability lookup. Claude Code, Cursor, Kiro and
 * GitHub Copilot ship as of this feature; `codex` is the one `ToolId` that
 * deliberately resolves to `undefined` (Non-Goal: the Codex CLI generator is
 * a TOML target and gets its own spec).
 */
import type { ToolId } from '../vocabulary.js';
import { claudeCodeGenerator } from './claude-code.js';
import { cursorGenerator } from './cursor.js';
import { kiroGenerator } from './kiro.js';
import { githubCopilotGenerator } from './github-copilot.js';
import type { Generator } from './types.js';

export const generators: ReadonlyMap<ToolId, Generator> = new Map([
  ['claude-code', claudeCodeGenerator],
  ['cursor', cursorGenerator],
  ['kiro', kiroGenerator],
  ['github-copilot', githubCopilotGenerator],
]);

export function getGenerator(id: ToolId): Generator | undefined {
  return generators.get(id);
}

/** Tool ids that actually have a generator today.
 *  After this feature: ['claude-code', 'cursor', 'kiro', 'github-copilot']. */
export function availableToolIds(): readonly ToolId[] {
  return [...generators.keys()];
}
