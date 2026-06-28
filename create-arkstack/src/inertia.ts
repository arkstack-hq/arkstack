import { InertiaFile, InertiaStackSpec } from './types'

/*
 * create-arkstack - A CLI tool to create Arkstack applications
 *
 * (c) Toneflix
 *
 * The Arkstack framework and all its base packages unless otherwise stated, are
 * open-sourced software licensed under the MIT license.
 */
import { depsList } from './data'

const arkVersion = depsList['@arkstack/common']

/**
 * Files every Inertia stack publishes regardless of framework — the adapter
 * config, the root Edge template, the stylesheet, and the Vite client types.
 * Mirrors the `inertia-config` / `inertia-views` publish groups.
 */
export const sharedInertiaFiles: InertiaFile[] = [
  { from: 'config/inertia.ts.stub', to: 'src/config/inertia.ts' },
  { from: 'config/app.css.stub', to: 'resources/css/app.css' },
  { from: 'views/app.edge.stub', to: 'src/resources/views/app.edge' },
  { from: 'shared/resources/js/vite-env.d.ts.stub', to: 'resources/js/vite-env.d.ts' },
]

/** Server-side dependencies shared by every stack. */
export const sharedInertiaDeps: Record<string, string> = {
  '@arkstack/inertia': arkVersion,
  '@arkstack/view': arkVersion,
  vite: '^8.1.0',
}

/**
 * Per-stack scaffolding. The file maps mirror the `inertia-<stack>` publish
 * groups in `@arkstack/inertia`'s `setup.ts`, and the dependency sets mirror the
 * `express-inertia` reference template.
 */
export const inertiaStacks: InertiaStackSpec[] = [
  {
    name: 'React',
    value: 'react',
    ext: 'tsx',
    reactRefresh: true,
    deps: {
      react: '^19.2.7',
      'react-dom': '^19.2.7',
      '@inertiajs/react': '^3.5.0',
    },
    devDeps: {
      '@types/react': '^19.2.3',
      '@types/react-dom': '^19.2.3',
      '@vitejs/plugin-react': '^6.0.3',
    },
    files: [
      { from: 'react/resources/js/app.tsx.stub', to: 'resources/js/app.tsx' },
      { from: 'react/vite.config.ts.stub', to: 'vite.config.ts' },
      { from: 'react/resources/js/Pages/Index.tsx.stub', to: 'resources/js/Pages/Index.tsx' },
    ],
  },
  {
    name: 'Vue',
    value: 'vue',
    ext: 'ts',
    reactRefresh: false,
    deps: {
      vue: '^3.5.0',
      '@inertiajs/vue3': '^3.5.0',
    },
    devDeps: {
      '@vitejs/plugin-vue': '^6.0.0',
    },
    files: [
      { from: 'vue/resources/js/app.ts.stub', to: 'resources/js/app.ts' },
      { from: 'vue/vite.config.ts.stub', to: 'vite.config.ts' },
      { from: 'vue/resources/js/Pages/Index.vue.stub', to: 'resources/js/Pages/Index.vue' },
    ],
  },
  {
    name: 'Svelte',
    value: 'svelte',
    ext: 'ts',
    reactRefresh: false,
    deps: {
      svelte: '^5.0.0',
      '@inertiajs/svelte': '^3.5.0',
    },
    devDeps: {
      '@sveltejs/vite-plugin-svelte': '^6.0.0',
    },
    files: [
      { from: 'svelte/resources/js/app.ts.stub', to: 'resources/js/app.ts' },
      { from: 'svelte/vite.config.ts.stub', to: 'vite.config.ts' },
      { from: 'svelte/resources/js/Pages/Index.svelte.stub', to: 'resources/js/Pages/Index.svelte' },
    ],
  },
]

/** 
 * Look up a stack spec by its identifier. 
 * 
 * @param stack 
 * @returns 
 */
export const findInertiaStack = (stack: string): InertiaStackSpec | undefined =>
  inertiaStacks.find((s) => s.value === stack)

/**
 * Apply the same stub transforms `@arkstack/inertia`'s publish callback does:
 * fill the client-entry extension and the React Refresh placeholder.
 *
 * @param content  The raw stub contents.
 * @param spec     The selected stack.
 */
export const transformInertiaStub = (
  content: string,
  spec: InertiaStackSpec
): string => content
  .replaceAll('{{ext}}', spec.ext)
  .replaceAll('{{reactRefresh}}', spec.reactRefresh ? '@viteReactRefresh\n    ' : '')
