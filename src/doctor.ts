/**
 * The readiness-check composition root (contract.md "Public API — src/doctor.ts",
 * G2, G3, G8). Same model -> build -> compose layering `feedback.ts` -> `engine.ts`
 * -> `init.ts` already uses. Import direction is strictly downward: `cli.ts` ->
 * `doctor.ts` -> `engine.ts` / `feedback.ts` / `templates.ts` / `vocabulary.ts`;
 * `init.ts` -> `doctor.ts`. Nothing imports `doctor.ts` back (CLI-11).
 */
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { EXIT, HarnessError } from './errors.js';
import { validateConfig } from './config.js';
import type { HarnessConfig } from './config.js';
import { HARNESS_CONFIG_PATH, SHARED_PROBES_PATH, SPEC_SCHEMA_DIR, skillRootsFor } from './engine.js';
import type { HarnessPayload } from './engine.js';
import { CI_WORKFLOW_PATH, FEEDBACK_RUNNER_PATH, resolveStackProfile } from './feedback.js';
import type { ReadinessCommand, ToolProbe } from './feedback.js';
import { SPEC_SCHEMA_NAMES } from './templates.js';
import { CORE_SKILL_IDS } from './vocabulary.js';
import { getGenerator } from './generators/index.js';
import type { Generator, GeneratedFile } from './generators/types.js';
import type { InitIO } from './init.js';

/** POSIX paths, relative to the target repo root. Owned here; imported everywhere
 *  else, never re-literalled (S5) — the same rule `FEEDBACK_RUNNER_PATH` follows. */
export const DOCTOR_RUNNER_PATH = '.sdd/doctor/run-doctor.mjs';
export const DOCTOR_CHECKS_PATH = '.sdd/doctor/checks.json';
/** The spec-directory convention `AGENTS.md` § "The SDD spec schema" fixes. No
 *  `src/` module owned this string before this feature; this is now its only home. */
export const SPECS_DIR = 'specs';
/** Reserved `specs/` subdirectory names that are not features (`harny-sync`
 *  guardrails: "`<feature>` is neither `current` nor `archived`"). */
export const RESERVED_SPEC_DIRS = ['current', 'archived'] as const;
/** The header `harny-document` stamps and `harny-sync` archive mode requires. */
export const SHIPPED_MARKER = 'Shipped:';
/** The two non-`REJECTED` verdicts `harny-sync` archive mode accepts. */
export const APPROVED_VERDICTS = ['APPROVED WITH RESERVATIONS', 'APPROVED'] as const;

/** One "is this present?" assertion. `anyOf` is satisfied when ANY listed path
 *  exists. `requires` gates the entry itself: when the probe is false the entry is
 *  SKIPPED with a notice, never failed (BG-9) — the entry-level application of
 *  `I3`, and what makes this harness legible in a repo that was never scaffolded
 *  by `harny init` (BG-9). */
export interface DoctorCheck {
  readonly id: string;
  readonly description: string;
  readonly anyOf: readonly string[];
  readonly remediation: string;
  readonly requires?: ToolProbe;
}

/** The generated data file's schema. Every value in it is derived at generation
 *  time from code that already owns it; the runner script hard-codes none of them
 *  (BG-3). */
export interface DoctorChecksFile {
  readonly version: 1;
  readonly specs: {
    readonly dir: string;
    readonly reservedDirs: readonly string[];
    readonly schemaFiles: readonly string[];
    readonly shippedMarker: string;
    readonly approvedVerdicts: readonly string[];
  };
  readonly require: readonly DoctorCheck[];
  readonly commands: readonly ReadinessCommand[];
}

/** Every entry below `harness-manifest` itself depends on this repo having been
 *  scaffolded by `harny init` at all — gated on the same file `harness-manifest`
 *  checks for, so an un-scaffolded repo SKIPS them rather than failing (see
 *  contract.md § Data Models "Why the `.sdd/harness.json` gate exists"). */
const HARNESS_GATE: ToolProbe = { anyFile: [HARNESS_CONFIG_PATH] };

/** Dedupes while preserving first-seen order — deterministic given a deterministic
 *  input order (BG-17). */
function dedupePreserveOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/** Pure: same config + same resolved generators ⇒ byte-identical result (CLI-4). */
export function buildDoctorChecks(
  config: HarnessConfig,
  generators: readonly Generator[],
): DoctorChecksFile {
  const require: DoctorCheck[] = [];

  require.push({
    id: 'conventions-doc',
    description: 'a conventions document (AGENTS.md or CLAUDE.md) exists',
    anyOf: ['AGENTS.md', 'CLAUDE.md'],
    remediation: "add an AGENTS.md (or CLAUDE.md) documenting this repo's conventions",
  });

  require.push({
    id: 'harness-manifest',
    description: `${HARNESS_CONFIG_PATH} exists`,
    anyOf: [HARNESS_CONFIG_PATH],
    remediation: `run npx harny init to scaffold ${HARNESS_CONFIG_PATH}`,
  });

  for (const name of SPEC_SCHEMA_NAMES) {
    const schemaPath = `${SPEC_SCHEMA_DIR}/${name}.md`;
    require.push({
      id: `spec-schema:${name}`,
      description: `${schemaPath} exists`,
      anyOf: [schemaPath],
      remediation: `run npx harny init to scaffold ${schemaPath}`,
      requires: HARNESS_GATE,
    });
  }

  require.push({
    id: 'feedback-runner',
    description: `${FEEDBACK_RUNNER_PATH} is scaffolded`,
    anyOf: [FEEDBACK_RUNNER_PATH],
    remediation: `run npx harny init and commit ${FEEDBACK_RUNNER_PATH}`,
    requires: HARNESS_GATE,
  });

  require.push({
    id: 'ci-workflow',
    description: `${CI_WORKFLOW_PATH} is scaffolded`,
    anyOf: [CI_WORKFLOW_PATH],
    remediation: `run npx harny init and commit ${CI_WORKFLOW_PATH}`,
    requires: HARNESS_GATE,
  });

  for (const conductorPath of dedupePreserveOrder(generators.map((generator) => generator.conductorPath))) {
    require.push({
      id: `conductor:${conductorPath}`,
      description: `${conductorPath} exists`,
      anyOf: [conductorPath],
      remediation: `run npx harny init and commit ${conductorPath}`,
      requires: HARNESS_GATE,
    });
  }

  for (const root of skillRootsFor(generators)) {
    for (const skillId of CORE_SKILL_IDS) {
      const skillPath = `${root}/${skillId}/SKILL.md`;
      require.push({
        id: `core-skills:${root}/${skillId}`,
        description: `${skillPath} exists`,
        anyOf: [skillPath],
        remediation: `run npx harny init and commit ${skillPath}`,
      });
    }
  }

  const knowledgeBaseDir = `${SPECS_DIR}/current`;
  require.push({
    id: 'knowledge-base',
    description: `${knowledgeBaseDir}/_index.md exists`,
    anyOf: [`${knowledgeBaseDir}/_index.md`],
    remediation: `create ${knowledgeBaseDir}/_index.md (see harny-sync)`,
    requires: { anyFile: [knowledgeBaseDir] },
  });

  const profile = resolveStackProfile(config.stack);

  return {
    version: 1,
    specs: {
      dir: SPECS_DIR,
      reservedDirs: RESERVED_SPEC_DIRS,
      schemaFiles: SPEC_SCHEMA_NAMES,
      shippedMarker: SHIPPED_MARKER,
      approvedVerdicts: APPROVED_VERDICTS,
    },
    require,
    commands: profile?.readiness ?? [],
  };
}

/** The runner script (verbatim) + the checks file. Tool-neutral: written exactly
 *  once per run regardless of tool count, the `CLI-8`/`BG-10` rule. Returns `[]`
 *  when the loaded templates root carries no `doctor/run-doctor.mjs` — the same
 *  tolerated-absence posture `buildFeedbackFiles` takes. */
export function buildDoctorFiles(
  payload: HarnessPayload,
  generators: readonly Generator[],
): readonly GeneratedFile[] {
  if (!payload.doctorRunner) {
    return [];
  }

  const checks = buildDoctorChecks(payload.config, generators);

  return [
    { path: DOCTOR_RUNNER_PATH, contents: payload.doctorRunner.contents },
    { path: DOCTOR_CHECKS_PATH, contents: `${JSON.stringify(checks, null, 2)}\n` },
  ];
}

/** Composition root for the `doctor` verb (G8). Locates the scaffolded runner,
 *  computes the checks, spawns the runner with `stdio: 'inherit'` so its report
 *  reaches the user verbatim, and translates the runner's exit code. Never writes,
 *  never prompts, never calls `process.exit` (cli-init.md invariant 2). */
export interface DoctorOptions {
  readonly targetDir: string;
  /** `--stack`, overriding `.sdd/harness.json`'s recorded value when both exist. */
  readonly stack?: string;
  readonly io: InitIO;
}

export interface DoctorResult {
  readonly ready: boolean;
  /** `id` of every `require`/command check that ran, skipped, or failed. */
  readonly ran: readonly string[];
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
}

/** The degenerate config `runDoctor` computes checks against when
 *  `.sdd/harness.json` is absent or unreadable: no known tools (so `conductor`/
 *  `core-skills` contribute no entries), and whatever `--stack` was passed on the
 *  command line, if any. */
function fallbackConfig(stack: string | undefined): HarnessConfig {
  return { version: 1, tools: [], roles: [], gates: [], skills: [...CORE_SKILL_IDS], stack };
}

/** Reads `.sdd/harness.json` when present, tolerating its absence (a repo this
 *  tool never scaffolded — see contract.md § Data Models "Why the
 *  `.sdd/harness.json` gate exists"). A present-but-unreadable/invalid file is
 *  tolerated the same way, with a warning, rather than raising a `USAGE` error
 *  that would make the doctor itself the thing standing in the way of "is this
 *  repo ready." */
async function resolveTargetConfig(targetDir: string, io: InitIO): Promise<HarnessConfig | undefined> {
  const harnessJsonPath = path.join(targetDir, HARNESS_CONFIG_PATH);
  let raw: string;
  try {
    raw = await fs.readFile(harnessJsonPath, 'utf8');
  } catch {
    return undefined;
  }

  try {
    return validateConfig(JSON.parse(raw), harnessJsonPath);
  } catch (err) {
    io.warn(
      `Could not parse ${HARNESS_CONFIG_PATH}: ${(err as Error).message}. ` +
        'Proceeding as if this repo had never been scaffolded by harny init.',
    );
    return undefined;
  }
}

function resolveGenerators(config: HarnessConfig | undefined): readonly Generator[] {
  if (!config) {
    return [];
  }
  const resolved: Generator[] = [];
  for (const toolId of config.tools) {
    const generator = getGenerator(toolId);
    if (generator) {
      resolved.push(generator);
    }
  }
  return resolved;
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorResult> {
  const { targetDir, io } = options;

  const runnerAbsolutePath = path.join(targetDir, DOCTOR_RUNNER_PATH);
  const probesAbsolutePath = path.join(targetDir, SHARED_PROBES_PATH);

  const missing: string[] = [];
  if (!fsSync.existsSync(runnerAbsolutePath)) {
    missing.push(DOCTOR_RUNNER_PATH);
  }
  if (!fsSync.existsSync(probesAbsolutePath)) {
    missing.push(SHARED_PROBES_PATH);
  }
  if (missing.length > 0) {
    throw new HarnessError(
      'USAGE',
      `Readiness check is not scaffolded in ${targetDir}: missing ${missing.join(', ')}.`,
      [`Run npx harny init to scaffold ${missing.join(' and ')}, then commit the result.`],
    );
  }

  const persistedConfig = await resolveTargetConfig(targetDir, io);
  const generators = resolveGenerators(persistedConfig);
  const config: HarnessConfig = persistedConfig
    ? { ...persistedConfig, stack: options.stack ?? persistedConfig.stack }
    : fallbackConfig(options.stack);

  const checks = buildDoctorChecks(config, generators);
  const checksJson = JSON.stringify(checks);

  const result = spawnSync(process.execPath, [runnerAbsolutePath, '--checks', checksJson], {
    cwd: targetDir,
    stdio: 'inherit',
  });

  const ran = [...checks.require.map((entry) => entry.id), ...checks.commands.map((command) => command.id)];

  if (result.status === EXIT.OK) {
    return { ready: true, ran, skipped: [], failed: [] };
  }
  if (result.status === 2) {
    throw new HarnessError(
      'NOT_READY',
      `Readiness check reported this repo is not ready. See the report above (${DOCTOR_RUNNER_PATH}).`,
    );
  }

  throw new Error(
    `${DOCTOR_RUNNER_PATH} exited with unexpected code ${String(result.status)} (expected 0 or 2).`,
  );
}
