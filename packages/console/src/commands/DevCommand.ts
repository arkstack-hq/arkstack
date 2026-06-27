import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { spawn } from 'node:child_process'

export interface DevServerOptions {
    /** 
     * Expose the server on the local network (bind 0.0.0.0) instead 
     * of localhost. 
     */
    host?: boolean
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
        {--h|host : Expose the dev server on the local network}
        {--s|secure : Serve the dev server over HTTPS with a self-signed certificate}
    `

    protected description = 'Run the development server'

    async handle() {
        const vars = DevCommand.devServerEnv(this.options())

        await new Promise<void>((resolve, reject) => {
            const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
            const child = spawn(command, [
                'exec', 'tsdown', '--log-level', 'silent'
            ], {
                cwd: Arkstack.rootDir(),
                stdio: 'inherit',
                env: Object.assign(process.env, vars),
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
    }

    /**
     * Map `dev` command flags to the environment variables the running server reads.
     *
     * The dev server binds `127.0.0.1` by default so it is local-only; `--host`
     * switches it to `0.0.0.0` to expose it on the local network. `--secure` flags
     * the driver to serve HTTPS, and `--tunnel` enables the Ngrok tunnel.
     * 
     * @param options 
     * @returns 
     */
    static devServerEnv(
        options: DevServerOptions
    ): Record<string, string> {
        const vars: Record<string, string> = {
            NODE_ENV: 'development',
            APP_HOST: options.host ? '0.0.0.0' : '127.0.0.1',
        }

        if (options.tunnel) {
            vars.TUNNEL = 'true'
        }

        if (options.secure) {
            vars.APP_SECURE = 'true'
        }

        return vars
    }
}
