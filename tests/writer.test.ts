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
 *
 * ---
 * Spec: specs/ci-workflow-root
 * Covers: contract.md "Public API — src/writer.ts" (MODIFIED) — `WritePlan.repoRoot`,
 * `resolveWriteRoot`, `displayPath`, the private `assertRepoRootPermitted`,
 * `planWrites`' defaulted third parameter and per-file root resolution; Behavior
 * Guarantees WR-2, WR-3, WR-4, WR-6, WR-7, WR-9; intent.md SC5, SC10; audit.md
 * Test Coverage T8-T12.
 *
 * `resolveWriteRoot`, `displayPath`, and `planWrites`' third parameter do not
 * exist yet at red time, so every test in the new describe blocks below is
 * expected to fail either on "does not provide an export named 'resolveWriteRoot'"
 * / "...'displayPath'", or — for the `planWrites`/`applyWrites` tests that only
 * exercise today's two-argument shape plus a `root: 'repo'` file — on a
 * behavioral mismatch (a `root: 'repo'` file is planned exactly like a
 * target-rooted one today, so it is never treated as escaping and never
 * produces a `../`-prefixed display path), not on a wrong assumption about
 * `assertContained`'s own unchanged behavior (T27's tests above already prove
 * that separately and are not touched here).
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

describe('resolveWriteRoot — total over GeneratedFile: "repo" selects repoRoot, absent selects targetDir (WR-1) (T8)', () => {
  it('selects repoRoot for a root: "repo" file', async () => {
    const { resolveWriteRoot } = await import('../src/writer.js');
    const targetDir = await makeTempDir();
    const repoRoot = await makeTempDir();

    const file = { path: '.github/workflows/harny-feedback-web.yml', contents: 'x\n', root: 'repo' as const };
    expect(resolveWriteRoot(file, targetDir, repoRoot)).toBe(repoRoot);
  });

  it('selects targetDir for a file with no declared root, exactly like every artifact written before this feature', async () => {
    const { resolveWriteRoot } = await import('../src/writer.js');
    const targetDir = await makeTempDir();
    const repoRoot = await makeTempDir();

    const file = { path: '.claude/agents/sdd-architect.md', contents: 'x\n' };
    expect(resolveWriteRoot(file, targetDir, repoRoot)).toBe(targetDir);
  });
});

describe('planWrites — repoRoot defaults to targetDir, reproducing today\'s behavior exactly (WR-3)', () => {
  it('records repoRoot === targetDir on the returned WritePlan when the third argument is omitted', async () => {
    const { planWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    const plan = await planWrites([{ path: 'a.md', contents: 'x\n' }], targetDir);

    expect((plan as { repoRoot?: string }).repoRoot).toBe(targetDir);
  });
});

describe('planWrites — a root: "repo" file may only escape upward along targetDir\'s own ancestry (WR-4) (T9)', () => {
  it('permits repoRoot === targetDir (the root-install degenerate case) without throwing', async () => {
    const { planWrites } = await import('../src/writer.js');
    const targetDir = await makeTempDir();

    await expect(
      planWrites([{ path: '.github/workflows/harny-feedback.yml', contents: 'x\n', root: 'repo' }], targetDir, targetDir),
    ).resolves.toBeDefined();
  });

  it('permits repoRoot as a proper ancestor of targetDir without throwing', async () => {
    const { planWrites } = await import('../src/writer.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    await expect(
      planWrites(
        [{ path: '.github/workflows/harny-feedback-apps-web.yml', contents: 'x\n', root: 'repo' }],
        targetDir,
        repoRoot,
      ),
    ).resolves.toBeDefined();
  });

  it('throws a plain Error naming both directories when repoRoot is a SIBLING of targetDir', async () => {
    const { planWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const parent = await makeTempDir();
    const targetDir = path.join(parent, 'a');
    const siblingRepoRoot = path.join(parent, 'b');
    await fs.mkdir(targetDir, { recursive: true });
    await fs.mkdir(siblingRepoRoot, { recursive: true });

    try {
      await planWrites([{ path: 'x.yml', contents: 'x\n', root: 'repo' }], targetDir, siblingRepoRoot);
      expect.unreachable('expected planWrites to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(isHarnessError(err)).toBe(false);
      expect((err as Error).message).toContain(targetDir);
      expect((err as Error).message).toContain(siblingRepoRoot);
    }
  });

  it('throws a plain Error when repoRoot is a DESCENDANT of targetDir', async () => {
    const { planWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    const descendantRepoRoot = path.join(targetDir, 'nested');
    await fs.mkdir(descendantRepoRoot, { recursive: true });

    try {
      await planWrites([{ path: 'x.yml', contents: 'x\n', root: 'repo' }], targetDir, descendantRepoRoot);
      expect.unreachable('expected planWrites to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(isHarnessError(err)).toBe(false);
      expect((err as Error).message).toContain(targetDir);
      expect((err as Error).message).toContain(descendantRepoRoot);
    }
  });

  it('throws a plain Error when repoRoot is an UNRELATED absolute path', async () => {
    const { planWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    const unrelatedRepoRoot = await makeTempDir();

    try {
      await planWrites([{ path: 'x.yml', contents: 'x\n', root: 'repo' }], targetDir, unrelatedRepoRoot);
      expect.unreachable('expected planWrites to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(isHarnessError(err)).toBe(false);
      // Guards against `expect.unreachable`'s own thrown Error satisfying the
      // two assertions above by coincidence (it is itself a plain, non-Harness
      // Error): the real failure must name both directories.
      expect((err as Error).message).toContain(targetDir);
      expect((err as Error).message).toContain(unrelatedRepoRoot);
    }
  });
});

describe('planWrites — assertContained still governs a root: "repo" file, unchanged (WR-2) (T10)', () => {
  it('rejects an absolute path even when root is "repo" and repoRoot is a valid ancestor', async () => {
    const { planWrites } = await import('../src/writer.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    await expect(
      planWrites([{ path: '/etc/passwd', contents: 'x\n', root: 'repo' }], targetDir, repoRoot),
    ).rejects.toThrow();
  });

  it('rejects a path that escapes repoRoot via ".." even though repoRoot itself is a valid ancestor of targetDir', async () => {
    const { planWrites } = await import('../src/writer.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    await expect(
      planWrites([{ path: '../../outside.yml', contents: 'x\n', root: 'repo' }], targetDir, repoRoot),
    ).rejects.toThrow();
  });
});

describe('planWrites / applyWrites — conflict detection follows a repo-rooted file to its own root (WR-6, WR-9) (T11)', () => {
  it('a pre-existing file at the repo-rooted destination enters conflicts, and applyWrites writes nothing at either root', async () => {
    const { planWrites, applyWrites } = await import('../src/writer.js');
    const { isHarnessError } = await import('../src/errors.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    const workflowRelPath = '.github/workflows/harny-feedback-apps-web.yml';
    await fs.mkdir(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(path.join(repoRoot, workflowRelPath), 'pre-existing workflow\n', 'utf8');

    const files = [
      { path: workflowRelPath, contents: 'new workflow\n', root: 'repo' as const },
      { path: 'other.md', contents: 'new\n' },
    ];

    const plan = await planWrites(files, targetDir, repoRoot);

    expect(plan.conflicts.length).toBe(1);
    // WR-7: reported relative to targetDir, "../"-prefixed for a repo-rooted file.
    expect(plan.conflicts[0]).toBe('../../' + workflowRelPath);

    try {
      await applyWrites(plan, { force: false });
      expect.unreachable('expected applyWrites to throw CONFLICT');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('CONFLICT');
    }

    // Nothing was written at either root.
    expect(await fs.readFile(path.join(repoRoot, workflowRelPath), 'utf8')).toBe('pre-existing workflow\n');
    await expect(fs.access(path.join(targetDir, 'other.md'))).rejects.toThrow();
  });

  it('a repo-rooted file with no pre-existing destination is not a conflict, and applyWrites writes it at repoRoot', async () => {
    const { planWrites, applyWrites } = await import('../src/writer.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    const workflowRelPath = '.github/workflows/harny-feedback-apps-web.yml';
    const plan = await planWrites(
      [{ path: workflowRelPath, contents: 'workflow\n', root: 'repo' }],
      targetDir,
      repoRoot,
    );

    expect(plan.conflicts).toEqual([]);

    await applyWrites(plan, { force: false });
    expect(await fs.readFile(path.join(repoRoot, workflowRelPath), 'utf8')).toBe('workflow\n');
  });
});

describe('displayPath — POSIX, relative to targetDir; "../"-prefixed for a repo-rooted file (WR-7) (T12)', () => {
  it('returns file.path unchanged for a target-rooted file', async () => {
    const { displayPath } = await import('../src/writer.js');
    const targetDir = await makeTempDir();
    const repoRoot = targetDir;

    const file = { path: '.claude/agents/sdd-architect.md', contents: 'x\n' };
    expect(displayPath(file, targetDir, repoRoot)).toBe('.claude/agents/sdd-architect.md');
  });

  it('returns file.path unchanged for a repo-rooted file when the install directory IS the repo root', async () => {
    const { displayPath } = await import('../src/writer.js');
    const targetDir = await makeTempDir();
    const repoRoot = targetDir;

    const file = { path: '.github/workflows/harny-feedback.yml', contents: 'x\n', root: 'repo' as const };
    expect(displayPath(file, targetDir, repoRoot)).toBe('.github/workflows/harny-feedback.yml');
  });

  it('returns a "../"-prefixed path, one segment per install-path depth, for a repo-rooted file in a subdirectory install', async () => {
    const { displayPath } = await import('../src/writer.js');
    const repoRoot = await makeTempDir();
    const targetDir = path.join(repoRoot, 'apps', 'web');
    await fs.mkdir(targetDir, { recursive: true });

    const file = {
      path: '.github/workflows/harny-feedback-apps-web.yml',
      contents: 'x\n',
      root: 'repo' as const,
    };
    expect(displayPath(file, targetDir, repoRoot)).toBe(
      '../../.github/workflows/harny-feedback-apps-web.yml',
    );
  });
});
