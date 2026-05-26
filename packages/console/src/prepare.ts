import { existsSync, mkdirSync } from 'node:fs'

import { BuildInterfaces } from './prepare/BuildInterfaces'
import chalk from 'chalk'
import path from 'node:path'
import { spawn } from 'node:child_process'

if (!existsSync(path.join(process.cwd(), '.arkstack/build')))
    mkdirSync(path.join(process.cwd(), '.arkstack/build'))

const NODE_ENV = process.env.NODE_ENV || 'development'
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const child = spawn(command, ['exec', 'tsdown', '--log-level=silent'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: Object.assign({}, process.env, {
        NODE_ENV,
        CLI_BUILD: 'true',
    }),
})

child.on('error', (error) => {
    throw error
})

child.on('exit', (code) => {
    if (code === 0 || code === null) {
        console.log(chalk.green(`Arkstak is ready for ${NODE_ENV === 'production' ? 'deployment' : NODE_ENV}!`))

        return
    }

    throw new Error(`tsdown exited with code ${code}`)

})

BuildInterfaces.configs()
BuildInterfaces.tsconfig()