import { dirname, join } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { env } from '@arkstack/common'
import { Command } from '@h3ravel/musket'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import ngrok, { type Listener } from '@ngrok/ngrok'

export interface DevServerOptions {
    /** 
     * Expose the server on the local network (bind 0.0.0.0) instead 
     * of localhost. 
     */
    host?: boolean | string
    /** 
     * Serve over HTTPS with a self-signed certificate. 
     */
    secure?: boolean
    /** 
     * Tunnel the server through Ngrok. 
     */
    tunnel?: boolean
}

export class DevCommand extends Command {
    protected signature = `dev
        {--t|tunnel : Tunnel the dev server through Ngrok}
        {--host : Expose the dev server on the local network}
        {--s|secure : Serve the dev server over HTTPS with a self-signed certificate}
    `

    protected description = 'Run the development server'

    async handle() {
        const vars = DevCommand.devServerEnv(this.options())
        const rootDir = Arkstack.rootDir()
        const bin = DevCommand.resolveTsdownBin(rootDir)
        let tunnel: Listener | undefined

        if (this.option?.('tunnel')) {
            tunnel = await ngrok.forward({
                addr: Number(env('APP_PORT', env('PORT', 3000))),
                authtoken: env('NGROK_AUTHTOKEN'),
                domain: env('NGROK_DOMAIN'),
            })

            const url = tunnel.url()

            if (url) {
                vars.TUNNEL_URL = url
            }
        }

        // Run tsdown directly with node when we can resolve its bin — this avoids
        // the extra `pnpm exec` wrapper process. Fall back to `pnpm exec tsdown`
        // when resolution fails (e.g. an unusual install layout).
        const [command, args] = bin
            ? [process.execPath, [bin, '--log-level', 'silent']]
            : [
                process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
                ['exec', 'tsdown', '--log-level', 'silent'],
            ]

        try {
            await new Promise<void>((resolve, reject) => {
                const child = spawn(command, args, {
                    cwd: rootDir,
                    stdio: 'inherit',
                    env: Object.assign({}, process.env, vars),
                })

                child.on('error', (error) => {
                    reject(error)
                })

                child.on('exit', (code) => {
                    if (code === 0 || code === null) {
                        resolve()

                        return
                    }

                    reject(new Error(`tsdown exited with code ${code}`))
                })
            })
        } finally {
            await tunnel?.close()
        }
    }

    /**
     * Resolve the absolute path to tsdown's executable so it can be run directly
     * with `node`, skipping the `pnpm exec` wrapper process. Returns `undefined`
     * when tsdown cannot be resolved from the app root, letting the caller fall
     * back to `pnpm exec`.
     *
     * @param rootDir  The application root to resolve tsdown from.
     */
    static resolveTsdownBin(rootDir: string): string | undefined {
        try {
            const require = createRequire(join(rootDir, 'noop.js'))
            const pkgPath = require.resolve('tsdown/package.json')
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
                bin?: string | Record<string, string>;
            }
            const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.tsdown

            return bin ? join(dirname(pkgPath), bin) : undefined
        } catch {
            return undefined
        }
    }

    /**
     * Map `dev` command flags to the environment variables the running server reads.
     *
     * The dev server binds `127.0.0.1` by default so it is local-only; `--host`
     * switches it to `0.0.0.0` to expose it on the local network. `--secure` flags
     * the driver to serve HTTPS. The command itself owns the Ngrok tunnel so
     * watcher-driven application restarts cannot replace its public URL.
     * 
     * @param options 
     * @returns 
     */
    static devServerEnv(
        options: DevServerOptions
    ): Record<string, string> {
        const vars: Record<string, string> = {
            NODE_ENV: 'development',
            APP_HOST: typeof options.host === 'boolean'
                ? '0.0.0.0'
                : (options.host ?? '127.0.0.1'),
            ARKSTACK_ENV_RELOAD: 'true',
        }

        if (options.secure) {
            vars.APP_SECURE = 'true'
        }

        return vars
    }
}
