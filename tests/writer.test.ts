/**
 * Spec: specs/cli-skeleton
 * Covers: contract.md "Public API — src/writer.ts" (G8);
 * Behavior Guarantees 13, 15, 16; C15; T27, T28.
 *
 * Spec: specs/context7-mcp
 * Covers: contract.md "Public API — src/writer.ts" (MODIFY) — the merge-marked
 * exemption from `WritePlan.conflicts`; Behavior Guarantee MC-7; intent.md
 * SC8; audit.md Test Coverage T13.
 *
 * `GeneratedFile.merge` does not exist on the type yet at red time, so the
 * merge-marked test below currently behaves exactly like an ordinary file
 * (the flag is simply ignored), and its conflict-exemption assertion fails,
 * not a wrong assumption about `planWrites`' existing behavior.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-writer-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('assertContained (guarantee 15) (T27)', () => {
  it('rejects an absolute path', async () => {
    const { assertContained } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    expect(() => assertContained('/etc/passwd', targetDir)).toThrow();
  });

  it('rejects a relative path that escapes targetDir via ..', async () => {
    const { assertContained } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    expect(() => assertContained('../outside.txt', targetDir)).toThrow();
    expect(() => assertContained('nested/../../outside.txt', targetDir)).toThrow();
  });

  it('accepts a path that resolves inside targetDir', async () => {
    const { assertContained } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    expect(() => assertContained('.claude/agents/sdd-architect.md', targetDir)).not.toThrow();
  });
});

describe('planWrites (guarantee 13) (T28)', () => {
  it('collects paths that already exist on disk as conflicts, in stable order', async () => {
    const { planWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    await fs.mkdir(path.join(targetDir, '.sdd'), { recursive: true });
    await fs.writeFile(path.join(targetDir, '.sdd', 'harness.json'), '{}\n');

    const files = [
      { path: '.sdd/harness.json', contents: '{"version":1}\n' },
      { path: '.claude/agents/sdd-architect.md', contents: 'new file\n' },
    ];

    const plan = await planWrites(files, targetDir);

    expect(plan.conflicts).toEqual(['.sdd/harness.json']);
    expect(plan.files).toEqual(files);
    expect(plan.targetDir).toBe(targetDir);
  });

  it('reports no conflicts against an empty target directory', async () => {
    const { planWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    const plan = await planWrites(
      [{ path: '.claude/agents/sdd-architect.md', contents: 'x\n' }],
      targetDir,
    );

    expect(plan.conflicts).toEqual([]);
  });
});

describe('applyWrites (guarantees 13, 16) (T28)', () => {
  it('throws CONFLICT before writing anything when a planned path already exists and force is false', async () => {
    const { planWrites, applyWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();

    await fs.writeFile(path.join(targetDir, 'existing.md'), 'do not touch\n');

    const plan = await planWrites(
      [
        { path: 'existing.md', contents: 'overwritten\n' },
        { path: 'brand-new.md', contents: 'new\n' },
      ],
      targetDir,
    );

    try {
      await applyWrites(plan, { force: false });
      expect.unreachable('expected applyWrites to throw CONFLICT');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      expect((err as any).details).toContain('existing.md');
    }

    // Nothing was written: the pre-existing file is untouched and the new file absent.
    const existingContents = await fs.readFile(path.join(targetDir, 'existing.md'), 'utf8');
    expect(existingContents).toBe('do not touch\n');
    await expect(fs.access(path.join(targetDir, 'brand-new.md'))).rejects.toThrow();
  });

  it('overwrites and creates parent directories under force, returning the written paths', async () => {
    const { planWrites, applyWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    await fs.writeFile(path.join(targetDir, 'existing.md'), 'old\n');

    const plan = await planWrites(
      [
        { path: 'existing.md', contents: 'new-content\n' },
        { path: 'nested/deep/new.md', contents: 'deep\n' },
      ],
      targetDir,
    );

    const written = await applyWrites(plan, { force: true });

    expect(new Set(written)).toEqual(new Set(['existing.md', 'nested/deep/new.md']));
    expect(await fs.readFile(path.join(targetDir, 'existing.md'), 'utf8')).toBe('new-content\n');
    expect(await fs.readFile(path.join(targetDir, 'nested', 'deep', 'new.md'), 'utf8')).toBe('deep\n');
  });
});

describe('planWrites — merge-marked paths are exempt from conflict collection', () => {
  it('excludes a merge-marked file at an existing path from conflicts, while an ordinary file at an existing path is still collected', async () => {
    const { planWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    await fs.mkdir(path.join(targetDir, '.vscode'), { recursive: true });
    await fs.writeFile(path.join(targetDir, '.vscode', 'mcp.json'), '{"servers":{}}\n', 'utf8');
    await fs.writeFile(path.join(targetDir, 'existing-role.md'), 'pre-existing\n', 'utf8');

    const files = [
      { path: '.vscode/mcp.json', contents: '{"servers":{"context7":{}}}\n', merge: true },
      { path: 'existing-role.md', contents: 'new\n' },
      { path: 'brand-new.md', contents: 'new\n' },
    ];

    const plan = await planWrites(files as any, targetDir);

    expect(plan.conflicts).toEqual(['existing-role.md']);
    expect(plan.conflicts).not.toContain('.vscode/mcp.json');
  });

  it('applyWrites still throws CONFLICT for the ordinary file even though a merge-marked file at an existing path is present in the same plan', async () => {
    const { planWrites, applyWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();

    await fs.writeFile(path.join(targetDir, '.mcp.json'), '{"mcpServers":{}}\n', 'utf8');
    await fs.writeFile(path.join(targetDir, 'existing-role.md'), 'pre-existing\n', 'utf8');

    const files = [
      { path: '.mcp.json', contents: '{"mcpServers":{"context7":{}}}\n', merge: true },
      { path: 'existing-role.md', contents: 'overwritten\n' },
    ];

    const plan = await planWrites(files as any, targetDir);

    try {
      await applyWrites(plan, { force: false });
      expect.unreachable('expected applyWrites to throw CONFLICT');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
      expect((err as any).details).toContain('existing-role.md');
      expect((err as any).details).not.toContain('.mcp.json');
    }

    // Neither file was touched: applyWrites throws before writing anything.
    expect(await fs.readFile(path.join(targetDir, '.mcp.json'), 'utf8')).toBe('{"mcpServers":{}}\n');
    expect(await fs.readFile(path.join(targetDir, 'existing-role.md'), 'utf8')).toBe('pre-existing\n');
  });
});
