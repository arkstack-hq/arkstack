import { env, nodeEnv } from '@arkstack/common'

import { Arkstack } from '@arkstack/contract'
import type { ViewFactory } from './ViewFactory'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

export interface ViteTagOptions {
    /** Force development (Vite dev server) tags regardless of `NODE_ENV`. */
    hot?: boolean
    /** Vite dev server URL. Defaults to `VITE_DEV_URL` or `http://localhost:5173`. */
    devUrl?: string
    /** Path to the Vite build manifest. Defaults to `public/build/.vite/manifest.json`. */
    manifest?: string
    /** Public URL prefix the built assets are served from. Defaults to `/build/`. */
    buildDir?: string
}

interface ManifestChunk {
    file: string
    css?: string[]
}

const scriptTag = (src: string) => `<script type="module" src="${src}"></script>`
const styleTag = (href: string) => `<link rel="stylesheet" href="${href}">`
const isCss = (entry: string) => /\.(css|scss|sass|less|styl|pcss)$/.test(entry)
const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const withTrailingSlash = (value: string) => `${trimTrailingSlash(value)}/`

const devTags = (entries: string[], devUrl: string): string => {
    const base = trimTrailingSlash(devUrl)

    return [
        scriptTag(`${base}/@vite/client`),
        ...entries.map(entry => scriptTag(`${base}/${entry.replace(/^\/+/, '')}`)),
    ].join('\n')
}

const productionTags = (
    entries: string[],
    manifestPath: string,
    buildDir: string
): string => {
    let manifest: Record<string, ManifestChunk>

    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    } catch {
        throw new Error(`Vite manifest not found at ${manifestPath}. Run \`vite build\` before serving in production.`)
    }

    const base = withTrailingSlash(buildDir)
    const tags: string[] = []

    for (const entry of entries) {
        const chunk = manifest[entry]

        if (!chunk) {
            throw new Error(`Vite manifest (${manifestPath}) has no entry for "${entry}".`)
        }

        for (const css of chunk.css ?? []) {
            tags.push(styleTag(`${base}${css}`))
        }

        tags.push(isCss(entry) ? styleTag(`${base}${chunk.file}`) : scriptTag(`${base}${chunk.file}`))
    }

    return tags.join('\n')
}

/**
 * Resolve `<script>`/`<link>` tags for one or more Vite entries.
 *
 * In development (when `NODE_ENV` is not `production`, or `hot` is set) it points
 * at the Vite dev server and includes the `@vite/client`. In production it reads
 * the build manifest and emits the hashed asset tags (including any CSS a chunk
 * imports). Backs the `@vite(...)` Edge tag.
 * 
 * @param entries 
 * @param options 
 * @returns 
 */
export const viteTags = (
    entries: string | string[], 
    options: ViteTagOptions = {}
): string => {
    const list = (Array.isArray(entries) ? entries : [entries]).filter(Boolean)
    const dev = options.hot ?? (nodeEnv() !== 'prod')

    if (dev) {
        return devTags(list, options.devUrl ?? env('VITE_DEV_URL', 'http://localhost:5173'))
    }

    const manifestPath = options.manifest ?? join(Arkstack.rootDir(), 'public', 'build', '.vite', 'manifest.json')

    return productionTags(list, manifestPath, options.buildDir ?? '/build/')
}

/**
 * Register the `@vite(...)` tag (and its backing global) on a view factory so
 * templates can emit Vite asset tags: `@vite('resources/js/app.ts')` or
 * `@vite(['resources/css/app.css', 'resources/js/app.ts'])`.
 * 
 * @param factory 
 */
export const registerViteTag = (factory: ViewFactory): void => {
    factory.edge.global('__arkViteTags', (entries: string | string[], options?: ViteTagOptions) =>
        viteTags(entries, options),
    )

    factory.tag('vite', false, true, (parser, buffer, token) => {
        const expression = `__arkViteTags(${token.properties.jsArg})`
        const ast = parser.utils.transformAst(
            parser.utils.generateAST(expression, token.loc, token.filename),
            token.filename,
            parser,
        )

        buffer.outputExpression(
            parser.utils.stringify(ast),
            token.filename,
            token.loc.start.line,
            false
        )
    })
}
