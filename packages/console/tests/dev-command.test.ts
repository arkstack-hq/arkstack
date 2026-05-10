// oxlint-disable typescript/no-explicit-any
import { describe, expect, it, vi } from 'vitest'

import { EventEmitter } from 'node:events'

vi.mock('node:child_process', () => {
    return {
        spawn: vi.fn(),
    }
})

describe('DevCommand', () => {
    it('spawns tsdown with silent log level', async () => {
        const { spawn } = await import('node:child_process')
        const { DevCommand } = await import('../src/commands/DevCommand')

        const child = new EventEmitter() as EventEmitter & {
            on: (event: string, listener: (...args: any[]) => void) => EventEmitter;
        }

        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({})
        child.emit('exit', 0)

        await expect(promise).resolves.toBeUndefined()

        expect(spawn).toHaveBeenCalledWith(
            process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
            ['exec', 'tsdown', '--log-level', 'silent'],
            {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'development',
                }
            },
        )
    })

    it('rejects when tsdown exits with a non-zero code', async () => {
        const { spawn } = await import('node:child_process')
        const { DevCommand } = await import('../src/commands/DevCommand')

        const child = new EventEmitter() as EventEmitter & {
            on: (event: string, listener: (...args: any[]) => void) => EventEmitter;
        }

        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({})
        child.emit('exit', 1)

        await expect(promise).rejects.toThrow('tsdown exited with code 1')
    })
})
