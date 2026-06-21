// Snapshots the pnpm workspace catalog into src/catalog.ts so create-arkstack
// can resolve `catalog:` dependency specifiers when scaffolding outside the
// workspace (where pnpm-workspace.yaml is not available).
//
// Run via `pnpm generate:catalog`; also runs automatically before build/test.

import { dirname, join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(here, '../..')
const workspaceFile = join(workspaceRoot, 'pnpm-workspace.yaml')

const workspace = yaml.load(readFileSync(workspaceFile, 'utf8')) ?? {}
const catalog = workspace.catalog ?? {}
const catalogs = workspace.catalogs ?? {}

const output = `// AUTO-GENERATED from pnpm-workspace.yaml by scripts/generate-catalog.mjs.
// Do not edit by hand — run \`pnpm generate:catalog\` (also runs on build/test).
/* eslint-disable */

/** The default workspace catalog (\`catalog:\`). */
export const catalog: Record<string, string> = ${JSON.stringify(catalog, null, 4)}

/** Named workspace catalogs (\`catalog:<name>\`). */
export const catalogs: Record<string, Record<string, string>> = ${JSON.stringify(catalogs, null, 4)}
`

writeFileSync(join(here, '../src/catalog.ts'), output)

console.log(
    `Generated src/catalog.ts (${Object.keys(catalog).length} catalog entries, ${Object.keys(catalogs).length} named catalogs)`,
)
