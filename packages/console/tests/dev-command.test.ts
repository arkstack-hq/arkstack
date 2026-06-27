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

        const promise = DevCommand.prototype.handle.call({ options: () => ({}) })
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
                    APP_HOST: '127.0.0.1',
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

        const promise = DevCommand.prototype.handle.call({ options: () => ({}) })
        child.emit('exit', 1)

        await expect(promise).rejects.toThrow('tsdown exited with code 1')
    })
})

describe('devServerEnv', () => {
    it('binds localhost by default', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')
        const vars = DevCommand.devServerEnv({})

        expect(vars.NODE_ENV).toBe('development')
        expect(vars.APP_HOST).toBe('127.0.0.1')
        expect(vars.TUNNEL).toBeUndefined()
        expect(vars.APP_SECURE).toBeUndefined()
    })

    it('--host exposes on the local network', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ host: true }).APP_HOST).toBe('0.0.0.0')
    })

    it('--secure flags HTTPS and --tunnel enables Ngrok', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ secure: true }).APP_SECURE).toBe('true')
        expect(DevCommand.devServerEnv({ tunnel: true }).TUNNEL).toBe('true')
    })

    it('combines all flags', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ host: true, secure: true, tunnel: true })).toEqual({
            NODE_ENV: 'development',
            APP_HOST: '0.0.0.0',
            TUNNEL: 'true',
            APP_SECURE: 'true',
        })
    })
})
