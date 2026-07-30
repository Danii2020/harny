/**
 * Command/flag surface (`commander`), flag -> `PartialHarnessConfig`
 * translation, and error -> exit-code mapping.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Command, CommanderError } from 'commander';
import { EXIT, HarnessError, isHarnessError } from './errors.js';
import type { ExitCode } from './errors.js';
import { parseGateList, parseModelAssignment, parseRoleList, parseToolList } from './config.js';
import type { PartialHarnessConfig, RoleOverride } from './config.js';
import type { GateId, RoleId, ToolId } from './vocabulary.js';
import { runInit } from './init.js';
import type { InitIO } from './init.js';

const defaultIO: InitIO = {
  log: (message) => console.log(message),
  warn: (message) => console.warn(`Warning: ${message}`),
};

interface InitCommandOptions {
  readonly tools?: string;
  readonly roles?: string;
  readonly model: readonly string[];
  readonly gates?: string;
  readonly stack?: string;
  readonly config?: string;
  readonly yes?: boolean;
  readonly dryRun?: boolean;
  readonly force?: boolean;
}

function collectModel(value: string, previous: readonly string[]): readonly string[] {
  return [...previous, value];
}

/**
 * **(AMENDED — AL-1/AL-3.)** `--roles` sets `roleIds` only (membership); `--model`
 * sets `roleOverrides` only (per-id tweaks). The two flags are independent — this
 * function no longer couples them via `ids = roleIds ?? [...assignments.keys()]`,
 * which used to silently drop a `--model` assignment for a role `--roles` excluded.
 * That contradiction is now surfaced instead: `mergeConfig` raises `USAGE` for it
 * non-interactively (`runInit` step 4), or `runInit` step 6 warns for it
 * interactively.
 */
function buildRoleOverrides(opts: InitCommandOptions): readonly RoleOverride[] | undefined {
  if (opts.model.length === 0) return undefined;

  const assignments = new Map<RoleId, RoleOverride>();
  for (const raw of opts.model) {
    const parsed = parseModelAssignment(raw);
    assignments.set(parsed.role, { id: parsed.role, tier: parsed.tier, modelOverride: parsed.modelOverride });
  }
  return [...assignments.values()];
}

function buildOverrides(opts: InitCommandOptions): PartialHarnessConfig {
  const overrides: {
    tools?: readonly ToolId[];
    roleIds?: readonly RoleId[];
    roleOverrides?: readonly RoleOverride[];
    gates?: readonly GateId[];
    stack?: string;
  } = {};

  if (opts.tools !== undefined) {
    overrides.tools = parseToolList(opts.tools);
  }
  if (opts.roles !== undefined) {
    overrides.roleIds = parseRoleList(opts.roles);
  }
  const roleOverrides = buildRoleOverrides(opts);
  if (roleOverrides !== undefined) {
    overrides.roleOverrides = roleOverrides;
  }
  if (opts.gates !== undefined) {
    overrides.gates = parseGateList(opts.gates);
  }
  if (opts.stack !== undefined) {
    overrides.stack = opts.stack;
  }

  return overrides;
}

async function assertWritableDirectory(targetDir: string): Promise<void> {
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      throw new Error('not a directory');
    }
  } catch {
    throw new HarnessError('USAGE', `Target directory does not exist or is not writable: ${targetDir}`);
  }
}

async function runInitCommand(target: string, opts: InitCommandOptions, io: InitIO): Promise<void> {
  const targetDir = path.resolve(process.cwd(), target);
  await assertWritableDirectory(targetDir);

  const overrides = buildOverrides(opts);

  const yes = Boolean(opts.yes);
  const hasConfigFlag = opts.config !== undefined;

  let interactive: boolean;
  if (yes) {
    interactive = false;
  } else if (hasConfigFlag) {
    interactive = false;
  } else if (!process.stdin.isTTY) {
    throw new HarnessError(
      'USAGE',
      'Cannot prompt interactively: stdin is not a TTY. Use --yes to accept defaults, ' +
        'or --config <file> to supply a full configuration.',
    );
  } else {
    interactive = true;
  }

  const result = await runInit({
    targetDir,
    overrides,
    configFile: hasConfigFlag ? path.resolve(process.cwd(), opts.config!) : undefined,
    interactive,
    dryRun: Boolean(opts.dryRun),
    force: Boolean(opts.force),
    io,
  });

  if (result.dryRun) {
    io.log(`Dry run: ${result.planned.length} file(s) would be written to ${targetDir}; nothing was written.`);
  } else {
    io.log(`Wrote ${result.written.length} file(s) to ${targetDir}.`);
  }
}

/**
 * Builds the commander program. Exposed for tests; `io` defaults to console.
 *
 * MUST call `.name('harny')` explicitly. Commander otherwise derives the displayed
 * program name from `argv[1]`, which would render `Usage: harness.js [options]` —
 * leaking the internal file name into user-facing help. `--help` must read
 * `Usage: harny [options] [command]`.
 */
export function buildProgram(io: InitIO = defaultIO): Command {
  const program = new Command();
  program
    .name('harny')
    .description('Scaffold the SDD pipeline (agents, conductor, spec-schema templates) into a target repo.')
    .exitOverride();

  program
    .command('init')
    .description('Initialize the SDD harness in a target repository.')
    .argument('[target]', 'Target directory to scaffold into', '.')
    .option('--tools <list>', 'Comma list of tool ids, or "all"')
    .option('--roles <list>', 'Comma list of role ids, or "all"')
    .option('--model <assignment>', 'Repeatable: <role>=<tier-or-model-id>', collectModel, [] as string[])
    .option('--gates <list>', 'Comma list of gate ids, "all", or "none"')
    .option('--stack <name>', 'Project stack (captured only)')
    .option('--config <path>', 'JSON config file; implies non-interactive')
    .option('-y, --yes', 'Accept defaults, skip all prompts and the final confirmation')
    .option('--dry-run', 'Print the write plan; write nothing')
    .option('--force', 'Overwrite existing files')
    .action(async (target: string, cmdOptions: InitCommandOptions) => {
      await runInitCommand(target, cmdOptions, io);
    });

  return program;
}

/** Parses argv, runs the command, maps errors to exit codes. Never calls
 *  `process.exit` — returns the code so it is unit-testable. */
export async function main(argv: readonly string[]): Promise<ExitCode> {
  const program = buildProgram();
  try {
    await program.parseAsync(argv as string[], { from: 'user' });
    return EXIT.OK;
  } catch (err) {
    if (err instanceof CommanderError) {
      return err.exitCode as ExitCode;
    }
    if (isHarnessError(err)) {
      console.error(err.message);
      for (const detail of err.details) {
        console.error(`  ${detail}`);
      }
      return err.exitCode;
    }
    console.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
    return EXIT.UNEXPECTED;
  }
}
