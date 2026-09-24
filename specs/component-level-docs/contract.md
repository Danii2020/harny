# Contract: Component-Level Docs

## Interfaces

### Public API

```js
// templates/shared/components.mjs (NEW, shipped verbatim to .sdd/shared/components.mjs)
/** @returns {string[]} POSIX dirs relative to root, sorted, unique, never '.' */
export function discoverComponents(root, options);
export function componentSlug(dir); // 'apps/web' -> 'apps-web'
/** Fills {dir} and {slug} in a template string. */
export function fillComponentTemplate(template, dir);
```

```ts
// src/generators/types.ts — MODIFIED
export interface ComponentBridge {
  /** Install-relative path template with {dir}/{slug}. */
  readonly path: string;
  /** Exact file contents template with {dir}/{slug}; ends in one \n. */
  readonly contents: string;
  /** A literal the bridge must contain to count as wired (doctor). */
  readonly marker: string;
}
export interface Generator {
  // …existing members…
  /** undefined: the tool reads a nested AGENTS.md natively. */
  readonly componentBridge: ComponentBridge | undefined;
}

// src/component-docs.ts (NEW)
export const COMPONENT_DOC_NAME: string;           // 'AGENTS.md'
export const COMPONENT_DISCOVERY: ComponentDiscoveryOptions; // manifests, sourceRoots, ignore, depth, minFiles
export const SHARED_COMPONENTS_PATH: string;       // '.sdd/shared/components.mjs'
export function loadDiscovery(templatesRoot: string): Promise<{ discoverComponents: …; fillComponentTemplate: … }>;
export function buildComponentBridgeFiles(targetDir, components, generators, discovery):
  Promise<{ files: readonly GeneratedFile[]; warnings: readonly string[] }>;
```

### Data Models

`ComponentDiscoveryOptions` (in `checks.json` as `componentDocs.discovery`):
`manifests` (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`,
`build.gradle`, `build.gradle.kts`, `Gemfile`, `composer.json`), `sourceRoots`
(`src`, `lib`, `app`), `ignore` (`node_modules`, `dist`, `build`, `out`, `coverage`,
`vendor`, `target`, `venv`, `__pycache__`, `fixtures`, plus every hidden directory),
`maxDepth: 3`, `minFiles: 3`, `declared` (harness components other than `.`).

`checks.json` gains `componentDocs: { discovery, docName, bridges: [{ tool, path, marker }] }`.

Per-tool bridges:

| Tool | `componentBridge` |
|---|---|
| Claude Code | path `{dir}/CLAUDE.md`; contents `@AGENTS.md\n`; marker `@AGENTS.md` |
| Kiro | path `.kiro/steering/component-{slug}.md`; contents: frontmatter `inclusion: fileMatch`, `fileMatchPattern: "{dir}/**"`, then `#[[file:{dir}/AGENTS.md]]`; marker `#[[file:{dir}/AGENTS.md]]` |
| Cursor, GitHub Copilot, Codex | `undefined` |

## Behavior Guarantees

1. **CL-1 — One discovery.** `discoverComponents` is the only implementation; `src/`
   loads it from the templates root, and the doctor runner imports the shipped copy.
   (G1)
2. **CL-2 — Discovery rules.** A candidate is (a) any non-root directory up to
   `maxDepth` below the root holding a listed manifest, (b) a declared component, or
   (c) a direct child directory of a top-level source root holding ≥ `minFiles` files
   (not counting subdirectories). Ignored and hidden directories are never entered.
   Results are POSIX, sorted, unique. (G1)
3. **CL-3 — Doctor entries.** In the repo-readiness family, after its static entries:
   `repo-readiness:component-doc:<dir>` (`<dir>/AGENTS.md` exists), then for each bridge
   `repo-readiness:component-bridge:<tool>:<dir>` (the bridge file contains its filled
   marker). Both are `recommended`. A missing `AGENTS.md` skips that component's bridge
   entries. Remediations name the exact file and content. (G2)
4. **CL-4 — Compatibility.** No `componentDocs` in checks, or a missing
   `.sdd/shared/components.mjs`, produces no component entries and no error. (G5 of
   doctor-security-checks precedent)
5. **CL-5 — Init bridges.** For each discovered component with an `AGENTS.md` and each
   resolved generator with a `componentBridge`, when the bridge path does not exist,
   `init` writes it. When it exists and lacks the marker, `init` writes nothing and
   warns. It never produces a conflict. (G4)
6. **CL-6 — Native tools untouched.** Cursor, Copilot and Codex get no bridge files. (G3)
7. **CL-7 — Bridge content.** Claude Code's is exactly `@AGENTS.md\n` (relative import,
   resolved from the importing file per Claude Code docs). Kiro's is steering
   frontmatter with `inclusion: fileMatch` and a quoted `fileMatchPattern`, then the
   include directive. (G3)
8. **CL-8 — Skill step.** Both `harny-document/SKILL.md` roots gain an identical,
   tool-neutral component-docs step. (G5, S7)
9. **CL-9 — Determinism.** Given the same filesystem, discovery and bridges are
   byte-identical; paths are contained in the install directory. (S3)
10. **CL-10 — Dogfood.** `src/generators/AGENTS.md` and `src/generators/CLAUDE.md` exist
    here; this repo's doctor reports them OK; `.sdd/*` equal a fresh render. (G6)

## Error Handling Contract

| Error Condition | Behavior | User Impact |
|---|---|---|
| Unreadable directory during discovery | Skipped | Fewer components, never a crash |
| Existing `CLAUDE.md` without import | No write; one warning with the line to add | Nothing clobbered |
| Older install without `components.mjs` | Component entries absent | Doctor unchanged |

## Dependencies

- Internal: `src/init.ts`, `src/engine.ts`, `src/doctor.ts`, `src/templates.ts`, five
  generators, `templates/doctor/run-doctor.mjs`. External: none (S4).

## Integration Points

- `templates/skills/harny-document/SKILL.md` + `.agents/` copy; `templates/doctor/README.md`;
  README. Tests: `tests/component-docs.test.ts`, `tests/shared/components.test.ts`,
  `tests/doctor/run-doctor-components.test.ts`; generator tests; e2e/goldens.

## Amendment A1 (2026-09-24, during implementation)

Two existing guards applied to this feature and were honored rather than weakened:

- **MC-15 / SC14 (monorepo-mode):** generator files must never carry "component"
  vocabulary, so that generators stay monorepo-blind. The `Generator` member is
  therefore named `nestedGuidance` (type `NestedGuidanceBridge`), and Kiro's bridge
  path is `.kiro/steering/agents-{slug}.md`. Every other name in this contract (the
  checks key `componentDocs`, the doctor ids, `src/component-docs.ts`) lives outside
  `src/generators/` and is unchanged.
- **TG-5:** generators never hand-roll frontmatter, so Kiro's bridge frontmatter is
  rendered by `renderFrontmatter` (`inclusion` raw, `fileMatchPattern` quoted). The
  bytes are identical to the table above.
