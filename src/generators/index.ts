/**
 * Generator registry and availability lookup. Only Claude Code ships in this
 * feature; the other four `ToolId`s deliberately resolve to `undefined`
 * (Non-Goal: the four remaining per-tool generators are weeks 3-4).
 */
import type { ToolId } from '../vocabulary.js';
import { claudeCodeGenerator } from './claude-code.js';
import type { Generator } from './types.js';

export const generators: ReadonlyMap<ToolId, Generator> = new Map([
  ['claude-code', claudeCodeGenerator],
]);

export function getGenerator(id: ToolId): Generator | undefined {
  return generators.get(id);
}

/** Tool ids that actually have a generator today. In this feature: ['claude-code']. */
export function availableToolIds(): readonly ToolId[] {
  return [...generators.keys()];
}
