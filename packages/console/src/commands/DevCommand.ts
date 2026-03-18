import { Command } from '@h3ravel/musket'
import { spawn } from 'node:child_process'

export class DevCommand extends Command {
    protected signature = 'dev'

    protected description = 'Run the development server'

    async handle () {
        await new Promise<void>((resolve, reject) => {
            const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
            const child = spawn(command, ['exec', 'tsdown', '--log-level', 'silent'], {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: Object.assign(process.env, {
                    NODE_ENV: 'development',
                }),
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
}
