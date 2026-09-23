/**
 * Spec: specs/documentation-role-completion
 * Covers: contract.md § Interfaces item 3 (referenced), Behavior Guarantees
 * RC-14, RC-15, RC-16; Error Handling Contract rows "Live conductor file
 * absent when the parity guard runs" and "Live conductor present but missing
 * a required element"; intent.md SC7, SC8; audit.md Test Coverage T19-T22;
 * tasks.md Tasks 3.1R, 3.2R.
 *
 * RC-16 fixes this guard's gating precisely, so this file *is* the guard —
 * there is no `src/` module to import, the same posture
 * `tests/canonical-fidelity.test.ts`'s NEVER_COMMIT_OR_PUSH block and
 * `tests/skills-fidelity.test.ts`'s prose-parity blocks already use for a
 * commitment whose only verification is reading the file:
 *
 *   - **Skip condition**, detected by `fs.existsSync` on the path (never a
 *     caught read error, which could mask a permissions fault): if
 *     `.claude/skills/sdd-conductor/SKILL.md` does not exist, report a
 *     genuine, observable Vitest skip (`context.skip()`), never a silently
 *     passing empty assertion.
 *   - **Fail condition**: present but missing a required element -> fail,
 *     naming the element. Present but empty -> fail (never treated as
 *     "absent").
 *
 * `tests/helpers/paths.ts:22` already declares `REAL_CLAUDE_CONDUCTOR_PATH`
 * "the oracle for conductor placement"; nothing imports it before this file —
 * that is the gap RC-16 closes.
 *
 * Red-phase note: on this development machine, `.claude/skills/sdd-conductor/
 * SKILL.md` exists (it is untracked but present locally) and carries none of
 * the four RC-15 elements yet — the "present and missing every element" case
 * is exercised directly against the real file, genuinely red today. The
 * "skip when absent" and "fail when empty" sub-behaviors are exercised
 * against local temp fixtures instead, since this test must never create,
 * rename, or empty the real, tracked-by-neither-git-nor-this-suite live
 * conductor file to manufacture those cases — deleting it would violate
 * this feature's "no changes to non-test files" red-phase scope and would
 * corrupt a real developer's untracked local file. Those fixture-driven
 * sub-tests pass immediately (they exercise this file's own new gating logic
 * in isolation, not a pending `src/`/`templates/` change) and are declared
 * structural-invariant guards, the same "expected to pass already at red
 * time" posture this repo's other continuity guards document explicitly.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_CLAUDE_CONDUCTOR_PATH } from './helpers/paths.js';

/** The four RC-15 elements, each pinned as a concrete acceptance substring —
 *  this test file, like `NEVER_COMMIT_OR_PUSH` before it, is what pins the
 *  exact text `harny-implement` must land in the live conductor, since none
 *  of this prose exists anywhere yet for the test to read back dynamically. */
const REQUIRED_ELEMENTS: ReadonlyArray<{ name: string; needle: string }> = [
  { name: 'sdd-documentation named in the pipeline diagram', needle: 'sdd-documentation' },
  {
    name: "a post-audit hard rule matching the template's rule #4",
    needle: 'documentation follows automatically',
  },
  { name: 'auditor → documentation listed under automatic flow', needle: 'auditor → documentation' },
  { name: 'archive verification before declaring the pipeline complete', needle: 'confirms the archive landed' },
];

interface ParityResult {
  status: 'skip' | 'pass' | 'fail';
  missingElements: string[];
}

/** The presence-gated parity guard itself (RC-16). Local to this test file —
 *  there is no `src/` counterpart to import — so this function *is* the
 *  acceptance interface: existence is checked with `fs.existsSync`, never a
 *  try/catch around a read (which would conflate "absent" with "unreadable
 *  for another reason"), and an empty file is explicitly a `fail`, never
 *  treated the same as "absent". */
function checkConductorParity(filePath: string): ParityResult {
  if (!fs.existsSync(filePath)) {
    return { status: 'skip', missingElements: [] };
  }
  const contents = fs.readFileSync(filePath, 'utf8');
  const missingElements = REQUIRED_ELEMENTS.filter((el) => !contents.includes(el.needle)).map((el) => el.name);
  return { status: missingElements.length > 0 ? 'fail' : 'pass', missingElements };
}

describe('the parity guard\'s own gating semantics, pinned against local fixtures (RC-16)', () => {
  it('skips when the path does not exist on disk', () => {
    const absentPath = path.join(os.tmpdir(), `harny-conductor-parity-absent-${Math.random().toString(36).slice(2)}.md`);
    expect(fs.existsSync(absentPath)).toBe(false);

    const result = checkConductorParity(absentPath);

    expect(result.status).toBe('skip');
  });

  it('fails, never treating it as absent, when the file exists but is empty', () => {
    const emptyPath = path.join(os.tmpdir(), `harny-conductor-parity-empty-${Math.random().toString(36).slice(2)}.md`);
    fs.writeFileSync(emptyPath, '', 'utf8');
    try {
      const result = checkConductorParity(emptyPath);

      expect(result.status).toBe('fail');
      expect(result.missingElements).toHaveLength(REQUIRED_ELEMENTS.length);
    } finally {
      fs.rmSync(emptyPath, { force: true });
    }
  });

  it('fails naming exactly the missing element(s) when some, but not all, required elements are present', () => {
    const partialPath = path.join(os.tmpdir(), `harny-conductor-parity-partial-${Math.random().toString(36).slice(2)}.md`);
    const presentElements = REQUIRED_ELEMENTS.slice(0, -1);
    const missingElement = REQUIRED_ELEMENTS[REQUIRED_ELEMENTS.length - 1]!;
    fs.writeFileSync(partialPath, presentElements.map((el) => el.needle).join('\n'), 'utf8');
    try {
      const result = checkConductorParity(partialPath);

      expect(result.status).toBe('fail');
      expect(result.missingElements).toEqual([missingElement.name]);
    } finally {
      fs.rmSync(partialPath, { force: true });
    }
  });

  it('passes when every required element is present', () => {
    const completePath = path.join(os.tmpdir(), `harny-conductor-parity-complete-${Math.random().toString(36).slice(2)}.md`);
    fs.writeFileSync(completePath, REQUIRED_ELEMENTS.map((el) => el.needle).join('\n'), 'utf8');
    try {
      const result = checkConductorParity(completePath);

      expect(result.status).toBe('pass');
      expect(result.missingElements).toEqual([]);
    } finally {
      fs.rmSync(completePath, { force: true });
    }
  });
});

describe('the live conductor carries every RC-15 element, or the guard skips observably if it is absent (RC-16, SC8)', () => {
  it('.claude/skills/sdd-conductor/SKILL.md passes the parity guard when present, and is a real, observable skip when absent', (context) => {
    const result = checkConductorParity(REAL_CLAUDE_CONDUCTOR_PATH);

    if (result.status === 'skip') {
      // Fresh clones and CI never have this untracked file — an observable,
      // reported skip, never a silently passing empty assertion.
      context.skip();
      return;
    }

    expect(
      result.status,
      `${REAL_CLAUDE_CONDUCTOR_PATH} is present but missing: ${result.missingElements.join(', ')}`,
    ).toBe('pass');
  });
});
