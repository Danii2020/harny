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
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: contract.md "Public API — src/doctor.ts" (`CheckTier`, `AGENTS_GUIDANCE_PATH`,
 * `README_PATHS`, `ARCHITECTURE_PATHS`, `REPO_READINESS_FAMILY_LABEL`,
 * `buildRepoReadinessChecks`) and § Data Models ("The fifth family's entries",
 * "Verified per-tool root instruction files"); Behavior Guarantees AR-6, AR-7, AR-8,
 * AR-9, AR-10, AR-13; intent.md SC2, SC3, SC6, SC7, SC9; audit.md Test Coverage
 * T1-T5.
 *
 * `buildRepoReadinessChecks` does not exist yet at red time, so every test below is
 * expected to fail with "does not provide an export named 'buildRepoReadinessChecks'"
 * (or the sibling constants), not a wrong assumption about the family's shape. The
 * real-generator integration block additionally expects a `TypeError` once
 * `guidancePath` is read off a real generator that does not declare it yet
 * (`src/generators/types.ts`/`*.ts` — a separate, later red-phase failure once the
 * constant-resolution failure above is fixed first).
 *
 * Spec: specs/ai-sdlc-readiness
 * Covers: post-audit fix for audit.md finding F1 (HIGH) — `runDoctor`'s `spawnSync`
 * call gained `stdio: ['ignore', 'pipe', 'pipe']` + `encoding: 'utf8'` so its new
 * CLI-level tests could observe the runner's report (contract.md AR-3/AR-16), but
 * shipped with no `maxBuffer` and no `result.error` handling, so a runner report
 * exceeding Node's 1 MiB `spawnSync` default surfaced as a plain, non-`HarnessError`
 * "unexpected code null" (`EXIT.UNEXPECTED`) instead of a diagnosable failure —
 * silently inverting a correctly-run red result into an apparently broken runner.
 * Covers the fix: a generous `maxBuffer` plus explicit `result.error` handling that
 * throws `HarnessError('USAGE')`, never the generic fallthrough `Error`.
 *
 * ---
 * Spec: specs/ci-workflow-root
 * Covers: contract.md "Public API — src/doctor.ts (MODIFIED)" (`buildDoctorChecks`
 * and `buildDoctorFiles`'s defaulted `placement` parameter, the `ci-workflow`
 * entry's placement-derived `anyOf`/`description`/`remediation`); Behavior
 * Guarantees DR-1, DR-2, DR-3; intent.md SC11, SC12; audit.md Test Coverage
 * T20, T21.
 *
 * `buildDoctorChecks` does not accept a third `placement` argument yet at red
 * time, so every test below that imports `src/repo.js` for its expected value
 * (`ciWorkflowPathFromInstallDir`) is expected to fail on module resolution.
 * The root-placement byte-identity test, the `buildDoctorFiles`-forwards test,
 * and the "every other family is unaffected" test are declared exceptions,
 * following this file's own established convention for such cases: with the
 * third argument currently ignored, calling with or without a placement
 * produces identical output today, so these three pass already at red time
 * and become live regression guards once `placement` actually varies the
 * `ci-workflow` entry.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Generator } from '../src/generators/types.js';
import { REPO_ROOT } from './helpers/paths.js';

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
 *  `fakeGenerator` convention, scoped to the fields `buildDoctorChecks`/
 *  `buildRepoReadinessChecks` actually need (`skillsDir`, `conductorPath`,
 *  `guidancePath`). `guidancePath` defaults to `undefined` so every pre-existing
 *  call site in this file (written before ai-sdlc-readiness) keeps working
 *  unchanged. */
function fakeGenerator(
  id: string,
  skillsDir: string,
  conductorPath: string,
  guidancePath?: string,
): Generator {
  return {
    id,
    displayName: `fake ${id} (test evidence only)`,
    agentsDir: `.${id}/agents`,
    wrapperFormat: 'markdown-yaml',
    conductorPath,
    skillsDir,
    hooksPath: `.${id}/hooks.json`,
    guidancePath,
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

  it('reports a diagnosable HarnessError("USAGE") instead of crashing when the runner\'s output exceeds the capture buffer', async () => {
    const { runDoctor } = await import('../src/doctor.js');
    const { isHarnessError } = await import('../src/errors.js');
    // 70 MiB of stdout comfortably exceeds runDoctor's internal maxBuffer,
    // forcing spawnSync to report ENOBUFS (result.error) with result.status
    // null — the exact shape a large red-suite report can produce in practice
    // (family 5 embeds a failing test command's entire combined stdout+stderr
    // into a single FAIL line).
    // The write's callback (fired once the data is fully handed to the kernel)
    // gates process.exit — calling exit() synchronously right after write()
    // would truncate the pipe before the 70 MiB is flushed, a Node stdout/pipe
    // gotcha unrelated to the behavior under test here.
    const targetDir = await makeScaffoldedTarget(
      "process.stdout.write('x'.repeat(70 * 1024 * 1024), () => process.exit(2));\n",
    );

    try {
      await runDoctor({ targetDir, io: collectingIO().io });
      expect.unreachable('expected runDoctor to throw a HarnessError');
    } catch (err) {
      expect(isHarnessError(err)).toBe(true);
      expect((err as any).code).toBe('USAGE');
      const message = (err as Error).message + ((err as any).details ?? []).join(' ');
      expect(message.toLowerCase()).toContain('could not be run to completion');
      expect(message).toContain('.sdd/doctor/run-doctor.mjs');
    }
  }, 20000);
});

describe('buildRepoReadinessChecks — the three entry kinds, exactly as tabulated (AR-6, T1)', () => {
  it('the readme entry is must-have, ungated, anyOf README.md, with the contracted remediation', async () => {
    const { buildRepoReadinessChecks, README_PATHS } = await import('../src/doctor.js');

    const entries = buildRepoReadinessChecks([]);
    const readme = entries.find((e) => e.id === 'repo-readiness:readme');

    expect(readme).toBeDefined();
    expect(readme!.tier).toBe('must-have');
    expect(readme!.anyOf).toEqual([...README_PATHS]);
    expect(readme!.requires).toBeUndefined();
    expect(readme!.remediation).toBe('add a README.md describing what this project is and how to run it');
  });

  it('the architecture entry is recommended, ungated, anyOf all three accepted paths', async () => {
    const { buildRepoReadinessChecks, ARCHITECTURE_PATHS, AGENTS_GUIDANCE_PATH } = await import('../src/doctor.js');

    const entries = buildRepoReadinessChecks([]);
    const architecture = entries.find((e) => e.id === 'repo-readiness:architecture');

    expect(architecture).toBeDefined();
    expect(architecture!.tier).toBe('recommended');
    expect(architecture!.anyOf).toEqual([...ARCHITECTURE_PATHS]);
    expect(architecture!.anyOf).toContain(AGENTS_GUIDANCE_PATH);
    expect(architecture!.requires).toBeUndefined();
  });

  it('readme is first and architecture is second, regardless of which generators are resolved', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');

    const entries = buildRepoReadinessChecks([
      fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md', 'CLAUDE.md'),
    ]);

    expect(entries[0]?.id).toBe('repo-readiness:readme');
    expect(entries[1]?.id).toBe('repo-readiness:architecture');
  });

  it('with no generators resolved, only the two universal entries exist — no agent-guidance entry', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');

    const entries = buildRepoReadinessChecks([]);

    expect(entries.map((e) => e.id)).toEqual(['repo-readiness:readme', 'repo-readiness:architecture']);
  });
});

describe('buildRepoReadinessChecks — per-tool agent-guidance entries are derived, never enumerated (AR-8, AR-9, AR-10, T2)', () => {
  it('emits one recommended, harness-gated entry per distinct declared guidancePath, in resolved order, first-seen deduped, undefined filtered', async () => {
    const { buildRepoReadinessChecks, AGENTS_GUIDANCE_PATH } = await import('../src/doctor.js');
    const { HARNESS_CONFIG_PATH } = await import('../src/engine.js');

    // Deliberately fake, non-real-tool paths: if `buildRepoReadinessChecks`
    // hard-coded a real tool's path instead of reading `guidancePath` off each
    // generator, these fake values would never appear in the output.
    const gA = fakeGenerator('tool-a', '.a/skills', '.a/conductor.md', 'fake/a-guidance.md');
    const gB = fakeGenerator('tool-b', '.b/skills', '.b/conductor.md', undefined);
    const gC = fakeGenerator('tool-c', '.c/skills', '.c/conductor.md', 'fake/c-guidance.md');
    const gD = fakeGenerator('tool-d', '.d/skills', '.d/conductor.md', 'fake/a-guidance.md'); // dup of gA's path

    const entries = buildRepoReadinessChecks([gA, gB, gC, gD]);
    const guidanceEntries = entries.filter((e) => e.id.startsWith('repo-readiness:agent-guidance:'));

    expect(guidanceEntries.map((e) => e.id)).toEqual([
      'repo-readiness:agent-guidance:fake/a-guidance.md',
      'repo-readiness:agent-guidance:fake/c-guidance.md',
    ]);
    for (const entry of guidanceEntries) {
      expect(entry.tier).toBe('recommended');
      expect(entry.requires).toEqual({ anyFile: [HARNESS_CONFIG_PATH] });
    }
    expect(guidanceEntries[0]!.anyOf).toEqual(['fake/a-guidance.md', AGENTS_GUIDANCE_PATH]);
    expect(guidanceEntries[0]!.remediation).toContain('fake/a-guidance.md');
  });

  it('a single-tool config yields exactly one agent-guidance entry for that tool', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');

    const entries = buildRepoReadinessChecks([
      fakeGenerator('tool-a', '.a/skills', '.a/conductor.md', 'fake/only-guidance.md'),
    ]);

    expect(entries.map((e) => e.id)).toEqual([
      'repo-readiness:readme',
      'repo-readiness:architecture',
      'repo-readiness:agent-guidance:fake/only-guidance.md',
    ]);
  });
});

describe('buildRepoReadinessChecks — integration against the real, resolved Generator instances (AR-8, AR-9, SC6, T2)', () => {
  it('claude-code alone contributes an agent-guidance entry for CLAUDE.md', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');

    const entries = buildRepoReadinessChecks([claudeCodeGenerator]);

    expect(entries.map((e) => e.id)).toContain('repo-readiness:agent-guidance:CLAUDE.md');
  });

  it('github-copilot alone contributes an agent-guidance entry for .github/copilot-instructions.md', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { githubCopilotGenerator } = await import('../src/generators/github-copilot.js');

    const entries = buildRepoReadinessChecks([githubCopilotGenerator]);

    expect(entries.map((e) => e.id)).toContain('repo-readiness:agent-guidance:.github/copilot-instructions.md');
  });

  it('kiro alone contributes an agent-guidance entry for .kiro/steering', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { kiroGenerator } = await import('../src/generators/kiro.js');

    const entries = buildRepoReadinessChecks([kiroGenerator]);

    expect(entries.map((e) => e.id)).toContain('repo-readiness:agent-guidance:.kiro/steering');
  });

  it('cursor alone contributes no agent-guidance entry — its guidance is AGENTS.md, already covered universally', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { cursorGenerator } = await import('../src/generators/cursor.js');

    const entries = buildRepoReadinessChecks([cursorGenerator]);

    expect(entries.map((e) => e.id)).toEqual(['repo-readiness:readme', 'repo-readiness:architecture']);
  });

  it('codex alone contributes no agent-guidance entry either, for the same reason', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { codexGenerator } = await import('../src/generators/codex.js');

    const entries = buildRepoReadinessChecks([codexGenerator]);

    expect(entries.map((e) => e.id)).toEqual(['repo-readiness:readme', 'repo-readiness:architecture']);
  });

  it('a multi-tool selection contributes one agent-guidance entry per distinct tool with a declared path, in resolved order, never one for cursor', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const { claudeCodeGenerator } = await import('../src/generators/claude-code.js');
    const { cursorGenerator } = await import('../src/generators/cursor.js');
    const { kiroGenerator } = await import('../src/generators/kiro.js');

    const entries = buildRepoReadinessChecks([claudeCodeGenerator, cursorGenerator, kiroGenerator]);
    const guidanceEntries = entries.filter((e) => e.id.startsWith('repo-readiness:agent-guidance:'));

    expect(guidanceEntries.map((e) => e.id)).toEqual([
      'repo-readiness:agent-guidance:CLAUDE.md',
      'repo-readiness:agent-guidance:.kiro/steering',
    ]);
  });
});

// Red-phase note: `.kiro/steering` and `.github/copilot-instructions.md` are new
// per-tool facts this feature introduces at all; `src/doctor.ts` legitimately
// contains neither today, so this structural guard already passes before any
// implementation lands — exactly the "nothing to violate yet, becomes a live
// regression guard" situation `tests/generators/registry.test.ts`'s own
// `--whole-project` guard documents for itself. It stays live and reported here
// so it starts protecting the instant `buildRepoReadinessChecks` is authored,
// rather than being added only after the fact. The companion behavioral tests
// above (arbitrary fake `guidancePath` values surviving unchanged) are the
// primary, stronger proof that the values are derived, not hard-coded; this is
// the one narrow structural literal-check the contract also calls for (SC7).
describe('src/doctor.ts hard-codes no per-tool guidance-path literal (AR-8, SC7, T5)', () => {
  it('contains neither .kiro/steering nor .github/copilot-instructions.md as a source literal — both must be read off a resolved Generator', async () => {
    const source = await fs.readFile(path.join(REPO_ROOT, 'src', 'doctor.ts'), 'utf8');

    expect(source).not.toContain('.kiro/steering');
    expect(source).not.toContain('.github/copilot-instructions.md');
  });
});

describe('buildDoctorChecks — the new family travels alongside the untouched require array (AR-7, AR-13, T3, T4)', () => {
  it('carries repoReadiness and repoReadinessLabel, equal to buildRepoReadinessChecks(generators) and REPO_READINESS_FAMILY_LABEL', async () => {
    const { buildDoctorChecks, buildRepoReadinessChecks, REPO_READINESS_FAMILY_LABEL } = await import(
      '../src/doctor.js'
    );
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md', 'CLAUDE.md')];
    const config = fakeConfig({ stack: 'typescript' });

    const checks = buildDoctorChecks(config as any, generators);

    expect(checks.repoReadinessLabel).toBe(REPO_READINESS_FAMILY_LABEL);
    expect(checks.repoReadiness).toEqual(buildRepoReadinessChecks(generators));
  });

  it('conventions-doc keeps its id, its first position in require, its anyOf, and carries no tier field (must-have unchanged)', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md', 'CLAUDE.md')];

    const checks = buildDoctorChecks(fakeConfig({ stack: 'typescript' }) as any, generators);

    expect(checks.require[0]?.id).toBe('conventions-doc');
    expect(checks.require[0]?.anyOf).toEqual(['AGENTS.md', 'CLAUDE.md']);
    expect('tier' in (checks.require[0] as object)).toBe(false);
  });

  it('the new family never duplicates conventions-doc — no repoReadiness entry shares its id', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md', 'CLAUDE.md')];

    const checks = buildDoctorChecks(fakeConfig({ stack: 'typescript' }) as any, generators);

    expect(checks.repoReadiness.some((entry) => entry.id === 'conventions-doc')).toBe(false);
  });

  it('buildRepoReadinessChecks is pure: identical generators produce byte-identical output across two calls', async () => {
    const { buildRepoReadinessChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md', 'CLAUDE.md')];

    const first = buildRepoReadinessChecks(generators);
    const second = buildRepoReadinessChecks(generators);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('ci-workflow-root — buildDoctorChecks\' ci-workflow entry follows placement (DR-1, DR-2) (T20)', () => {
  it('root placement (no placement argument, and an explicit { prefix: "" }) is byte-identical to today\'s entry', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const { CI_WORKFLOW_PATH } = await import('../src/feedback.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });

    const withoutPlacement = buildDoctorChecks(config as any, generators);
    const withRootPlacement = buildDoctorChecks(config as any, generators, { prefix: '' } as any);

    const entryWithout = withoutPlacement.require.find((c) => c.id === 'ci-workflow');
    const entryWithRoot = withRootPlacement.require.find((c) => c.id === 'ci-workflow');

    expect(entryWithout).toBeDefined();
    expect(entryWithRoot).toEqual(entryWithout);
    expect(entryWithout?.anyOf).toEqual([CI_WORKFLOW_PATH]);
  });

  it('a subdirectory placement names the install-relative workflow path in anyOf, description, and remediation', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const { ciWorkflowPathFromInstallDir } = await import('../src/repo.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];

    const checks = buildDoctorChecks(fakeConfig({ stack: 'typescript' }) as any, generators, {
      prefix: 'apps/web',
    } as any);
    const entry = checks.require.find((c) => c.id === 'ci-workflow')!;
    const expectedPath = ciWorkflowPathFromInstallDir('apps/web');

    expect(expectedPath).not.toBe('.github/workflows/harny-feedback.yml');
    expect(entry.anyOf).toEqual([expectedPath]);
    expect(entry.description).toContain(expectedPath);
    expect(entry.remediation).toContain(expectedPath);
  });

  it('buildDoctorFiles forwards its placement argument into the checks.json it writes', async () => {
    const { buildDoctorFiles, buildDoctorChecks, DOCTOR_CHECKS_PATH } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });
    const payload = {
      config,
      doctorRunner: { name: 'run-doctor.mjs', contents: '#!/usr/bin/env node\nRUNNER\n', sourcePath: 'doctor/run-doctor.mjs' },
    } as any;

    const files = buildDoctorFiles(payload, generators, { prefix: 'apps/web' } as any);
    const checksFile = files.find((f) => f.path === DOCTOR_CHECKS_PATH)!;
    const expectedChecks = buildDoctorChecks(config as any, generators, { prefix: 'apps/web' } as any);

    expect(checksFile.contents).toBe(`${JSON.stringify(expectedChecks, null, 2)}\n`);
  });
});

describe('ci-workflow-root — every other check family and entry is unaffected by placement (T21)', () => {
  it('only the ci-workflow entry differs between a root and a subdirectory placement', async () => {
    const { buildDoctorChecks } = await import('../src/doctor.js');
    const generators = [fakeGenerator('claude-code', '.claude/skills', '.claude/skills/sdd-conductor/SKILL.md')];
    const config = fakeConfig({ stack: 'typescript' });

    const root = buildDoctorChecks(config as any, generators);
    const subdir = buildDoctorChecks(config as any, generators, { prefix: 'apps/web' } as any);

    const rootRequireWithoutCi = root.require.filter((c) => c.id !== 'ci-workflow');
    const subdirRequireWithoutCi = subdir.require.filter((c) => c.id !== 'ci-workflow');
    expect(subdirRequireWithoutCi).toEqual(rootRequireWithoutCi);

    expect(subdir.repoReadiness).toEqual(root.repoReadiness);
    expect(subdir.repoReadinessLabel).toEqual(root.repoReadinessLabel);
    expect(subdir.commands).toEqual(root.commands);
    expect(subdir.specs).toEqual(root.specs);
    expect(subdir.version).toEqual(root.version);
  });
});
