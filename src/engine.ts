/**
 * Turns a `HarnessConfig` + `CanonicalTemplates` into a `HarnessPayload` —
 * the typed data every generator consumes.
 */
import path from 'node:path';
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
  FEEDBACK_RUNNER_PATH,
  STACK_PROFILE_IDS,
  TOUCHED_FILES_DIR,
  resolveStackProfile,
} from './feedback.js';
import type { FeedbackCommand, FeedbackInstall, StackProfile } from './feedback.js';
import type { PermissionPolicy } from './permissions.js';
import { ciWorkflowPathFor } from './repo.js';
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
  /** (specs/monorepo-mode — NEW.) `resolveComponents(config)`'s result. ALWAYS
   *  present and ALWAYS non-empty — for a single-repo config it is the one
   *  implicit `.` component. `stack`/`stackProfile` are left in place unchanged
   *  precisely so `renderProjectConfigBlock`'s existing lines do not move (MC-16). */
  readonly components: readonly ResolvedComponent[];
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
  /** (specs/monorepo-mode — NEW.) The exact value each generator serializes onto
   *  its hook's `--commands` argument. Precomputed once by `runInit` via
   *  `buildCommandsPayload`, so no generator ever derives it and no generator
   *  ever learns what a component is (MC-15, SC14). */
  readonly commands: CommandsPayload;
  /** **(NEW — permissions-baseline.)** The parsed baseline, present when the
   *  templates root carries the permissions subsystem. Absent, every generator's
   *  hook file renders byte-identically to before that feature (PB-12). */
  readonly permissions?: PermissionsPayload;
}

/** **(NEW — permissions-baseline.)** What a generator needs to wire the guard and,
 *  where a tool has a static rules layer, to derive it (PB-9). */
export interface PermissionsPayload {
  readonly policy: PermissionPolicy;
}

/** (specs/monorepo-mode.) A `ComponentSelection` with its stack already resolved.
 *  The one shape every downstream consumer reads, so no consumer branches on
 *  whether the install declared components (MC-3). */
export interface ResolvedComponent {
  readonly path: string;
  readonly stack?: string;
  /** `undefined` for a blank or unrecognized stack — the per-component escape
   *  hatch (`feedback-controls.md` FC-2). */
  readonly profile?: StackProfile;
}

function compareComponentPath(a: { readonly path: string }, b: { readonly path: string }): number {
  if (a.path < b.path) return -1;
  if (a.path > b.path) return 1;
  return 0;
}

/** (specs/monorepo-mode.) The unification point (MC-3). Returns `config.components`
 *  resolved, in their canonical order, when present; otherwise exactly one entry,
 *  `{ path: '.', stack: config.stack, profile: resolveStackProfile(config.stack) }`.
 *  Total, pure, and NEVER empty. */
export function resolveComponents(config: HarnessConfig): readonly ResolvedComponent[] {
  if (config.components !== undefined && config.components.length > 0) {
    return config.components
      .map((component) => ({
        path: component.path,
        stack: component.stack,
        profile: resolveStackProfile(component.stack),
      }))
      .sort(compareComponentPath);
  }
  return [{ path: '.', stack: config.stack, profile: resolveStackProfile(config.stack) }];
}

/** (specs/monorepo-mode, MC-5 / MC-20.) THE single-repo boundary, owned here and
 *  imported — never re-derived at a call site (`AGENTS.md` S5). True iff the
 *  resolved list is exactly one component whose path is `.`, which is the shape a
 *  `components`-free config resolves to (MC-3) and therefore the one and only
 *  case whose rendered bytes must equal today's.
 *
 *  A single component that is NOT at `.` is a real monorepo-mode install and must
 *  be scoped like one. Gating on `components.length > 1` instead silently runs
 *  that install's commands at the install root (`audit.md` finding F1).
 *
 *  Deliberately distinct from `hasMultipleComponents`, which is MC-14's different
 *  boundary. Do not substitute one for the other. */
export function isSingleRootComponent(components: readonly { readonly path: string }[]): boolean {
  return components.length === 1 && components[0].path === '.';
}

/** (specs/monorepo-mode, MC-14.) MC-14's boundary, which is NOT
 *  `isSingleRootComponent`'s. MC-14 widens a CI step's NAME only when there is
 *  more than one component to disambiguate in that name, so a single non-`.`
 *  component keeps today's unsuffixed step names while still being scoped by
 *  `working-directory` (which is `stepWorkingDirectory`'s job, not this
 *  predicate's). Named here so the two boundaries are told apart by name rather
 *  than by re-derived expression (`AGENTS.md` S5). */
export function hasMultipleComponents(components: readonly { readonly path: string }[]): boolean {
  return components.length > 1;
}

/** (specs/monorepo-mode.) One component's slice of the runner wire format. */
export interface ComponentCommands {
  /** POSIX, relative to the runner's own `cwd` (the install directory). */
  readonly dir: string;
  /** The component's resolved profile's commands, or `[]` when it resolved none. */
  readonly commands: readonly FeedbackCommand[];
}

/** (specs/monorepo-mode.) What travels to the runner on `--commands`. The legacy
 *  bare-array form is not a compatibility shim to be removed later: it is the
 *  canonical encoding of the one-component-at-`.` case, and the reason every
 *  single-repo artifact stays byte-identical (MC-5). */
export type CommandsPayload =
  | readonly FeedbackCommand[]
  | { readonly components: readonly ComponentCommands[] };

/** (specs/monorepo-mode.) Bare array iff `isSingleRootComponent(components)`; the
 *  object form otherwise, carrying EVERY declared component including those that
 *  resolved no profile (MC-6). Pure. */
export function buildCommandsPayload(components: readonly ResolvedComponent[]): CommandsPayload {
  if (isSingleRootComponent(components)) {
    return components[0].profile?.commands ?? [];
  }
  return {
    components: components.map((component) => ({
      dir: component.path,
      commands: component.profile?.commands ?? [],
    })),
  };
}

/** (specs/monorepo-mode.) The `working-directory:` value for a step that must run
 *  inside `componentPath`, for an install sitting at `prefix` inside its
 *  repository. `path.posix.join` then `path.posix.normalize`; `'.'` maps to `''`,
 *  and an empty result means the caller emits no `working-directory:` line at
 *  all — which is what keeps a root install's generated block byte-identical
 *  (MC-13). */
export function stepWorkingDirectory(prefix: string, componentPath: string): string {
  const joined = path.posix.normalize(path.posix.join(prefix, componentPath));
  return joined === '.' ? '' : joined;
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
  /** **(NEW — permissions-baseline.)** `templates/permissions/run-guard.mjs`,
   *  verbatim (PB-2). Same absence rule as `hookRunner`. */
  readonly permissionsGuard?: SkillResource;
  /** **(NEW — permissions-baseline.)** `templates/permissions/policy.json`,
   *  verbatim (PB-1, PB-2). Same absence rule as `hookRunner`. */
  readonly permissionsPolicy?: SkillResource;
  /** **(NEW — commit-checks.)** The git hook shims and runner, verbatim (CC-1).
   *  Same absence rule as `hookRunner`. */
  readonly gitHooksPreCommit?: SkillResource;
  readonly gitHooksPrePush?: SkillResource;
  readonly gitHooksRunner?: SkillResource;
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
    components: resolveComponents(config),
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
    permissionsGuard: templates.permissionsGuard,
    permissionsPolicy: templates.permissionsPolicy,
    gitHooksPreCommit: templates.gitHooksPreCommit,
    gitHooksPrePush: templates.gitHooksPrePush,
    gitHooksRunner: templates.gitHooksRunner,
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

/** **(NEW — ci-workflow-root.)** Where an install sits inside the repository that will
 *  run its CI, reduced to the only fact the renderer needs. A struct rather than a
 *  bare string so `monorepo-mode` can add fields (a component list) without changing
 *  any signature here (XC-6). */
export interface CiPlacement {
  /** POSIX path from the repository root to the install directory. `''` means the
   *  install directory IS the repository root — today's only case. */
  readonly prefix: string;
}

/** The placement every pre-existing caller gets by default: the install directory is
 *  the repository root, which is exactly harny's own case (XC-1). */
export const ROOT_PLACEMENT: CiPlacement = { prefix: '' };

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

/** **(NEW — ci-workflow-root.)** Rewrites the canonical `name:` line — the single
 *  canonical-region value this feature ever touches (CR-3), and only when
 *  `workflowName` is given. Replaces the first line matching `/^name:\s/`; throws
 *  `HarnessError('TEMPLATE')` when there is none, mirroring
 *  `spliceGeneratedYamlBlock`'s missing-marker guard (CR-8). Uses the existing
 *  shared `yamlQuote`; no YAML library (CR-9, ADR 0015). */
function renameCanonicalWorkflow(template: string, workflowName: string): string {
  const lines = template.split('\n');
  const nameIndex = lines.findIndex((line) => /^name:\s/.test(line));
  if (nameIndex === -1) {
    throw new HarnessError(
      'TEMPLATE',
      'templates/ci/harny-feedback.yml has no name: line. This is a packaging bug, not your configuration.',
    );
  }
  lines[nameIndex] = `name: ${yamlQuote(workflowName)}`;
  return lines.join('\n');
}

/** (specs/monorepo-mode.) Generalizes `noBuiltinProfileNotice` to a component
 *  list. This is a CI step's notice TEXT, so it takes MC-14's boundary
 *  (`hasMultipleComponents`), not MC-5/MC-20's (`isSingleRootComponent`): with a
 *  single component — at `.` or not — there is no second stack to disambiguate,
 *  so naming the path would add nothing and would move a byte MC-14 freezes. For
 *  more than one component, none of which resolved a profile, it names every
 *  component's declared stack. */
function noBuiltinProfileNoticeForComponents(components: readonly ResolvedComponent[]): string {
  if (!hasMultipleComponents(components)) {
    return noBuiltinProfileNotice(components[0]?.stack);
  }
  const named = components.map((component) => `${component.path}='${component.stack ?? ''}'`).join(', ');
  return (
    `harny-feedback: no built-in profile resolved for any component (${named}). ` +
    `Built-in profiles: ${STACK_PROFILE_IDS.join(', ')}. No lint/typecheck commands run.`
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
 *  YAML dependency (§ YAML).
 *
 *  **(MODIFIED — ci-workflow-root.)** Gains `placement`. For `placement.prefix ===
 *  ''` the returned string is what today's three-argument version returns,
 *  byte-for-byte (CR-1). For a non-empty prefix, every generated step gains a
 *  `working-directory: <yamlQuote(prefix)>` line immediately after its `run:`
 *  line (CR-2), and the canonical `name:` line is rewritten via
 *  `renameCanonicalWorkflow` (CR-3).
 *
 *  **(MODIFIED — monorepo-mode.)** Takes the full resolved component list
 *  (`ResolvedComponent[]`, MC-3's one-or-more, never-empty shape) rather than a
 *  single profile/stack pair. At most one install step per component that
 *  resolved a profile declaring `ciInstall`, in canonical component order, each
 *  scoped with `stepWorkingDirectory(placement.prefix, component.path)`; then
 *  exactly one runner-invocation step, scoped to `placement.prefix` (the runner
 *  resolves components itself), embedding `buildCommandsPayload` of only the
 *  RESOLVED components (a component with no profile contributes zero commands,
 *  so naming it in the CI step's inline JSON would add nothing but noise — MC-13).
 *  For a single component this is exactly today's shape by construction: the
 *  suffix/list-join formulas below degrade to today's single-name text when
 *  there is only one name to join (MC-5, MC-14). */
function renderCiWorkflow(
  template: string,
  components: readonly ResolvedComponent[],
  placement: CiPlacement,
): string {
  const resolvedComponents = components.filter((component) => component.profile !== undefined);
  // (specs/monorepo-mode, MC-14.) Step NAMES widen at MC-14's boundary — more
  // than one component — which is deliberately NOT MC-5/MC-20's
  // `isSingleRootComponent`. Directory scoping is separate and unconditional:
  // `stepWorkingDirectory` below scopes a lone non-`.` component correctly while
  // its step name stays byte-identical to today's.
  const multiComponent = hasMultipleComponents(components);
  const bodyLines: string[] = [];

  if (resolvedComponents.length === 0) {
    bodyLines.push(`- name: ${yamlQuote('harny-feedback notice')}`);
    bodyLines.push(
      `  run: ${yamlQuote(`echo ${JSON.stringify(noBuiltinProfileNoticeForComponents(components))}`)}`,
    );
    if (placement.prefix !== '') {
      bodyLines.push(`  working-directory: ${yamlQuote(placement.prefix)}`);
    }
  } else {
    for (const component of resolvedComponents) {
      const profile = component.profile as StackProfile;
      if (profile.ciInstall && profile.ciInstall.length > 0) {
        const installName = multiComponent
          ? `Install dependencies (${profile.displayName} — ${component.path})`
          : `Install dependencies (${profile.displayName})`;
        bodyLines.push(`- name: ${yamlQuote(installName)}`);
        bodyLines.push(`  run: ${yamlQuote(renderInstallGateChain(profile.ciInstall))}`);
        const workingDirectory = stepWorkingDirectory(placement.prefix, component.path);
        if (workingDirectory !== '') {
          bodyLines.push(`  working-directory: ${yamlQuote(workingDirectory)}`);
        }
      }
    }

    const displayNames: string[] = [];
    for (const component of resolvedComponents) {
      const displayName = (component.profile as StackProfile).displayName;
      if (!displayNames.includes(displayName)) {
        displayNames.push(displayName);
      }
    }
    bodyLines.push(`- name: ${yamlQuote(`harny feedback (${displayNames.join(', ')})`)}`);
    bodyLines.push(
      `  run: ${yamlQuote(renderRunnerInvocation(buildCommandsPayload(resolvedComponents)))}`,
    );
    if (placement.prefix !== '') {
      bodyLines.push(`  working-directory: ${yamlQuote(placement.prefix)}`);
    }
  }

  const spliced = spliceGeneratedYamlBlock(template, bodyLines);
  if (placement.prefix === '') {
    return spliced;
  }
  return renameCanonicalWorkflow(spliced, `harny feedback (${placement.prefix})`);
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
 *  (lean test fixtures) — never for the real, packaged templates root.
 *
 *  **(MODIFIED — ci-workflow-root.)** `placement` defaults to `ROOT_PLACEMENT`, so
 *  every existing caller and test keeps its exact behavior — and its exact bytes —
 *  without edit. The workflow entry is the one place in `src/` that declares the
 *  non-default write root (WR-5), assigned unconditionally (CW-8): the workflow's
 *  root is always the repository, and for a root install `repoRoot === targetDir`
 *  makes that identical to today's destination. */
export function buildFeedbackFiles(
  payload: HarnessPayload,
  placement: CiPlacement = ROOT_PLACEMENT,
): readonly GeneratedFile[] {
  if (!payload.hookRunner || !payload.ciWorkflowTemplate) {
    return [];
  }

  return [
    { path: FEEDBACK_RUNNER_PATH, contents: payload.hookRunner.contents },
    {
      path: ciWorkflowPathFor(placement.prefix),
      contents: renderCiWorkflow(
        payload.ciWorkflowTemplate.contents,
        payload.conductor.project.components,
        placement,
      ),
      root: 'repo',
    },
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
