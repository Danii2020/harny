/**
 * Spec: specs/readiness-doctor
 * Covers: contract.md "Public API — src/doctor.ts" (G2, G3, G8); § Data Models
 * (the `require` list's fixed order and constant provenance); § "Public API —
 * src/errors.ts" (`NOT_READY`); Behavior Guarantees 6, 8, 9, 10, 11, 17, 18;
 * Error Handling Contract rows for a missing runner/shared-module pre-flight,
 * a completed red run, and a completed green run; intent.md SC4, SC5, SC6,
 * SC17, SC19; audit.md Test Coverage T1-T5.
 *
 * Does NOT cover SC15 (this repo's own scaffolded copy of the readiness
 * script is byte-identical to what `npx harny init` produces for a
 * downstream repo — a dogfood-fidelity check, not a `src/doctor.ts` unit) or
 * SC20 (the `doctor` verb and a direct `node run-doctor.mjs` invocation agree
 * on the same repo state — no test here drives both invocation paths against
 * the same fixture and compares them). Both hold at runtime but are
 * unverified by any test in this file as of this writing.
 *
 * `src/doctor.ts` does not exist yet at red time, so every test below is
 * expected to fail on module resolution ("Cannot find module '../src/doctor.js'"
 * or vitest's "Failed to resolve import"), not on a wrong assumption about the
 * module's shape. The `buildRuntimeSharedFiles`/`SHARED_PROBES_PATH` tests
 * against `src/engine.ts` are expected to fail with "does not provide an
 * export named ..." instead, since `src/engine.ts` already exists but has not
 * yet gained them (contract.md § State Changes).
 *
 * Mirrors `src/doctor.ts` per AGENTS.md S6 (tests mirror src/).
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Generator } from '../src/generators/types.js';

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'harny-doctor-unit-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

/** Minimal fake `Generator` — mirrors `tests/generators/registry.test.ts`'s
 *  `fakeGenerator` convention, scoped to the two fields `buildDoctorChecks`
 *  actually needs (`skillsDir`, `conductorPath`). */
function fakeGenerator(id: string, skillsDir: string, conductorPath: string): Generator {
  return {
    id,
    displayName: `fake ${id} (test evidence only)`,
    agentsDir: `.${id}/agents`,
    wrapperFormat: 'markdown-yaml',
    conductorPath,
    skillsDir,
    hooksPath: `.${id}/hooks.json`,
    roleFileName: (roleId) => `${roleId}.md`,
    mapModel: (tier, override) => override ?? tier,
    mapCapabilities: () => ({ tokens: [], notes: [] }),
    renderRole: () => ({ path: 'unused.md', contents: '\n' }),
    renderConductor: () => ({ path: 'unused.md', contents: '\n' }),
    renderHook: () => undefined,
  } as Generator;
}

function fakeConfig(overrides: { tools?: readonly string[]; stack?: string } = {}) {
  return {
    version: 1 as const,
    tools: overrides.tools ?? (['claude-code'] as const),
    roles: [{ id: 'sdd-architect' as const, tier: 'most-capable' as const }],
    gates: ['post-specs', 'post-red-tests', 'post-audit'] as const,
    skills: ['harny-propose'] as const,
    stack: overrides.stack,
  };
}

describe('buildDoctorChecks — determinism, fixed order, no environment leakage (T1, BG-17)', () => {
  it('produces byte-identical JSON-serializable output for two calls with the same config and generators', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });

    const first = buildDoctorChecks(config as any, generators);
    const second = buildDoctorChecks(config as any, generators);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('carries no timestamp and no absolute path anywhere in the serialized output', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });

    const serialized = JSON.stringify(buildDoctorChecks(config as any, generators));

    // No ISO-8601-shaped timestamp.
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // No POSIX-absolute or Windows-drive-absolute path.
    expect(serialized).not.toMatch(/"\/(?!\/)[^"]*"/);
    expect(serialized).not.toMatch(/"[A-Za-z]:\\\\/);
  });

  it('imports every path/spec constant from its owning module rather than re-typing it (S5)', async () => {
    const { buildDoctorChecks, SPECS_DIR, RESERVED_SPEC_DIRS, SHIPPED_MARKER, APPROVED_VERDICTS } = await import(
      '../src/doctor.js'
    );
    const { SPEC_SCHEMA_DIR, HARNESS_CONFIG_PATH } = await import('../src/engine.js');
    const { FEEDBACK_RUNNER_PATH, CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const { SPEC_SCHEMA_NAMES } = await import('../src/templates.js');
    const { CORE_SKILL_IDS } = await import('../src/vocabulary.js');

    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const checks = buildDoctorChecks(fakeConfig({ stack: 'typescript' }) as any, generators);

    expect(checks.version).toBe(1);
    expect(checks.specs.dir).toBe(SPECS_DIR);
    expect(checks.specs.reservedDirs).toEqual(RESERVED_SPEC_DIRS);
    expect(checks.specs.schemaFiles).toEqual([...SPEC_SCHEMA_NAMES]);
    expect(checks.specs.shippedMarker).toBe(SHIPPED_MARKER);
    expect(checks.specs.approvedVerdicts).toEqual([...APPROVED_VERDICTS]);

    const serialized = JSON.stringify(checks);
    expect(serialized).toContain(HARNESS_CONFIG_PATH);
    expect(serialized).toContain(FEEDBACK_RUNNER_PATH);
    expect(serialized).toContain(CI_WORKFLOW_PATH);
    expect(serialized).toContain('.claude/skills/sdd-conductor/SKILL.md');
    for (const coreId of CORE_SKILL_IDS) {
      expect(serialized).toContain(coreId);
    }
  });

  it('carries the resolved stack profile\'s readiness commands, in profile order, never a "test" kind command from profile.commands', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const { STACK_PROFILES } = await import('../src/feedback.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];

    const checks = buildDoctorChecks(fakeConfig({ stack: 'typescript' }) as any, generators);
    const typescriptProfile = STACK_PROFILES.find((p) => p.id === 'typescript')!;

    expect(checks.commands.map((c) => c.id)).toEqual((typescriptProfile.readiness ?? []).map((c) => c.id));
    for (const command of checks.commands) {
      expect(command.kind).toBe('test');
    }
  });

  it('an unresolved stack yields an empty commands array, never a throw (BG-8)', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];

    const checks = buildDoctorChecks(fakeConfig({ stack: 'some-unrecognized-stack-xyz' }) as any, generators);

    expect(checks.commands).toEqual([]);
  });
});

describe('buildDoctorFiles / buildRuntimeSharedFiles — tolerated absence for lean fixtures (T2)', () => {
  it('buildDoctorFiles returns [] when payload.doctorRunner is absent', async () => {
    const { buildDoctorFiles } = await import('../src/doctor.js');

    const payload = { config: fakeConfig({ stack: 'typescript' }) } as any;
    expect(buildDoctorFiles(payload, [])).toEqual([]);
  });

  it('buildRuntimeSharedFiles returns [] when payload.sharedProbes is absent', async () => {
    const { buildRuntimeSharedFiles } = await import('../src/engine.js');

    const payload = { config: fakeConfig({ stack: 'typescript' }) } as any;
    expect(buildRuntimeSharedFiles(payload)).toEqual([]);
  });

  it('buildDoctorFiles emits the runner verbatim and a pretty-printed, newline-terminated checks.json when doctorRunner is present', async () => {
    const { buildDoctorFiles, buildDoctorChecks, DOCTOR_RUNNER_PATH, DOCTOR_CHECKS_PATH } = await import(
      '../src/doctor.js'
    );

    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });
    const payload = {
      config,
      doctorRunner: { name: 'run-doctor.mjs', contents: '#!/usr/bin/env node\nRUNNER\n', sourcePath: 'doctor/run-doctor.mjs' },
    } as any;

    const files = buildDoctorFiles(payload, generators);

    expect(files).toHaveLength(2);
    const runnerFile = files.find((f) => f.path === DOCTOR_RUNNER_PATH);
    expect(runnerFile?.contents).toBe('#!/usr/bin/env node\nRUNNER\n');

    const checksFile = files.find((f) => f.path === DOCTOR_CHECKS_PATH);
    expect(checksFile).toBeDefined();
    const expectedChecks = buildDoctorChecks(config as any, generators);
    expect(checksFile!.contents).toBe(`${JSON.stringify(expectedChecks, null, 2)}\n`);
  });

  it('buildRuntimeSharedFiles emits the shared probes module verbatim at SHARED_PROBES_PATH when present', async () => {
    const { buildRuntimeSharedFiles, SHARED_PROBES_PATH } = await import('../src/engine.js');

    const payload = {
      config: fakeConfig({ stack: 'typescript' }),
      sharedProbes: { name: 'probes.mjs', contents: 'export function probeSatisfied() {}\n', sourcePath: 'shared/probes.mjs' },
    } as any;

    const files = buildRuntimeSharedFiles(payload);

    expect(files).toEqual([{ path: SHARED_PROBES_PATH, contents: 'export function probeSatisfied() {}\n' }]);
    expect(SHARED_PROBES_PATH).toBe('.sdd/shared/probes.mjs');
  });
});

describe('runDoctor — pre-flight, exit-code translation, and no-write proof (T3, T4, T5)', () => {
  async function makeScaffoldedTarget(stubRunnerBody: string): Promise<string> {
    const targetDir = await makeTempDir();
    const { DOCTOR_RUNNER_PATH } = await import('../src/doctor.js');
    const { SHARED_PROBES_PATH } = await import('../src/engine.js');

    await fs.mkdir(path.dirname(path.join(targetDir, DOCTOR_RUNNER_PATH)), { recursive: true });
    await fs.writeFile(path.join(targetDir, DOCTOR_RUNNER_PATH), stubRunnerBody, 'utf8');
    await fs.mkdir(path.dirname(path.join(targetDir, SHARED_PROBES_PATH)), { recursive: true });
    await fs.writeFile(path.join(targetDir, SHARED_PROBES_PATH), 'export function probeSatisfied() { return true; }\n', 'utf8');

    return targetDir;
  }

  function collectingIO() {
    const warnings: string[] = [];
    return { io: { log: () => {}, warn: (m: string) => warnings.push(m) }, warnings };
  }

  it('raises USAGE naming both missing paths and the remediation when neither the runner nor the shared module is scaffolded (T4)', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
      expect.unreachable('expected runDoctor to throw USAGE');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = ((err as Error).message + ((err as any).details ?? []).join(' '));
      expect(message).toContain('.sdd/doctor/run-doctor.mjs');
      expect(message).toContain('.sdd/shared/probes.mjs');
      expect(message).toContain('npx harny init');
    }
  });

  it('raises USAGE naming only the missing shared module when the runner is present but the shared module is not', async () => {
    const { runDoctor, DOCTOR_RUNNER_PATH } = await import('../src/doctor.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeTempDir();
    await fs.mkdir(path.dirname(path.join(targetDir, DOCTOR_RUNNER_PATH)), { recursive: true });
    await fs.writeFile(path.join(targetDir, DOCTOR_RUNNER_PATH), 'process.exit(0);\n', 'utf8');

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
      expect.unreachable('expected runDoctor to throw USAGE');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = ((err as Error).message + ((err as any).details ?? []).join(' '));
      expect(message).toContain('.sdd/shared/probes.mjs');
      expect(message).not.toContain('.sdd/doctor/run-doctor.mjs is missing');
    }
  });

  it('translates a runner exit 0 into { ready: true } (T3, BG-6)', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const targetDir = await makeScaffoldedTarget('process.exit(0);\n');

    const result = await runDoctor({ targetDir, io: collectingIO().io });

    expect(result.ready).toBe(true);
  });

  it('translates a runner exit 2 into a thrown HarnessError("NOT_READY") whose exitCode is 6 (T3, BG-6)', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const { isHarnessError, EXIT } = await import('../src/errors.js');
    const targetDir = await makeScaffoldedTarget('process.exit(2);\n');

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
      expect.unreachable('expected runDoctor to throw NOT_READY');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('NOT_READY');
      expect((err as any).exitCode).toBe(EXIT.NOT_READY);
      expect(EXIT.NOT_READY).toBe(6);
    }
  });

  it('re-throws a plain (non-HarnessError) Error disclosing the observed code and the runner path for any other runner exit code (BG-6)', async () => {
    const { runDoctor, DOCTOR_RUNNER_PATH } = await import('../src/doctor.js');
    const { isHarnessError } = await import('../src/errors.js');
    const targetDir = await makeScaffoldedTarget('process.exit(1);\n');

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
      expect.unreachable('expected runDoctor to throw a plain Error');
    } catch (err) {
      expect(isHarnessError(err)).toBe(false);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain('1');
      expect((err as Error).message).toContain(DOCTOR_RUNNER_PATH);
    }
  });

  it('never calls process.exit itself (cli-init.md invariant 2)', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const targetDir = await makeScaffoldedTarget('process.exit(0);\n');
    const exitSpy = (await import('vitest')).vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code}) was called — runDoctor must never call it directly`);
    }) as never);

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
    } finally {
      exitSpy.mockRestore();
    }
  });

  it('writes absolutely nothing under the target directory, even on a red (not-ready) run (T5, SC19)', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const targetDir = await makeScaffoldedTarget('process.exit(2);\n');

    async function snapshot(dir: string): Promise<Record<string, string>> {
      const out: Record<string, string> = {};
      async function walk(current: string) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            out[path.relative(dir, full)] = await fs.readFile(full, 'utf8');
          }
        }
      }
      await walk(dir);
      return out;
    }

    const before = await snapshot(targetDir);

    await runDoctor({ targetDir, io: collectingIO().io }).catch(() => {
      // NOT_READY is expected; only the filesystem effect (none) is under test.
    });

    const after = await snapshot(targetDir);
    expect(after).toEqual(before);
  });
});
