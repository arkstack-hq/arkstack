import { Command } from '@h3ravel/musket'
import { spawn } from 'node:child_process'

export class BuildCommand extends Command {
    protected signature = 'build'

    protected description = 'Build the application for production'

    async handle () {
        await new Promise<void>((resolve, reject) => {
            const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
            const child = spawn(command, ['exec', 'tsdown'], {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: Object.assign(process.env, {
                    NODE_ENV: 'production',
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
