import { afterEach, describe, expect, test } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import Actions from '../src/actions'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tempDirs: string[] = []

afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
    tempDirs.length = 0
})

/** Build a minimal downloaded-repo layout with the inertia stubs and an express template. */
const scaffold = async () => {
    const repo = await mkdtemp(join(tmpdir(), 'create-arkstack-repo-'))
    const project = await mkdtemp(join(tmpdir(), 'create-arkstack-proj-'))
    tempDirs.push(repo, project)

    // Inertia stubs (subset) under the repo's package dir.
    const stubs = join(repo, 'packages/inertia/stubs')
    await mkdir(join(stubs, 'config'), { recursive: true })
    await mkdir(join(stubs, 'views'), { recursive: true })
    await mkdir(join(stubs, 'shared/resources/js'), { recursive: true })
    await mkdir(join(stubs, 'react/resources/js/Pages'), { recursive: true })

    await writeFile(join(stubs, 'config/inertia.ts.stub'), 'export default () => ({ root_view: "app" })\n')
    await writeFile(join(stubs, 'config/app.css.stub'), 'body { margin: 0 }\n')
    await writeFile(join(stubs, 'views/app.edge.stub'), '@inertiaHead\n    {{reactRefresh}}@vite([\'resources/js/app.{{ext}}\', \'resources/css/app.css\'])\n')
    await writeFile(join(stubs, 'shared/resources/js/vite-env.d.ts.stub'), '/// <reference types="vite/client" />\n')
    await writeFile(join(stubs, 'react/resources/js/app.tsx.stub'), 'createInertiaApp({})\n')
    await writeFile(join(stubs, 'react/vite.config.ts.stub'), 'export default {}\n')
    await writeFile(join(stubs, 'react/resources/js/Pages/Index.tsx.stub'), 'export default function Index() { return null }\n')

    // Project files an express template would carry.
    await mkdir(join(project, 'src/config'), { recursive: true })
    await mkdir(join(project, 'src/routes'), { recursive: true })

    await writeFile(
        join(project, 'src/config/middleware.ts'),
        [
            'import { formdata, requestLogger, resora } from \'@arkstack/driver-express/middlewares\'',
            '',
            'export default () => ({',
            '  before: [',
            '    resora(),',
            '  ],',
            '})',
            '',
        ].join('\n'),
    )
    await writeFile(
        join(project, 'src/routes/web.ts'),
        [
            'import { Router } from \'@arkstack/driver-express\'',
            'import { view } from \'@arkstack/view\'',
            '',
            'Router.get(\'/\', async () => {',
            '  return await view(\'welcome\', { title: \'hi\' })',
            '})',
            '',
        ].join('\n'),
    )
    await writeFile(join(project, 'tsconfig.json'), JSON.stringify({ extends: './.arkstack/tsconfig.json' }, null, 2))
    await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ dependencies: { '@arkstack/view': '^0.15.4' }, scripts: { dev: 'ark dev' } }, null, 2),
    )

    return { repo, project }
}

describe('applyInertia', () => {
    test('captures stubs, writes files, injects deps and patches the runtime (react)', async () => {
        const { repo, project } = await scaffold()

        const actions = new Actions(project)
        const captured = await actions.captureInertiaStubs(repo)
        expect(captured).toBe(true)

        await actions.applyInertia('express', 'react')

        // Files written into the project.
        expect(existsSync(join(project, 'src/config/inertia.ts'))).toBe(true)
        expect(existsSync(join(project, 'resources/css/app.css'))).toBe(true)
        expect(existsSync(join(project, 'resources/js/app.tsx'))).toBe(true)
        expect(existsSync(join(project, 'resources/js/vite-env.d.ts'))).toBe(true)
        expect(existsSync(join(project, 'resources/js/Pages/Index.tsx'))).toBe(true)
        expect(existsSync(join(project, 'vite.config.ts'))).toBe(true)

        // Root template transforms: react ext + the React Refresh preamble.
        const edge = await readFile(join(project, 'src/resources/views/app.edge'), 'utf-8')
        expect(edge).toContain('@viteReactRefresh')
        expect(edge).toContain('resources/js/app.tsx')
        expect(edge).not.toContain('{{ext}}')
        expect(edge).not.toContain('{{reactRefresh}}')

        // Dependencies + scripts.
        const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf-8'))
        expect(pkg.dependencies['@arkstack/inertia']).toBeDefined()
        expect(pkg.dependencies['@inertiajs/react']).toBeDefined()
        expect(pkg.dependencies.react).toBeDefined()
        expect(pkg.dependencies.vite).toBeDefined()
        expect(pkg.devDependencies['@vitejs/plugin-react']).toBeDefined()
        expect(pkg.scripts['dev:client']).toBe('vite')

        // Middleware registers inertia() after resora().
        const mw = await readFile(join(project, 'src/config/middleware.ts'), 'utf-8')
        expect(mw).toContain('import { formdata, inertia, requestLogger, resora }')
        expect(mw).toMatch(/resora\(\),\s*\n\s*inertia\(\),/)

        // Root route renders an Inertia page.
        const web = await readFile(join(project, 'src/routes/web.ts'), 'utf-8')
        expect(web).toContain('import { inertia } from \'@arkstack/inertia\'')
        expect(web).toContain('inertia(\'Index\'')
        expect(web).not.toContain('view(\'welcome\'')

        // tsconfig enables JSX and includes resources/.
        const ts = JSON.parse(await readFile(join(project, 'tsconfig.json'), 'utf-8'))
        expect(ts.compilerOptions.jsx).toBe('react-jsx')
        expect(ts.include).toContain('resources')
    })

    test('vue stack does not enable jsx or the react preamble', async () => {
        const { repo, project } = await scaffold()

        // Provide the vue stubs the spec references.
        const stubs = join(repo, 'packages/inertia/stubs')
        await mkdir(join(stubs, 'vue/resources/js/Pages'), { recursive: true })
        await writeFile(join(stubs, 'vue/resources/js/app.ts.stub'), 'createInertiaApp({})\n')
        await writeFile(join(stubs, 'vue/vite.config.ts.stub'), 'export default {}\n')
        await writeFile(join(stubs, 'vue/resources/js/Pages/Index.vue.stub'), '<template><div /></template>\n')

        const actions = new Actions(project)
        await actions.captureInertiaStubs(repo)
        await actions.applyInertia('express', 'vue')

        expect(existsSync(join(project, 'resources/js/app.ts'))).toBe(true)
        expect(existsSync(join(project, 'resources/js/Pages/Index.vue'))).toBe(true)

        const edge = await readFile(join(project, 'src/resources/views/app.edge'), 'utf-8')
        expect(edge).not.toContain('@viteReactRefresh')
        expect(edge).toContain('resources/js/app.ts')

        const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf-8'))
        expect(pkg.dependencies['@inertiajs/vue3']).toBeDefined()
        expect(pkg.devDependencies['@vitejs/plugin-vue']).toBeDefined()

        const ts = JSON.parse(await readFile(join(project, 'tsconfig.json'), 'utf-8'))
        expect(ts.compilerOptions.jsx).toBeUndefined()
        expect(ts.include).toContain('resources')
    })

    test('adds the React preamble even when the stub predates the {{reactRefresh}} placeholder', async () => {
        const { repo, project } = await scaffold()

        // Simulate an older downloaded stub: no placeholder, hardcoded `app.ts`.
        const stubs = join(repo, 'packages/inertia/stubs')
        await writeFile(
            join(stubs, 'views/app.edge.stub'),
            '@inertiaHead\n    @vite(\'resources/js/app.ts\')\n',
        )

        const actions = new Actions(project)
        await actions.captureInertiaStubs(repo)
        await actions.applyInertia('express', 'react')

        const edge = await readFile(join(project, 'src/resources/views/app.edge'), 'utf-8')
        expect(edge).toContain('@viteReactRefresh')
        // The preamble must sit immediately before the @vite tag.
        expect(edge).toMatch(/@viteReactRefresh\n\s*@vite\(/)
        // The entry extension is corrected to React's `tsx`.
        expect(edge).toContain('resources/js/app.tsx')
        expect(edge).not.toContain('resources/js/app.ts\'')
    })

    test('skips gracefully when stubs were never captured', async () => {
        const project = await mkdtemp(join(tmpdir(), 'create-arkstack-proj-'))
        tempDirs.push(project)
        await writeFile(join(project, 'package.json'), JSON.stringify({ dependencies: {} }))

        const actions = new Actions(project)
        // No captureInertiaStubs() call → nothing to apply.
        await actions.applyInertia('express', 'react')

        expect(existsSync(join(project, 'resources/js/app.tsx'))).toBe(false)
    })
})
