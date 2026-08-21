/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/cli.ts" (G1, G8), the interactivity
 * resolution rule, and the Error Handling Contract's exit-code column;
 * Behavior Guarantee 17; C17, C18b; T33, T34, T35.
 *
 * AL-3 amendment round: a `--model` assignment naming a role `--roles`
 * excluded is a USAGE error naming the role and the enabled set, not a
 * silent drop — Behavior Guarantee 22, the new Error Handling Contract row,
 * Task 5.17, T5.17.
 *
 * Spec: specs/cursor-kiro-copilot-generators
 * Covers: tasks.md Task 3.3 (re-point the `--tools cursor` → exit-4
 * "unimplemented tool" stand-in at `codex`, now that cursor ships a real
 * generator); T21.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-cli-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

/** Captures everything written to stdout/stderr/console during `fn`. */
async function captureOutput(fn: () => Promise<unknown>): Promise<{ result: unknown; text: string }> {
  const chunks: string[] = [];
  const record = (chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  };
  const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(record as any);
  const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(record as any);
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args) => record(args.join(' ')));
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args) => record(args.join(' ')));
  const consoleWarnSpy = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => record(args.join(' ')));

  try {
    const result = await fn();
    return { result, text: chunks.join('\n') };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  }
}

describe('main() never calls process.exit (guarantee 17)', () => {
  it('returns an ExitCode instead of exiting the process, across success and failure paths', async () => {
    const { main } = await import('../src/cli.js');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code}) was called — guarantee 17 violated`);
    }) as never);

    await captureOutput(() => main(['--help']));
    await captureOutput(() => main(['totally-bogus-command']));

    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('--help (R1, C18b) (T35)', () => {
  it('renders "Usage: harny" (never "harness.js") and lists the init command', async () => {
    const { main } = await import('../src/cli.js');

    const { text } = await captureOutput(() => main(['--help']));

    expect(text).toContain('Usage: harny');
    expect(text).not.toContain('harness.js');
    expect(text).toContain('init');
  });
});

describe('exit-code mapping (T34)', () => {
  it('maps an unknown command/flag to exit 1 (commander usage error)', async () => {
    const { main } = await import('../src/cli.js');
    const { result } = await captureOutput(() => main(['this-command-does-not-exist']));
    expect(result).toBe(1);
  });

  it('maps an unknown tool id (HarnessError USAGE) to exit 2', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'not-a-real-tool']),
    );
    expect(result).toBe(2);
  });

  it('maps a re-run over existing output without --force (HarnessError CONFLICT) to exit 3', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const first = await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code']));
    expect(first.result).toBe(0);

    const second = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code']),
    );
    expect(second.result).toBe(3);
  });

  it('succeeds with --force over an existing conflicting run', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    await captureOutput(() => main(['init', targetDir, '--yes', '--tools', 'claude-code']));
    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code', '--force']),
    );
    expect(result).toBe(0);
  });

  it('maps no-available-generator (HarnessError NO_GENERATOR) to exit 4', async () => {
    // Re-pointed from `cursor` to `codex` (specs/cursor-kiro-copilot-generators
    // tasks.md Task 3.3): cursor now ships its own generator, and codex is the
    // one ToolId this feature deliberately leaves unimplemented — see
    // specs/cursor-kiro-copilot-generators/intent.md Non-Goals.
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'codex']),
    );
    expect(result).toBe(4);

    const entries = await fs.readdir(targetDir);
    expect(entries).toEqual([]);
  });
});

describe('--roles / --model contradiction is a USAGE error, not a silent drop (AL-3, guarantee 22, Error Handling Contract) (T5.17)', () => {
  it('exits 2 naming the excluded role and the enabled set when --model targets a role --roles left out, and writes nothing', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result, text } = await captureOutput(() =>
      main([
        'init',
        targetDir,
        '--yes',
        '--tools',
        'claude-code',
        '--roles',
        'sdd-architect',
        '--model',
        'sdd-auditor=opus',
      ]),
    );

    expect(result).toBe(2);
    expect(text).toContain('sdd-auditor');
    expect(text).toContain('sdd-architect');

    const entries = await fs.readdir(targetDir);
    expect(entries).toEqual([]);
  });
});

describe('interactivity resolution (Error Handling Contract row; R14) (T33)', () => {
  it('--yes forces non-interactive even without a TTY', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--yes', '--tools', 'claude-code']),
    );
    expect(result).toBe(0);
  });

  it('--config forces non-interactive even without --yes', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();
    const configPath = path.join(targetDir, 'harness.config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        version: 1,
        tools: ['claude-code'],
        roles: [
          { id: 'sdd-architect', tier: 'most-capable' },
          { id: 'sdd-test-writer', tier: 'mid' },
          { id: 'sdd-executor', tier: 'mid' },
          { id: 'sdd-auditor', tier: 'most-capable' },
          { id: 'sdd-documentation', tier: 'cheapest' },
        ],
        gates: ['post-specs', 'post-red-tests', 'post-audit'],
      }),
    );

    const { result } = await captureOutput(() =>
      main(['init', targetDir, '--config', configPath]),
    );
    expect(result).toBe(0);
  });

  it('exits 2 naming both --yes and --config when stdin is not a TTY and neither is given', async () => {
    const { main } = await import('../src/cli.js');
    const targetDir = await makeTempDir();

    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

    try {
      const { result, text } = await captureOutput(() => main(['init', targetDir]));
      expect(result).toBe(2);
      expect(text).toContain('--yes');
      expect(text).toContain('--config');
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    }
  });
});
