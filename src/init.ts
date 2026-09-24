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
import path from 'node:path';
import {
  buildCommandsPayload,
  buildFeedbackFiles,
  buildPayload,
  buildRuntimeSharedFiles,
  buildSharedFiles,
  buildSkillFiles,
  skillRootsFor,
} from './engine.js';
import type { HookPayload } from './engine.js';
import { buildDoctorFiles } from './doctor.js';
import { buildMcpFiles } from './mcp.js';
import { buildPermissionsFiles, parsePermissionPolicy } from './permissions.js';
import { activateGitHooks, buildGitHooksFiles } from './git-hooks.js';
import { COMPONENT_DISCOVERY, buildNestedGuidanceBridgeFiles, loadDiscovery } from './component-docs.js';
import { availableToolIds, getGenerator } from './generators/index.js';
import type { GeneratedFile } from './generators/types.js';
import { ciWorkflowPathFor, resolveInstallLocation } from './repo.js';
import { applyWrites, displayPath, planWrites } from './writer.js';
import { confirmGitHooks, confirmWrite, runInitPrompts } from './prompts.js';
import { GATE_IDS } from './vocabulary.js';
import type { ToolId } from './vocabulary.js';
import { CI_WORKFLOW_PATH, STACK_PROFILE_IDS } from './feedback.js';

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
  /** **(NEW — commit-checks.)** `false` (`--no-git-hooks`) never activates the git
   *  hooks. Otherwise they are activated after a successful write — after a
   *  confirmation when `interactive` (CC-6). */
  readonly gitHooks?: boolean;
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

  // 9b. (NEW — agent-feedback-controls.) Escape-hatch warning (BG-8): an
  // explicitly configured stack that matches no built-in feedback profile is
  // inert, never fatal — but never silent either. A blank/absent stack is not
  // warned about here; it is the ordinary default, not a misconfiguration.
  //
  // (WIDENED — specs/monorepo-mode, MC-28.) Per component: an explicitly
  // configured component stack matching no built-in profile emits one io.warn
  // naming that component's path and the unrecognized value alongside the
  // built-in profile ids. A blank component stack is not warned about — the
  // same "legitimate absence, not a misconfiguration" treatment as a blank
  // `config.stack`. For a components-free config this is exactly the single
  // warning above, since `resolveComponents` returns the one implicit `.`
  // component carrying `config.stack` (MC-5) — this is the SAME loop, not a
  // second code path.
  for (const component of payload.conductor.project.components) {
    if (component.stack && !component.profile) {
      io.warn(
        `Unrecognized stack "${component.stack}" for component "${component.path}": no built-in ` +
          `feedback profile matched. Built-in profiles: ${STACK_PROFILE_IDS.join(', ')}. Lint/typecheck ` +
          'commands are skipped for this component; hook and CI artifacts are still written.',
      );
    }
  }

  // (NEW — specs/monorepo-mode, MC-8.) A declared component directory that does
  // not exist on disk at init time is not an error — component directories are
  // never created by init, and a component directory may legitimately be
  // created after scaffolding — but it is never silent either: one io.warn
  // names the path, and the run proceeds and writes everything normally.
  for (const component of payload.conductor.project.components) {
    if (component.path === '.') {
      continue;
    }
    const componentDir = path.join(targetDir, component.path);
    try {
      await fs.access(componentDir);
    } catch {
      io.warn(
        `Component directory "${component.path}" does not exist yet under ${targetDir}. ` +
          'This is fine if it will be created after scaffolding; nothing else is affected.',
      );
    }
  }

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
  // (NEW — ci-workflow-root.) Resolve where this install sits inside its
  // enclosing git repository once, up front, exactly as context7-mcp folded its
  // own targetDir-reading work into this same step rather than adding a
  // fourteenth (CW-10, C9). A write above the install directory is never
  // silent (CW-9): a subdirectory install warns naming the resolved repository
  // root and the workflow's destination; an install with no repository above it
  // warns that the workflow was written inside the install directory instead. A
  // root install inside a repository warns for neither — it is the ordinary
  // case, not a condition.
  const location = await resolveInstallLocation(targetDir);
  if (location.insideRepo && location.prefix !== '') {
    io.warn(
      `${targetDir} is a subdirectory of the git repository at ${location.repoRoot}. ` +
        'GitHub only reads .github/workflows/ at a repository root, so the CI workflow ' +
        `will be written there as ${ciWorkflowPathFor(location.prefix)} instead of inside this directory.`,
    );
  } else if (!location.insideRepo) {
    io.warn(
      `${targetDir} is not inside a git repository. The CI workflow was written inside it as ` +
        `${CI_WORKFLOW_PATH}; GitHub will only read it from there if this directory is itself ` +
        'the repository root of whatever repository it is later added to.',
    );
  }

  const files: GeneratedFile[] = [];
  for (const generator of resolvedGenerators) {
    for (const rolePayload of payload.roles) {
      files.push(generator.renderRole(rolePayload));
    }
    files.push(generator.renderConductor(payload.conductor));
  }
  files.push(...buildSharedFiles(payload));
  files.push(...buildSkillFiles(payload, skillRootsFor(resolvedGenerators)));

  // (NEW — agent-feedback-controls.) Hook artifacts per resolved generator, plus
  // the tool-neutral runner + CI workflow exactly once per run (BG-10) — joined
  // into this same render step, never a fourteenth step (CLI-1). Gated on the
  // loaded templates root actually carrying the feedback subsystem's canonical
  // resources: a lean templates root that never modeled them (some test
  // fixtures) contributes neither, rather than raising a packaging error for
  // content it never claimed to have. The real, packaged templates root always
  // carries both.
  if (payload.hookRunner && payload.ciWorkflowTemplate) {
    // (NEW — specs/monorepo-mode, MC-15.) The runner wire format is computed
    // once, here, in the composition root — the seam that keeps every generator
    // component-blind (SC14): no generator ever derives `--commands` itself.
    const hookPayload: HookPayload = {
      project: payload.conductor.project,
      profile: payload.conductor.project.stackProfile,
      runner: payload.hookRunner,
      commands: buildCommandsPayload(payload.conductor.project.components),
      // (NEW — permissions-baseline.) Parsed once here, so a malformed canonical
      // policy is a TEMPLATE error before anything is written, and every generator
      // derives from the same value (PB-1).
      ...(payload.permissionsGuard && payload.permissionsPolicy
        ? { permissions: { policy: parsePermissionPolicy(payload.permissionsPolicy.contents) } }
        : {}),
    };
    for (const generator of resolvedGenerators) {
      const hookFile = generator.renderHook(hookPayload);
      if (hookFile) {
        files.push(hookFile);
      }
    }
    files.push(...buildFeedbackFiles(payload, { prefix: location.prefix }));
    // (NEW — permissions-baseline.) The guard and its policy, tool-neutral, exactly
    // once per run, in this same render step (PB-2, CLI-1).
    files.push(...buildPermissionsFiles(payload));
    // (NEW — commit-checks.) The git hooks and the commands they lint staged files
    // with — the same payload the per-turn hooks serialize — once per run (CC-1).
    files.push(...buildGitHooksFiles(payload, hookPayload.commands));
  }

  // (NEW — readiness-doctor.) The readiness runner + generated checks.json,
  // tool-neutral, exactly once per run — joined into this same render step,
  // never a fourteenth step (CLI-1). Gated on the loaded templates root
  // actually carrying `templates/doctor/run-doctor.mjs`; the real, packaged
  // templates root always does.
  files.push(...buildDoctorFiles(payload, resolvedGenerators, { prefix: location.prefix }));
  // (NEW — readiness-doctor.) The shared probe module both the feedback runner
  // and the doctor runner import — tool-neutral, written exactly once per run
  // from this single call site, never from `buildFeedbackFiles`/
  // `buildDoctorFiles` separately (which would duplicate the write-plan entry).
  files.push(...buildRuntimeSharedFiles(payload));

  // (NEW — context7-mcp.) The default Context7 MCP server configuration, one file
  // per resolved generator that declares an `mcpConfig` — joined into this same
  // render step, never a fourteenth step (CLI-1). The first artifact family that
  // READS from targetDir while building: each file's contents extend whatever is
  // already there (G3), which is why this call is awaited and why its outputs are
  // merge-marked (G4).
  const mcp = await buildMcpFiles(resolvedGenerators, { targetDir, force: options.force });
  files.push(...mcp.files);
  for (const warning of mcp.warnings) {
    io.warn(warning);
  }

  // (NEW — component-level-docs, CL-5.) Bridges for tools that do not read a nested
  // AGENTS.md, for components that already have one. Like the MCP step it reads
  // targetDir, and like it it never produces a conflict: an existing bridge path is
  // left alone (warned about when it lacks the include).
  if (payload.sharedComponents) {
    const discovery = await loadDiscovery(templates.root);
    const declared = payload.conductor.project.components.map((component) => component.path);
    const components = discovery.discoverComponents(targetDir, { ...COMPONENT_DISCOVERY, declared });
    const bridges = await buildNestedGuidanceBridgeFiles(targetDir, components, resolvedGenerators, discovery);
    files.push(...bridges.files);
    for (const warning of bridges.warnings) {
      io.warn(warning);
    }
  }

  // 12. Plan writes.
  const plan = await planWrites(files, targetDir, location.repoRoot);
  const planned = plan.files.map((file) => displayPath(file, targetDir, plan.repoRoot));

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

  // (NEW — commit-checks, CC-6.) Activation is the one consented side effect outside
  // the write plan: a single git config key, set only after the files it points at
  // exist, and never over another hook setup.
  if (options.gitHooks !== false && payload.gitHooksRunner) {
    const consented = options.interactive ? await confirmGitHooks(io) : true;
    if (consented) {
      const outcome = await activateGitHooks(targetDir, location.insideRepo ? location.repoRoot : undefined);
      if (outcome.kind === 'skipped') {
        io.warn(`Git hooks not activated: ${outcome.reason}`);
      } else {
        io.log(`Git hooks active: core.hooksPath = ${outcome.hooksPath}`);
      }
    }
  }

  return { config, planned, written, skippedTools, dryRun: false };
}
