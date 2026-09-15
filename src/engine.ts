/**
 * Turns a `HarnessConfig` + `CanonicalTemplates` into a `HarnessPayload` —
 * the typed data every generator consumes.
 */
import { HarnessError } from './errors.js';
import { serializeConfig } from './config.js';
import type { HarnessConfig } from './config.js';
import { GATE_IDS, ROLE_IDS, SKILL_IDS } from './vocabulary.js';
import type { CostTier, GateId, RoleId, SkillId } from './vocabulary.js';
import type {
  CanonicalTemplates,
  ConductorTemplate,
  RoleTemplate,
  SkillResource,
  SkillTemplate,
  SpecSchemaTemplate,
} from './templates.js';
import type { GeneratedFile, Generator } from './generators/types.js';
import {
  CI_WORKFLOW_PATH,
  FEEDBACK_RUNNER_PATH,
  STACK_PROFILE_IDS,
  TOUCHED_FILES_DIR,
  resolveStackProfile,
} from './feedback.js';
import type { FeedbackInstall, StackProfile } from './feedback.js';
import { GENERATED_BLOCK_BEGIN, GENERATED_BLOCK_END, yamlQuote } from './generators/markdown-yaml.js';
import { wrapPosixShellArg } from './generators/json.js';

export interface RolePayload {
  readonly template: RoleTemplate;
  /** Effective tier after config resolution. */
  readonly tier: CostTier;
  readonly modelOverride?: string;
}

/** Config facts a generator may render into a delimited generated block. */
export interface ProjectConfigSummary {
  readonly enabledRoles: readonly RoleId[];
  readonly gates: readonly GateId[];
  readonly stack?: string;
  /** **(NEW — agent-feedback-controls.)** The profile `config.stack` resolved to,
   *  or `undefined` when the stack is blank or unrecognized. Makes the escape
   *  hatch observable in the conductor's generated block rather than silent
   *  (SC2, SC3). */
  readonly stackProfile?: StackProfile;
  /** POSIX path, relative to the target repo, where spec-schema templates land. */
  readonly specSchemaDir: string;
  /** True when fewer than all three gates are active. */
  readonly reducedGates: boolean;
}

export interface ConductorPayload {
  readonly template: ConductorTemplate;
  readonly project: ProjectConfigSummary;
}

/** **(NEW — agent-feedback-controls.)** The shared runner's canonical resource,
 *  loaded byte-for-byte from `templates/hooks/run-feedback.mjs` (BG-11). Shaped
 *  like `SkillResource` (name/contents/sourcePath) rather than re-declaring the
 *  same three fields under a new name. */
export type HookRunnerTemplate = SkillResource;

/** **(NEW — agent-feedback-controls.)** What a generator's `renderHook` consumes. */
export interface HookPayload {
  readonly project: ProjectConfigSummary;
  /** Resolved profile, or `undefined` — the inert form (BG-8). */
  readonly profile?: StackProfile;
  /** Canonical runner script contents, verbatim from `templates/hooks/`. */
  readonly runner: HookRunnerTemplate;
}

export interface HarnessPayload {
  /** Enabled roles only, in ROLE_IDS order. */
  readonly roles: readonly RolePayload[];
  /** Always present — the conductor is always on. */
  readonly conductor: ConductorPayload;
  readonly specSchema: readonly SpecSchemaTemplate[];
  /** Selected skills, in SKILL_IDS order. Always a superset of CORE_SKILL_IDS. */
  readonly skills: readonly SkillTemplate[];
  readonly skillsReadme?: SkillResource;
  readonly config: HarnessConfig;
  /** **(NEW — agent-feedback-controls.)** `templates/hooks/run-feedback.mjs`,
   *  verbatim. `undefined` only when the loaded templates root does not model the
   *  feedback subsystem at all (e.g. a lean test fixture) — never for the real,
   *  packaged templates root. */
  readonly hookRunner?: HookRunnerTemplate;
  /** **(NEW — agent-feedback-controls.)** `templates/ci/harny-feedback.yml`,
   *  verbatim, before its generated block is filled in. Same absence rule as
   *  `hookRunner`. */
  readonly ciWorkflowTemplate?: SkillResource;
  /** **(NEW — readiness-doctor.)** `templates/doctor/run-doctor.mjs`, verbatim
   *  (BG-11). Same absence rule as `hookRunner`: `undefined` only for a lean
   *  test-fixture templates root, never for the real, packaged one. */
  readonly doctorRunner?: SkillResource;
  /** **(NEW — readiness-doctor.)** `templates/shared/probes.mjs`, verbatim
   *  (BG-11, BG-20). Same absence rule as `hookRunner`. Emitted into the target
   *  repo by `buildRuntimeSharedFiles`, not by `buildFeedbackFiles` or
   *  `buildDoctorFiles` (§ State Changes). */
  readonly sharedProbes?: SkillResource;
}

export const SPEC_SCHEMA_DIR = '.sdd/spec-schema';
export const HARNESS_CONFIG_PATH = '.sdd/harness.json';
/** **(NEW — readiness-doctor.)** POSIX path, relative to the target repo root, of
 *  the shared runtime module both generated entry-point scripts import
 *  (`../shared/probes.mjs`). Owned here — the module that already owns the
 *  cross-subsystem tool-neutral paths — not by `src/feedback.ts` or `src/doctor.ts`
 *  (S5). */
export const SHARED_PROBES_PATH = '.sdd/shared/probes.mjs';

export function buildPayload(config: HarnessConfig, templates: CanonicalTemplates): HarnessPayload {
  const selectionById = new Map(config.roles.map((selection) => [selection.id, selection]));

  const roles: RolePayload[] = ROLE_IDS.filter((id) => selectionById.has(id)).map((id) => {
    const selection = selectionById.get(id)!;
    const template = templates.roles.get(id);
    if (!template) {
      throw new HarnessError(
        'TEMPLATE',
        `Role "${id}" is enabled but has no corresponding canonical template loaded.`,
      );
    }
    return { template, tier: selection.tier, modelOverride: selection.modelOverride };
  });

  const project: ProjectConfigSummary = {
    enabledRoles: roles.map((role) => role.template.metadata.id),
    gates: config.gates,
    stack: config.stack,
    stackProfile: resolveStackProfile(config.stack),
    specSchemaDir: SPEC_SCHEMA_DIR,
    reducedGates: config.gates.length < GATE_IDS.length,
  };

  const conductor: ConductorPayload = { template: templates.conductor, project };

  const selectedSkillIds = new Set<SkillId>(config.skills);
  const skills: SkillTemplate[] = SKILL_IDS.filter((id) => selectedSkillIds.has(id)).map((id) => {
    const template = templates.skills.get(id);
    if (!template) {
      throw new HarnessError(
        'TEMPLATE',
        `Skill "${id}" is enabled but has no corresponding canonical template loaded. ` +
          `This is a packaging bug, not a configuration error.`,
      );
    }
    return template;
  });

  return {
    roles,
    conductor,
    specSchema: templates.specSchema,
    skills,
    skillsReadme: templates.skillsReadme,
    config,
    hookRunner: templates.hookRunner,
    ciWorkflowTemplate: templates.ciWorkflowTemplate,
    doctorRunner: templates.doctorRunner,
    sharedProbes: templates.sharedProbes,
  };
}

/** Tool-neutral files written once regardless of how many tools are selected:
 *  the five spec-schema templates plus the resolved config. Closes AL-5. */
export function buildSharedFiles(payload: HarnessPayload): readonly GeneratedFile[] {
  const files: GeneratedFile[] = payload.specSchema.map((schema) => ({
    path: `${SPEC_SCHEMA_DIR}/${schema.name}.md`,
    contents: schema.contents,
  }));
  files.push({ path: HARNESS_CONFIG_PATH, contents: serializeConfig(payload.config) });
  return files;
}

/** **(NEW — readiness-doctor.)** The shared runtime module both generated
 *  entry-point scripts import (`.sdd/feedback/run-feedback.mjs` and
 *  `.sdd/doctor/run-doctor.mjs`), tool-neutral and written exactly once per run
 *  from this one call site — deliberately not from `buildFeedbackFiles` and
 *  `buildDoctorFiles` separately, which would put a duplicate entry in the write
 *  plan (§ State Changes). Returns `[]` when the loaded templates root does not
 *  carry `templates/shared/probes.mjs` (lean test fixtures) — never for the real,
 *  packaged templates root. */
export function buildRuntimeSharedFiles(payload: HarnessPayload): readonly GeneratedFile[] {
  if (!payload.sharedProbes) {
    return [];
  }
  return [{ path: SHARED_PROBES_PATH, contents: payload.sharedProbes.contents }];
}

/** **(NEW — agent-feedback-controls.)** Human-readable escape-hatch notice for an
 *  unresolved stack, shared by the CI workflow's notice step so the message text
 *  lives in one place (`AGENTS.md` S5) rather than being re-literalled at each
 *  call site. Not a `STACK_PROFILES` command string, so BG-7's grep gate does not
 *  govern it. */
function noBuiltinProfileNotice(stack: string | undefined): string {
  return (
    `harny-feedback: no built-in profile for stack '${stack ?? ''}'. ` +
    `Built-in profiles: ${STACK_PROFILE_IDS.join(', ')}. No lint/typecheck commands run.`
  );
}

/** Splices generated lines between the canonical template's
 * `GENERATED_BLOCK_BEGIN`/`END` marker lines, indenting each to match the begin
 * marker's own indentation — the CI workflow's counterpart to
 * `renderProjectConfigBlock`, adapted to YAML (a comment-marked splice rather than
 * a whole appended block, since the markers must sit inside an existing `steps:`
 * list to be valid YAML). */
function spliceGeneratedYamlBlock(template: string, bodyLines: readonly string[]): string {
  const lines = template.split('\n');
  const beginIndex = lines.findIndex((line) => line.includes(GENERATED_BLOCK_BEGIN));
  const endIndex = lines.findIndex((line) => line.includes(GENERATED_BLOCK_END));
  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new HarnessError(
      'TEMPLATE',
      'templates/ci/harny-feedback.yml is missing its generated-block markers. ' +
        'This is a packaging bug, not your configuration.',
    );
  }
  const markerLine = lines[beginIndex];
  const indent = markerLine.slice(0, markerLine.indexOf('#'));
  const indented = bodyLines.map((line) => `${indent}${line}`);
  return [...lines.slice(0, beginIndex + 1), ...indented, ...lines.slice(endIndex)].join('\n');
}

/** (A1) Renders `ciInstall`'s gate chain as a single POSIX shell command: the
 *  first candidate whose `anyFile` gate matches wins, in declaration order,
 *  never more than one; the trailing `else` prints a notice and does nothing.
 *  Never literalled elsewhere (BG-7's A1 extension) — this is the one place
 *  `ciInstall[].argv` is rendered into shell. */
function renderInstallGateChain(ciInstall: readonly FeedbackInstall[]): string {
  const branches = ciInstall.map((candidate, index) => {
    const condition = candidate.requires.anyFile.map((file) => `-f ${file}`).join(' -o ');
    const keyword = index === 0 ? 'if' : 'elif';
    return `${keyword} [ ${condition} ]; then ${candidate.argv.join(' ')};`;
  });
  const lastCandidate = ciInstall[ciInstall.length - 1];
  const notice = `harny-feedback: no ${lastCandidate.requires.anyFile.join(' or ')} in this checkout; skipping dependency install`;
  branches.push(`else echo '${notice}'; fi`);
  return branches.join(' ');
}

/** (A1; extended by readiness-doctor.) Renders the one guarded runner-invocation
 *  command: a `test -f` guard naming the missing-runner remediation (Error
 *  Handling Contract's row for a checkout missing the runner or its shared
 *  module), then `run --whole-project --commands <inline JSON>` — the resolved
 *  profile's commands, embedded the same way (`wrapPosixShellArg`) the five hook
 *  configs already embed them. The guard now covers `SHARED_PROBES_PATH` as well
 *  as `FEEDBACK_RUNNER_PATH`: a checkout missing either file cannot run
 *  (`run-feedback.mjs`'s static import of `../shared/probes.mjs` would otherwise
 *  fail with a raw `ERR_MODULE_NOT_FOUND` stack trace instead of this named,
 *  actionable notice). */
function renderRunnerInvocation(commands: unknown): string {
  const missingRunnerNotice =
    `harny-feedback: ${FEEDBACK_RUNNER_PATH} or ${SHARED_PROBES_PATH} is missing from ` +
    'this checkout; run npx harny init and commit both';
  const commandsJson = JSON.stringify(commands);
  return (
    `test -f ${FEEDBACK_RUNNER_PATH} -a -f ${SHARED_PROBES_PATH} || { echo '${missingRunnerNotice}'; exit 1; }; ` +
    `node ${FEEDBACK_RUNNER_PATH} run --whole-project --commands ${wrapPosixShellArg(commandsJson)}`
  );
}

/** Renders `templates/ci/harny-feedback.yml`'s generated block (BG-10, rewritten
 *  by A1): at most one dependency-install step, emitted only when the resolved
 *  profile declares `ciInstall`, followed by exactly one runner-invocation step
 *  carrying the resolved profile's commands as inline JSON — never one raw step
 *  per command (that shape is what made probes unreachable in CI, `audit.md`
 *  finding F1). The escape-hatch case (no resolved profile) is unchanged: a
 *  single notice step, no install step (BG-8). Interpolated strings are quoted
 *  with the existing shared `yamlQuote` (`src/generators/markdown-yaml.ts`) — no
 *  YAML dependency (§ YAML). */
function renderCiWorkflow(template: string, profile: StackProfile | undefined, stack: string | undefined): string {
  const bodyLines: string[] = [];
  if (profile) {
    if (profile.ciInstall && profile.ciInstall.length > 0) {
      bodyLines.push(`- name: ${yamlQuote(`Install dependencies (${profile.displayName})`)}`);
      bodyLines.push(`  run: ${yamlQuote(renderInstallGateChain(profile.ciInstall))}`);
    }
    bodyLines.push(`- name: ${yamlQuote(`harny feedback (${profile.displayName})`)}`);
    bodyLines.push(`  run: ${yamlQuote(renderRunnerInvocation(profile.commands))}`);
  } else {
    bodyLines.push(`- name: ${yamlQuote('harny-feedback notice')}`);
    bodyLines.push(`  run: ${yamlQuote(`echo ${JSON.stringify(noBuiltinProfileNotice(stack))}`)}`);
  }
  return spliceGeneratedYamlBlock(template, bodyLines);
}

/** Path of the `.gitignore` scoped to the accumulator scratch directory itself
 *  (`TOUCHED_FILES_DIR`), so the runtime turn files it holds are never seen by
 *  `git status` in a scaffolded project — contract.md § State Changes' claim
 *  that `TOUCHED_FILES_DIR` is "runtime-only, gitignored in the target repo",
 *  made real. Self-contained (a directory-scoped ignore file) rather than an
 *  append to the target project's own root `.gitignore`, which could conflict
 *  with existing content there. */
const TOUCHED_FILES_GITIGNORE_PATH = `${TOUCHED_FILES_DIR}/.gitignore`;

/** **(NEW — agent-feedback-controls.)** The CI workflow + the shared runner
 *  script: tool-neutral, written exactly once per run regardless of tool count —
 *  the same rule `buildSharedFiles` already applies to `.sdd/spec-schema/*` under
 *  `cli-init.md` CLI-8 (BG-10, SC7). Returns an empty array when the loaded
 *  templates root does not carry the feedback subsystem's canonical resources
 *  (lean test fixtures) — never for the real, packaged templates root. */
export function buildFeedbackFiles(payload: HarnessPayload): readonly GeneratedFile[] {
  if (!payload.hookRunner || !payload.ciWorkflowTemplate) {
    return [];
  }

  const profile = payload.conductor.project.stackProfile;
  const stack = payload.config.stack;

  return [
    { path: FEEDBACK_RUNNER_PATH, contents: payload.hookRunner.contents },
    { path: CI_WORKFLOW_PATH, contents: renderCiWorkflow(payload.ciWorkflowTemplate.contents, profile, stack) },
    { path: TOUCHED_FILES_GITIGNORE_PATH, contents: '*\n!.gitignore\n' },
  ];
}

/** Deduped, sorted skill roots for the generators that actually resolved
 *  (`cli-init.md` CLI-7: a skipped tool contributes no root). */
export function skillRootsFor(generators: readonly Generator[]): readonly string[] {
  const roots = new Set(generators.map((generator) => generator.skillsDir));
  return [...roots].sort();
}

function compareByName(a: { readonly name: string }, b: { readonly name: string }): number {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

/**
 * One copy of every selected skill's files, plus the shape-contract README, under each
 * unique skill root. `roots` MUST already be deduped and sorted by the caller.
 *
 * This is the same single-write-per-run idea as `buildSharedFiles` (`cli-init.md`
 * CLI-8): `.sdd/spec-schema/*` is written once because its destination is a constant;
 * skills are written once per *distinct* destination. With all five tools selected the
 * three distinct roots are `.agents/skills`, `.claude/skills`, `.kiro/skills`.
 *
 * Emission order is fixed and total: for each root in `roots` order, the README (if
 * loaded), then each skill in `SKILL_IDS` order, then each of that skill's `files` in
 * `name` order. Every emitted `contents` is the loaded `SkillResource.contents`
 * verbatim — no concatenation, no header, no provenance comment, no generated block.
 */
export function buildSkillFiles(
  payload: HarnessPayload,
  roots: readonly string[],
): readonly GeneratedFile[] {
  const orderedSkills = [...payload.skills].sort(
    (a, b) => SKILL_IDS.indexOf(a.id) - SKILL_IDS.indexOf(b.id),
  );

  const files: GeneratedFile[] = [];
  for (const root of roots) {
    if (payload.skillsReadme) {
      files.push({ path: `${root}/${payload.skillsReadme.name}`, contents: payload.skillsReadme.contents });
    }
    for (const skill of orderedSkills) {
      const sortedFiles = [...skill.files].sort(compareByName);
      for (const file of sortedFiles) {
        files.push({ path: `${root}/${skill.id}/${file.name}`, contents: file.contents });
      }
    }
  }
  return files;
}
