/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/errors.ts" (G1), C2, T2, and the
 * Error Handling Contract's exit-code column as a whole.
 *
 * Spec: specs/readiness-doctor
 * Covers: contract.md "Public API — src/errors.ts" (one row added, `NOT_READY`
 * = 6); Behavior Guarantee 6; intent.md § Constraints ("the fourth declared
 * current-truth amendment"); audit.md Test Coverage T20.
 *
 * Red-phase note: `EXIT.NOT_READY` does not exist yet, so the amended `EXIT`
 * table assertion below is expected to fail against today's six-entry table,
 * and `HarnessErrorCode`/`EXIT_BY_CODE` do not yet accept `'NOT_READY'`.
 */
import { describe, expect, it } from 'vitest';

describe('EXIT table', () => {
  it('defines the eight contracted exit codes, including NOT_READY = 6 (readiness-doctor)', async () => {
    const { EXIT } = await import('../src/errors.js');
    expect(EXIT).toEqual({
      OK: 0,
      UNEXPECTED: 1,
      USAGE: 2,
      CONFLICT: 3,
      NO_GENERATOR: 4,
      TEMPLATE: 5,
      NOT_READY: 6,
      CANCELLED: 130,
    });
  });
});

describe('NOT_READY (readiness-doctor, BG-6, T20)', () => {
  it('maps HarnessError("NOT_READY", ...).exitCode to 6, distinct from every other code', async () => {
    const { HarnessError, EXIT } = await import('../src/errors.js');

    const err = new HarnessError('NOT_READY', 'the readiness check ran and reported red');
    expect(err.code).toBe('NOT_READY');
    expect(err.exitCode).toBe(6);
    expect(err.exitCode).not.toBe(EXIT.UNEXPECTED);
  });
});

describe('HarnessError', () => {
  it('maps each HarnessErrorCode to the contracted exit code via .exitCode', async () => {
    const { HarnessError, EXIT } = await import('../src/errors.js');

    const cases: Array<[string, number]> = [
      ['USAGE', EXIT.USAGE],
      ['CONFLICT', EXIT.CONFLICT],
      ['NO_GENERATOR', EXIT.NO_GENERATOR],
      ['TEMPLATE', EXIT.TEMPLATE],
      ['CANCELLED', EXIT.CANCELLED],
    ];

    for (const [code, expectedExit] of cases) {
      const err = new HarnessError(code, `message for ${code}`);
      expect(err.code).toBe(code);
      expect(err.exitCode).toBe(expectedExit);
      expect(err).toBeInstanceOf(Error);
    }
  });

  it('carries optional details, defaulting to an empty list', async () => {
    const { HarnessError } = await import('../src/errors.js');

    const withDetails = new HarnessError('CONFLICT', 'files collide', [
      '.claude/agents/sdd-architect.md',
      '.sdd/harness.json',
    ]);
    expect(withDetails.details).toEqual([
      '.claude/agents/sdd-architect.md',
      '.sdd/harness.json',
    ]);

    const withoutDetails = new HarnessError('USAGE', 'bad flag');
    expect(withoutDetails.details).toEqual([]);
  });
});

describe('isHarnessError', () => {
  it('discriminates HarnessError instances from other thrown values', async () => {
    const { HarnessError, isHarnessError } = await import('../src/errors.js');

    expect(isHarnessError(new HarnessError('USAGE', 'x'))).toBe(true);
    expect(isHarnessError(new Error('plain error'))).toBe(false);
    expect(isHarnessError('a string')).toBe(false);
    expect(isHarnessError(undefined)).toBe(false);
    expect(isHarnessError(null)).toBe(false);
  });
});
