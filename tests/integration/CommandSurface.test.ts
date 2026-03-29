import { describe, expect, it } from 'vitest'

import { execSync } from 'node:child_process'

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
    it('exposes shared base commands in express', { timeout: 30000 }, () => {
        ensurePrepared('express')
        const output = run('express', 'pnpm cmd --help')

        expect(output).toContain('route:list')
        expect(output).toContain('make:controller')
        expect(output).toContain('make:full-resource')
        expect(output).toContain('dev')
    })

    it('exposes shared base commands in h3', { timeout: 30000 }, () => {
        ensurePrepared('h3')
        const output = run('h3', 'pnpm cmd --help')

        expect(output).toContain('route:list')
        expect(output).toContain('make:controller')
        expect(output).toContain('make:full-resource')
        expect(output).toContain('dev')
    })
})
