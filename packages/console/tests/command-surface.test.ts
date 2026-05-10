import { describe, expect, it } from 'vitest'

import { execSync } from 'node:child_process'
import path from 'node:path'

const preparedApps = new Set<string>()

const run = (cwd: string, command: string) => {
    return execSync(command, {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    })
}

const ensurePrepared = (cwd: string) => {
    if (preparedApps.has(cwd)) {
        return
    }

    run(cwd, 'NODE_ENV=testing pnpm prepare')
    preparedApps.add(cwd)
}

describe('CLI integration surface', () => {
    const wds = ['express', 'h3']

    for (const dir of wds) {
        it('exposes shared base commands in ' + dir, { timeout: 30000 }, () => {
            const cwd = path.join(process.cwd(), dir)
            ensurePrepared(cwd)
            const output = run(cwd, 'pnpm ark --help')

            expect(output).toContain('route:list')
            expect(output).toContain('make:controller')
            expect(output).toContain('make:full-resource')
            expect(output).toContain('dev')
        })
    }
})
