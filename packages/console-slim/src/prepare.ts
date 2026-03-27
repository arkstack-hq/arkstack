import chalk from 'chalk'
import { spawn } from 'node:child_process'

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const child = spawn(command, ['exec', 'tsdown', '--log-level=silent'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
        NODE_ENV: process.env.NODE_ENV || 'development',
        CLI_BUILD: 'true',
    }),
})

child.on('error', (error) => {
    throw error
})

child.on('exit', (code) => {
    if (code === 0 || code === null) {
        console.log(chalk.green(`Arkstak is ready for ${process.env.NODE_ENV === 'production' ? 'deployment' : process.env.NODE_ENV}!`))

        return
    }

    throw new Error(`tsdown exited with code ${code}`)

})