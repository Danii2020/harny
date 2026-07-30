/**
 * `HarnessError` and the exit-code taxonomy this CLI throws deliberately.
 * Anything else escaping to `main` is a bug and maps to `EXIT.UNEXPECTED`.
 */

export const EXIT = {
  OK: 0,
  UNEXPECTED: 1,
  USAGE: 2,
  CONFLICT: 3,
  NO_GENERATOR: 4,
  TEMPLATE: 5,
  CANCELLED: 130,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export type HarnessErrorCode = 'USAGE' | 'CONFLICT' | 'NO_GENERATOR' | 'TEMPLATE' | 'CANCELLED';

const EXIT_BY_CODE: Record<HarnessErrorCode, ExitCode> = {
  USAGE: EXIT.USAGE,
  CONFLICT: EXIT.CONFLICT,
  NO_GENERATOR: EXIT.NO_GENERATOR,
  TEMPLATE: EXIT.TEMPLATE,
  CANCELLED: EXIT.CANCELLED,
};

/**
 * The only error type this CLI throws deliberately. Anything else escaping to
 * `main` is a bug and maps to EXIT.UNEXPECTED.
 */
export class HarnessError extends Error {
  readonly code: HarnessErrorCode;
  /** Extra lines printed under the message, e.g. the list of conflicting paths. */
  readonly details: readonly string[];

  constructor(code: HarnessErrorCode, message: string, details?: readonly string[]) {
    super(message);
    this.name = 'HarnessError';
    this.code = code;
    this.details = details ?? [];
  }

  get exitCode(): ExitCode {
    return EXIT_BY_CODE[this.code];
  }
}

export function isHarnessError(value: unknown): value is HarnessError {
  return value instanceof HarnessError;
}
