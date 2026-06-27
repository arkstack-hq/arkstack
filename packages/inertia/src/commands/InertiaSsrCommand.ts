import { resolveSsrBundle, superviseProcess } from '../ssr-process'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { existsSync } from 'node:fs'
import { inertiaConfig } from '../config'

/**
 * Run the Inertia SSR server (the app's built SSR bundle) as a long-running
 * process, restarting it if it crashes.
 *
 * The bundle is built separately (e.g. `vite build --ssr src/ssr.ts --outDir
 * dist-ssr`); this command supervises it.
 */
export class InertiaSsrCommand extends Command {
    protected signature = `inertia:ssr
        {--bundle= : Path to the built SSR bundle. Defaults to inertia.ssr.bundle or dist-ssr/ssr.js.}
        {--no-restart : Do not restart the SSR server when it exits.}
    `

    protected description = 'Run the Inertia SSR server as a long-running process, restarting it if it crashes'

    async handle() {
        const bundle = resolveSsrBundle(
            Arkstack.rootDir(),
            this.option('bundle'),
            inertiaConfig().ssr.bundle,
        )

        if (!existsSync(bundle)) {
            this.error(`Inertia SSR bundle not found at ${bundle}. Build it first, e.g. \`vite build --ssr src/ssr.ts --outDir dist-ssr\`.`)

            return
        }

        const restart = this.option('restart') !== false
        this.info(`Starting Inertia SSR server (${bundle})`)

        const controller = superviseProcess(process.execPath, [bundle], {
            cwd: Arkstack.rootDir(),
            restart,
            onExit: (code, willRestart) => {
                if (willRestart) {
                    this.warn(`Inertia SSR server exited (code ${code}); restarting…`)
                }
            },
            onError: (error) => {
                this.error(`Failed to start Inertia SSR server: ${error.message}`)
            },
        })

        process.once('SIGINT', () => controller.stop())
        process.once('SIGTERM', () => controller.stop())

        await controller.done
    }
}
