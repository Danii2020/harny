/**
 * Composition root for `init`: the ordered, thirteen-step pipeline (amendment
 * round 1 added step 6 — see `runInit`'s doc comment). Every seam
 * (`templatesRoot`, `overrides`, `configFile`, `io`) is injectable so tests
 * can drive the whole flow against fixtures without a TTY.
 */
import fs from 'node:fs/promises';
import { HarnessError, isHarnessError } from './errors.js';
import { defaultConfig, loadConfigFile, mergeConfig, validateConfig } from './config.js';
import type { HarnessConfig, PartialHarnessConfig } from './config.js';
import { loadCanonicalTemplates } from './templates.js';
import { buildPayload, buildSharedFiles, buildSkillFiles, skillRootsFor } from './engine.js';
import { availableToolIds, getGenerator } from './generators/index.js';
import type { GeneratedFile } from './generators/types.js';
import { applyWrites, planWrites } from './writer.js';
import { confirmWrite, runInitPrompts } from './prompts.js';
import { GATE_IDS } from './vocabulary.js';
import type { ToolId } from './vocabulary.js';

export interface InitIO {
  readonly log: (message: string) => void;
  readonly warn: (message: string) => void;
}

export interface InitOptions {
  /** Absolute path to the repo being scaffolded. */
  readonly targetDir: string;
  /** Injected seam; defaults to `resolveTemplatesRoot()`. Tests point it at fixtures. */
  readonly templatesRoot?: string;
  /** Values already supplied by flags. */
  readonly overrides?: PartialHarnessConfig;
  /** Absolute path to a `--config` file, if any. */
  readonly configFile?: string;
  readonly interactive: boolean;
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly io: InitIO;
}

export interface InitResult {
  readonly config: HarnessConfig;
  /** Relative paths the run planned to write, in stable order. */
  readonly planned: readonly string[];
  /** Relative paths actually written. Empty when `dryRun`. */
  readonly written: readonly string[];
  /** Selected tools that have no generator yet. */
  readonly skippedTools: readonly ToolId[];
  readonly dryRun: boolean;
}

async function readConfigFile(configFile: string): Promise<string> {
  try {
    return await fs.readFile(configFile, 'utf8');
  } catch (err) {
    if (isHarnessError(err)) throw err;
    throw new HarnessError(
      'USAGE',
      `Could not read --config file ${configFile}: ${(err as Error).message}`,
    );
  }
}

/**
 * **(Amendment round 1 — AL-3 interactive gap, task 4.9c.)** Sequence grew from 12
 * to 13 steps: the new step 6 re-checks flag-supplied `roleOverrides` against the
 * final enabled-role set once interactive prompts have run, since step 4's check
 * necessarily runs before the prompts and cannot see a role the user deselects
 * interactively at question 2. Old steps 6–12 shifted to 7–13.
 */
export async function runInit(options: InitOptions): Promise<InitResult> {
  const { targetDir, io } = options;

  // 1. Load canonical templates.
  const templates = await loadCanonicalTemplates(options.templatesRoot);

  // 2. Compute defaults derived from canonical content.
  let config: HarnessConfig = defaultConfig(templates);

  // 3. Merge a --config file over the defaults, if given.
  if (options.configFile) {
    const contents = await readConfigFile(options.configFile);
    const fileConfig = loadConfigFile(contents, options.configFile);
    config = mergeConfig(config, fileConfig, templates);
  }

  // 4. Merge flag overrides over that. `roleIds` replaces membership first, then
  //    `roleOverrides` layer on (mergeConfig's amended fixed order); a roleOverride
  //    naming a role outside the resulting enabled set is a USAGE error here.
  if (options.overrides) {
    config = mergeConfig(config, options.overrides, templates);
  }

  // 5. Interactive prompts (skipping preset questions), or use the merged
  //    config as final.
  if (options.interactive) {
    config = await runInitPrompts(
      { config, available: availableToolIds(), preset: options.overrides ?? {} },
      io,
    );
  }

  // 6. (NEW — interactive-path gap in the AL-3 policy.) Re-check every
  //    flag-supplied roleOverride against the FINAL enabled-role set. A role named
  //    by a flag-supplied override that the user deselected at question 2 is warned
  //    about, never silently dropped and never re-raised as an error: the step 4
  //    check already ran before the prompts, and aborting a completed interactive
  //    session over a choice the user made knowingly would be hostile.
  if (options.interactive && options.overrides?.roleOverrides) {
    const enabledIds = new Set(config.roles.map((role) => role.id));
    for (const override of options.overrides.roleOverrides) {
      if (!enabledIds.has(override.id)) {
        io.warn(
          `--model override for role "${override.id}" was not applied: "${override.id}" was ` +
            'deselected at the role-selection prompt.',
        );
      }
    }
  }

  // 6b. (NEW — templates-skill-library-parity.) The exact structural counterpart of
  //     the roleOverrides re-check above, for a flag-supplied `--skills` selection:
  //     warn, never error or silently drop, if a flag-named optional skill ends up
  //     absent from the FINAL resolved skill set.
  if (options.interactive && options.overrides?.optionalSkillIds) {
    for (const skillId of options.overrides.optionalSkillIds) {
      if (!config.skills.includes(skillId)) {
        io.warn(
          `--skills selection "${skillId}" was not applied: it was deselected at the ` +
            'optional-skills prompt.',
        );
      }
    }
  }

  // 7. Fully validate the resolved config.
  config = validateConfig(config, 'resolved init configuration');

  // 8. Reduced-gates warning.
  if (config.gates.length < GATE_IDS.length) {
    const missing = GATE_IDS.filter((id) => !config.gates.includes(id));
    io.warn(
      `Reduced gate set: fewer than all three human gates are active. Missing: ${missing.join(', ')}. ` +
        'This is permitted but is never the recommended configuration.',
    );
  }

  // 9. Build the payload.
  const payload = buildPayload(config, templates);

  // (NEW — audit AL-7, task 4.7a.) Warn once per run for every unknown capability
  // token an enabled role's canonical file carries, naming the token and the file
  // it came from. The token is already preserved (`known: false`) and already
  // reaches generated output via `CapabilityMapping.notes`; only the warning was
  // missing.
  const warnedCapabilityTokens = new Set<string>();
  for (const rolePayload of payload.roles) {
    for (const capability of rolePayload.template.metadata.capabilities) {
      if (capability.known) continue;
      const key = `${capability.name}@${rolePayload.template.sourcePath}`;
      if (warnedCapabilityTokens.has(key)) continue;
      warnedCapabilityTokens.add(key);
      io.warn(
        `Unknown capability token "${capability.name}" in ${rolePayload.template.sourcePath}. ` +
          'Preserved and surfaced in generated output, not dropped.',
      );
    }
  }

  // 10. Resolve a generator per selected tool.
  const skippedTools: ToolId[] = [];
  const resolvedGenerators = [];
  for (const toolId of config.tools) {
    const generator = getGenerator(toolId);
    if (generator === undefined) {
      skippedTools.push(toolId);
      io.warn(`Skipped ${toolId}: generator not shipped yet.`);
    } else {
      resolvedGenerators.push(generator);
    }
  }
  if (resolvedGenerators.length === 0) {
    throw new HarnessError(
      'NO_GENERATOR',
      `No selected tool has a generator yet. Available: ${availableToolIds().join(', ')}`,
      availableToolIds(),
    );
  }

  // 11. Render: role + conductor files per available generator, the tool-neutral
  //     shared files exactly once, and selected skill files once per unique skill
  //     root among the resolved generators (S3 — a widening of this step, not a
  //     fourteenth step).
  const files: GeneratedFile[] = [];
  for (const generator of resolvedGenerators) {
    for (const rolePayload of payload.roles) {
      files.push(generator.renderRole(rolePayload));
    }
    files.push(generator.renderConductor(payload.conductor));
  }
  files.push(...buildSharedFiles(payload));
  files.push(...buildSkillFiles(payload, skillRootsFor(resolvedGenerators)));

  // 12. Plan writes.
  const plan = await planWrites(files, targetDir);
  const planned = plan.files.map((file) => file.path);

  // 13. Dry-run stops here; otherwise confirm (if interactive) and write.
  if (options.dryRun) {
    io.log(`Would write ${planned.length} file(s) to ${targetDir}:`);
    for (const path of planned) {
      io.log(`  ${path}`);
    }
    return { config, planned, written: [], skippedTools, dryRun: true };
  }

  if (options.interactive) {
    await confirmWrite(plan, io);
  }

  const written = await applyWrites(plan, { force: options.force });

  return { config, planned, written, skippedTools, dryRun: false };
}
