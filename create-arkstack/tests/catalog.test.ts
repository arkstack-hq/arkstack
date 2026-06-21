import { afterEach, describe, expect, test } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import Actions from '../src/actions'
import { catalog } from '../src/catalog'
import { depsList } from '../src/data'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tempDirs: string[] = []

afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
})

const hasCatalogSpecifier = (deps: Record<string, string> = {}) =>
    Object.values(deps).some((version) => version.startsWith('catalog:'))

describe('resolveCatalogDeps', () => {
    test('rewrites catalog: specifiers using the workspace catalog snapshot', async () => {
        const location = await mkdtemp(join(tmpdir(), 'create-arkstack-catalog-'))
        tempDirs.push(location)

        await writeFile(
            join(location, 'package.json'),
            JSON.stringify(
                {
                    dependencies: {
                        // Re-added from depsList, must not remain `catalog:`.
                        '@h3ravel/musket': 'catalog:',
                        // Not in depsList: resolved from the catalog snapshot.
                        dotenv: 'catalog:',
                        keep: '^1.0.0',
                    },
                    devDependencies: {
                        // devDependencies are swept too.
                        dotenv: 'catalog:',
                        keepDev: '^1.0.0',
                    },
                },
                null,
                2,
            ),
        )

        const actions = new Actions(location)
        await actions.makeProfile()
        await actions.saveProfile()

        const pkg = JSON.parse(await readFile(join(location, 'package.json'), 'utf-8'))

        // No catalog: specifier survives in either dependency set.
        expect(hasCatalogSpecifier(pkg.dependencies)).toBe(false)
        expect(hasCatalogSpecifier(pkg.devDependencies)).toBe(false)

        // Unlisted catalog dep resolved from the snapshot.
        expect(pkg.dependencies.dotenv).toBe(catalog.dotenv)
        expect(pkg.devDependencies.dotenv).toBe(catalog.dotenv)

        // Curated depsList wins for framework packages.
        expect(pkg.dependencies['@h3ravel/musket']).toBe(depsList['@h3ravel/musket'])

        // Untouched deps are preserved.
        expect(pkg.dependencies.keep).toBe('^1.0.0')
        expect(pkg.devDependencies.keepDev).toBe('^1.0.0')
    })
})
