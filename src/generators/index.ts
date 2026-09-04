/**
 * Generator registry and availability lookup. All five `TOOL_IDS` ship as of
 * this feature: Claude Code, Cursor, Kiro, GitHub Copilot and Codex CLI.
 * `getGenerator`'s return type stays `Generator | undefined` — it is now total
 * over `ToolId` in practice, but the optional return remains the type-level
 * guard that keeps `init.ts` step 10's skip-and-warn branch honest for a
 * future sixth `ToolId`.
 */
import type { ToolId } from '../vocabulary.js';
import { claudeCodeGenerator } from './claude-code.js';
import { cursorGenerator } from './cursor.js';
import { kiroGenerator } from './kiro.js';
import { githubCopilotGenerator } from './github-copilot.js';
import { codexGenerator } from './codex.js';
import type { Generator } from './types.js';

export const generators: ReadonlyMap<ToolId, Generator> = new Map([
  ['claude-code', claudeCodeGenerator],
  ['cursor', cursorGenerator],
  ['kiro', kiroGenerator],
  ['github-copilot', githubCopilotGenerator],
  ['codex', codexGenerator],
]);

export function getGenerator(id: ToolId): Generator | undefined {
  return generators.get(id);
}

/** Tool ids that actually have a generator today.
 *  After this feature: ['claude-code', 'cursor', 'kiro', 'github-copilot', 'codex']. */
export function availableToolIds(): readonly ToolId[] {
  return [...generators.keys()];
}
