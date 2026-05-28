import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { BuildInterfaces } from '../src/prepare/BuildInterfaces'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('BuildInterfaces', () => {
    let root: string | undefined
    const previousRoot = Arkstack.rootDir()

    afterEach(async () => {
        Arkstack.setRootDir(previousRoot)

        if (root) {
            await rm(root, { recursive: true, force: true })
            root = undefined
        }
    })

    it('includes middleware config entries in generated config types', async () => {
        root = await mkdtemp(join(tmpdir(), 'arkstack-build-interfaces-'))
        const configDir = join(root, 'src', 'config')

        await mkdir(configDir, { recursive: true })
        await mkdir(join(root, '.arkstack'), { recursive: true })
        await writeFile(join(root, 'tsconfig.json'), JSON.stringify({
            compilerOptions: {
                module: 'es2022',
                moduleResolution: 'bundler',
                target: 'es2022',
            },
        }))
        await writeFile(join(configDir, 'app.ts'), 'export default () => ({ name: "Arkstack" })')
        await writeFile(join(configDir, 'middleware.ts'), 'export default () => ({ global: [() => undefined] })')

        Arkstack.setRootDir(root)
        BuildInterfaces.configs(configDir)

        const declaration = await readFile(join(root, '.arkstack', 'ark.d.ts'), 'utf8')

        expect(declaration).toContain('app: {')
        expect(declaration).toContain('middleware: {')
        expect(declaration).toContain('global: Function[]')
    })
})
