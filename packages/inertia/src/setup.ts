import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

// `stubs/` ships alongside `dist/` and `src/` (one level up from this module in
// both the built and source layouts).
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Register the artifacts `@arkstack/inertia` publishes into the application.
 *
 * Run `ark publish --package @arkstack/inertia` to copy the Inertia config and
 * the root Edge template into the app, then customize them for your front-end
 * (Vite tags, title, meta, etc.).
 */
Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-config',
    entries: [
        {
            from: join(root, 'stubs/config/inertia.ts.stub'),
            to: 'src/config/inertia.ts',
        },
    ],
})

Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-views',
    entries: [
        {
            from: join(root, 'stubs/views/app.edge.stub'),
            to: 'src/resources/views/app.edge',
        },
    ],
})

Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-react',
    entries: [
        {
            from: join(root, 'stubs/react/resources/js/app.tsx.stub'),
            to: 'resources/js/app.tsx',
        },
        {
            from: join(root, 'stubs/react/vite.config.ts.stub'),
            to: 'vite.config.ts',
        },
        {
            from: join(root, 'stubs/react/resources/js/Pages/Index.tsx.stub'),
            to: 'resources/js/Pages/Index.tsx',
        }
    ],
})

Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-svelte',
    entries: [
        {
            from: join(root, 'stubs/svelte/resources/js/app.ts.stub'),
            to: 'resources/js/app.ts',
        },
        {
            from: join(root, 'stubs/svelte/vite.config.ts.stub'),
            to: 'vite.config.ts',
        },
        {
            from: join(root, 'stubs/svelte/resources/js/Pages/Index.svelte.stub'),
            to: 'resources/js/Pages/Index.svelte',
        }
    ],
})

Publisher.publishes({
    package: '@arkstack/inertia',
    tag: 'inertia-vue',
    entries: [
        {
            from: join(root, 'stubs/vue/resources/js/app.ts.stub'),
            to: 'resources/js/app.ts',
        },
        {
            from: join(root, 'stubs/vue/vite.config.ts.stub'),
            to: 'vite.config.ts',
        },
        {
            from: join(root, 'stubs/vue/resources/js/Pages/Index.vue.stub'),
            to: 'resources/js/Pages/Index.vue',
        }
    ],
})

Publisher.confirm({
    package: '@arkstack/inertia',
    message: 'What front-end framework are you using with Inertia?',
    options: [
        { name: 'React', value: 'inertia-react' },
        { name: 'Svelte', value: 'inertia-svelte' },
        { name: 'Vue', value: 'inertia-vue' },
    ],
    callback: (tag, stub) => {
        const exts: Record<string, string> = {
            'inertia-react': 'tsx',
            'inertia-svelte': 'ts',
            'inertia-vue': 'ts',
        }

        // React needs the Vite Refresh preamble emitted before the entry tags;
        // the other frameworks don't, so the placeholder collapses to nothing.
        const reactRefresh = tag === 'inertia-react' ? '@viteReactRefresh\n    ' : ''

        return stub
            .replaceAll('{{ext}}', exts[tag] ?? 'ts')
            .replaceAll('{{reactRefresh}}', reactRefresh)
    }
})