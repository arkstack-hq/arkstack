import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'

import { MakeViewCommand } from '../src/commands/MakeViewCommand'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('MakeViewCommand', () => {
    let cwd: string | undefined

    afterEach(async () => {
        if (cwd) {
            await rm(cwd, { recursive: true, force: true })
            cwd = undefined
        }
    })

    it('creates dot-notated Edge view files in resources/views', async () => {
        cwd = await mkdtemp(join(tmpdir(), 'arkstack-make-view-'))
        const previous = process.cwd()
        process.chdir(cwd)

        try {
            const command = new MakeViewCommand({} as never, {} as never)
            const messages: string[] = []
            const path = command.path('admin.users.index')
            const root = await realpath(cwd)

            Object.assign(command, {
                argument: () => 'admin.users.index',
                option: () => false,
                success: (message: string) => messages.push(message),
                error: (message: string) => messages.push(message),
            })

            await command.handle()

            expect(path).toBe(join(root, 'src', 'resources', 'views', 'admin', 'users', 'index.edge'))
            await expect(readFile(path, 'utf8')).resolves.toContain('index view')
            expect(command.stub('admin.users.index')).toContain('index view')
            expect(messages[0]).toContain('View admin.users.index created successfully')
        } finally {
            process.chdir(previous)
        }
    })
})
