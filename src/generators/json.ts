/**
 * Deterministic JSON for generated config artifacts: keys in insertion order,
 * 2-space indent, exactly one trailing `\n`. The JSON counterpart of
 * `markdown-yaml.ts` and `toml.ts`, satisfying `tool-generators.md` TG-5 and its
 * invariant 1 (no generator hand-rolls serialization).
 *
 * Uses `JSON.stringify` — a language builtin, NOT a new dependency
 * (contract.md § Dependencies).
 */
export function renderJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** POSIX shell single-quoting: wraps `value` in `'…'`, escaping any embedded
 *  single quote as `'\''` (close, escaped quote, reopen) — the standard
 *  technique, needed because generated hook `command`/`bash` strings embed an
 *  inline wrapper script and a resolved-commands JSON blob as literal shell
 *  arguments (never interpreted, never `eval`ed by the shell itself). Shared
 *  across every hook-emitting generator (`AGENTS.md` S5) rather than
 *  re-literalled per tool. */
export function wrapPosixShellArg(value: string): string {
  return `'${value.split("'").join(`'\\''`)}'`;
}
