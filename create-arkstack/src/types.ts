export type KitName = 'express' | 'h3' | 'fastify' | 'koa' | 'nest' | 'next' | 'nuxt'

export interface Template {
    name: string;
    alias: 'express' | 'h3' | 'express-lean' | 'h3-lean';
    hint: string;
    source: string;
    lean?: boolean;
    locked?: boolean;
    baseAlias?: 'express' | 'h3';
    prereleaseSource?: string;
}



/** Supported Inertia front-end stacks (plus `none` to opt out). */
export type InertiaStack = 'none' | 'react' | 'vue' | 'svelte'

/** A single file copied from `@arkstack/inertia`'s stubs into the new project. */
export interface InertiaFile {
    /** Path of the stub, relative to the package's `stubs/` directory. */
    from: string
    /** Destination path, relative to the project root. */
    to: string
}

export interface InertiaStackSpec {
    /** Display name shown in the prompt. */
    name: string
    /** The stack identifier / prompt value. */
    value: Exclude<InertiaStack, 'none'>
    /** Client entry extension (`tsx` for React, otherwise `ts`). */
    ext: 'tsx' | 'ts'
    /** Whether the root template needs the `@viteReactRefresh` preamble. */
    reactRefresh: boolean
    /** Runtime dependencies this stack adds. */
    deps: Record<string, string>
    /** Dev dependencies this stack adds. */
    devDeps: Record<string, string>
    /** Stack-specific stub files (the shared files are added on top). */
    files: InertiaFile[]
}