/**
 * Spec: specs/component-level-docs
 * Covers: contract.md CL-1 (one discovery, in the shipped runtime module), CL-2 (the
 * three candidate rules, ignore list, hidden dirs, depth, sorting), CL-9 (determinism);
 * `componentSlug`, `fillComponentTemplate`; intent.md SC1.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { REAL_TEMPLATES_ROOT } from '../helpers/paths.js';
import { COMPONENT_DISCOVERY } from '../../src/component-docs.js';

const modulePath = path.join(REAL_TEMPLATES_ROOT, 'shared', 'components.mjs');

async function load() {
  return (await import(modulePath)) as {
    discoverComponents: (root: string, options: unknown) => string[];
    componentSlug: (dir: string) => string;
    fillComponentTemplate: (template: string, dir: string) => string;
  };
}

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tree(files: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harny-components-'));
  tempDirs.push(root);
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), 'x\n');
  }
  return root;
}

describe('discoverComponents (CL-2)', () => {
  it('finds manifest directories, declared components and source-root domains, sorted and unique', async () => {
    const { discoverComponents } = await load();
    const root = tree([
      'package.json',
      'apps/web/package.json',
      'apps/api/pyproject.toml',
      'services/billing/go/go.mod',
      'deep/a/b/c/package.json',
      'node_modules/lodash/package.json',
      '.hidden/pkg/package.json',
      'tests/fixtures/sample/package.json',
      'src/generators/a.ts',
      'src/generators/b.ts',
      'src/generators/c.ts',
      'src/tiny/a.ts',
      'src/index.ts',
      'docs/guide/README.md',
    ]);
    const found = discoverComponents(root, { ...COMPONENT_DISCOVERY, declared: ['docs/guide', 'apps/web', '.'] });
    expect(found).toEqual(['apps/api', 'apps/web', 'docs/guide', 'services/billing/go', 'src/generators']);
    expect(discoverComponents(root, { ...COMPONENT_DISCOVERY, declared: [] })).toEqual(
      discoverComponents(root, { ...COMPONENT_DISCOVERY, declared: [] }),
    );
  });

  it('returns nothing for a single-package repository with a flat source root', async () => {
    const { discoverComponents } = await load();
    expect(discoverComponents(tree(['package.json', 'src/a.ts', 'src/b.ts']), { ...COMPONENT_DISCOVERY, declared: [] })).toEqual([]);
  });
});

describe('slugs and templates', () => {
  it('slugs nested paths and fills both placeholders', async () => {
    const { componentSlug, fillComponentTemplate } = await load();
    expect(componentSlug('apps/web')).toBe('apps-web');
    expect(fillComponentTemplate('.kiro/steering/component-{slug}.md|{dir}/AGENTS.md|{dir}', 'apps/web')).toBe(
      '.kiro/steering/component-apps-web.md|apps/web/AGENTS.md|apps/web',
    );
  });
});
