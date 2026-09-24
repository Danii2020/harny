/**
 * Component-level docs (specs/component-level-docs): the one owner of the discovery
 * settings, the component doc name, the shipped discovery module's path, and the
 * bridges `harny init` writes for tools that do not read a nested `AGENTS.md`.
 *
 * Discovery itself is implemented once, in `templates/shared/components.mjs`, which
 * the doctor runner imports in every install; this module loads that same file from
 * the templates root rather than re-implementing it (CL-1).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GeneratedFile, Generator } from './generators/types.js';

/** The per-component doc every tool is pointed at: the cross-tool name, placed in
 *  the component's own directory. A separate concept from the root guidance path
 *  `src/doctor.ts` owns (and deliberately not imported from there, which would make
 *  the two modules import each other). */
export const COMPONENT_DOC_NAME = 'AGENTS.md';

/** Where the discovery module is installed, beside `probes.mjs`. */
export const SHARED_COMPONENTS_PATH = '.sdd/shared/components.mjs';

export interface ComponentDiscoveryOptions {
  readonly manifests: readonly string[];
  readonly sourceRoots: readonly string[];
  readonly ignore: readonly string[];
  readonly maxDepth: number;
  readonly minFiles: number;
  readonly declared?: readonly string[];
}

/** The discovery heuristic's settings (contract.md § Data Models), carried into
 *  `checks.json` as data so the runner hard-codes none of them. */
export const COMPONENT_DISCOVERY: ComponentDiscoveryOptions = {
  manifests: [
    'package.json',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'Gemfile',
    'composer.json',
  ],
  sourceRoots: ['src', 'lib', 'app'],
  ignore: ['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'target', 'venv', '__pycache__', 'fixtures'],
  maxDepth: 3,
  minFiles: 3,
};

export interface ComponentDiscovery {
  readonly discoverComponents: (root: string, options: ComponentDiscoveryOptions) => string[];
  readonly fillComponentTemplate: (template: string, dir: string) => string;
}

/** Loads the shipped discovery module from a templates root (CL-1). */
export async function loadDiscovery(templatesRoot: string): Promise<ComponentDiscovery> {
  const url = pathToFileURL(path.join(templatesRoot, 'shared', 'components.mjs')).href;
  return (await import(url)) as ComponentDiscovery;
}

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * The bridges `init` writes (CL-5): for each component that already has an
 * `AGENTS.md`, each generator with a `nestedGuidance`, a missing bridge file. An
 * existing bridge path is never written: silent when it already carries the marker,
 * one warning naming the line to add when it does not. Components in the given
 * (sorted) order, generators in the given order — deterministic (CL-9).
 */
export async function buildNestedGuidanceBridgeFiles(
  targetDir: string,
  components: readonly string[],
  generators: readonly Generator[],
  discovery: ComponentDiscovery,
): Promise<{ readonly files: readonly GeneratedFile[]; readonly warnings: readonly string[] }> {
  const files: GeneratedFile[] = [];
  const warnings: string[] = [];
  for (const dir of components) {
    if ((await readIfExists(path.join(targetDir, dir, COMPONENT_DOC_NAME))) === undefined) continue;
    for (const generator of generators) {
      const bridge = generator.nestedGuidance;
      if (!bridge) continue;
      const bridgePath = discovery.fillComponentTemplate(bridge.path, dir);
      const marker = discovery.fillComponentTemplate(bridge.marker, dir);
      const existing = await readIfExists(path.join(targetDir, bridgePath));
      if (existing === undefined) {
        files.push({ path: bridgePath, contents: discovery.fillComponentTemplate(bridge.contents, dir) });
      } else if (!existing.includes(marker)) {
        warnings.push(
          `${bridgePath} exists but does not include ${dir}/${COMPONENT_DOC_NAME}; add "${marker}" to it so ${generator.displayName} reads the component's guidance.`,
        );
      }
    }
  }
  return { files, warnings };
}
