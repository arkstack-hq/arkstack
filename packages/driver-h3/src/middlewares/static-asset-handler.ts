import { H3Event, serveStatic } from 'h3'
import { readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export const staticAssetHandler = (publicPath: string = 'public') => {
    const rootPath = resolve(process.cwd(), publicPath)

    return (event: H3Event) => {
        const { pathname } = new URL(event.req.url)

        if (!/\.[a-zA-Z0-9]+$/.test(pathname)) return
        if (pathname.startsWith('/.') || pathname.includes('..')) return

        event.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
        event.res.headers.set('Access-Control-Allow-Origin', '*')
        event.res.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        event.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

        return serveStatic(event, {
            indexNames: ['/index.html'],
            getContents: (id) => {
                const relativePath = id.replace(/^\/+/, '')
                const file = join(rootPath, relativePath)

                return readFile(file).catch(() => null) as never
            },
            getMeta: async (id) => {
                const relativePath = id.replace(/^\/+/, '')
                const file = join(rootPath, relativePath)
                const stats = await stat(file).catch(() => undefined)

                if (stats?.isFile()) {
                    return {
                        size: stats.size,
                        mtime: stats.mtimeMs,
                    }
                }
            },
        })
    }
}