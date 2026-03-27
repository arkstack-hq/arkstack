import { H3Event, serveStatic } from 'h3'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

/**
 *
 * @param event
 * @returns
 */
export const staticAssetHandler = (publicPath: string = 'public') => {
  return (event: H3Event) => {
    const { pathname } = new URL(event.req.url)

    /**
     * Only serve if it looks like a static asset (has an extension)
     * but skip dotfiles or sensitive files
     */
    if (!/\.[a-zA-Z0-9]+$/.test(pathname)) return
    if (pathname.startsWith('/.') || pathname.includes('..')) return

    /**
     * Serve the asset
     */
    return serveStatic(event, {
      indexNames: ['/index.html'],
      getContents: (id) => {
        const file = join(process.cwd(), publicPath, str(publicPath).before(id).toString())

        return <never>readFile(file).catch(() => null)
      },
      getMeta: async (id) => {
        const file = join(process.cwd(), publicPath, str(publicPath).before(id).toString())
        const stats = await stat(file).catch(() => { })

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
