// oxlint-disable typescript/no-explicit-any
import { describe, expect, it, vi } from 'vitest'

import { EventEmitter } from 'node:events'

vi.mock('node:child_process', () => {
    return {
        spawn: vi.fn(),
    }
})

vi.mock('@ngrok/ngrok', () => ({
    default: {
        forward: vi.fn(),
    },
}))

const makeChild = () => new EventEmitter() as EventEmitter & {
    on: (event: string, listener: (...args: any[]) => void) => EventEmitter;
}

describe('DevCommand', () => {
    it('runs tsdown directly with node when its bin resolves (no pnpm wrapper)', async () => {
        const { spawn } = await import('node:child_process')
        const { DevCommand } = await import('../src/commands/DevCommand')

        vi.spyOn(DevCommand, 'resolveTsdownBin').mockReturnValue('/pkgs/tsdown/dist/run.js')

        const child = makeChild()
        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({ options: () => ({}) })
        child.emit('exit', 0)

        await expect(promise).resolves.toBeUndefined()

        expect(spawn).toHaveBeenCalledWith(
            process.execPath,
            ['/pkgs/tsdown/dist/run.js', '--log-level', 'silent'],
            {
                cwd: process.cwd(),
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'development',
                    APP_HOST: '127.0.0.1',
                    ARKSTACK_ENV_RELOAD: 'true',
                }
            },
        )

        vi.mocked(DevCommand.resolveTsdownBin).mockRestore()
    })

    it('falls back to pnpm exec when the tsdown bin cannot be resolved', async () => {
        const { spawn } = await import('node:child_process')
        const { DevCommand } = await import('../src/commands/DevCommand')

        vi.spyOn(DevCommand, 'resolveTsdownBin').mockReturnValue(undefined)

        const child = makeChild()
        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({ options: () => ({}) })
        child.emit('exit', 0)

        await expect(promise).resolves.toBeUndefined()

        expect(spawn).toHaveBeenCalledWith(
            process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
            ['exec', 'tsdown', '--log-level', 'silent'],
            expect.objectContaining({ cwd: process.cwd(), stdio: 'inherit' }),
        )

        vi.mocked(DevCommand.resolveTsdownBin).mockRestore()
    })

    it('rejects when tsdown exits with a non-zero code', async () => {
        const { spawn } = await import('node:child_process')
        const { DevCommand } = await import('../src/commands/DevCommand')

        const child = makeChild()
        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({ options: () => ({}) })
        child.emit('exit', 1)

        await expect(promise).rejects.toThrow('tsdown exited with code 1')
    })

    it('keeps the tunnel in the dev command and passes its URL to the watcher', async () => {
        const { spawn } = await import('node:child_process')
        const { default: ngrok } = await import('@ngrok/ngrok')
        const { DevCommand } = await import('../src/commands/DevCommand')
        const close = vi.fn().mockResolvedValue(undefined)
        const child = makeChild()

        vi.mocked(ngrok.forward).mockResolvedValueOnce({
            url: () => 'https://stable.ngrok.app',
            close,
        } as any)
        vi.mocked(spawn).mockReturnValueOnce(child as any)

        const promise = DevCommand.prototype.handle.call({
            options: () => ({ tunnel: true }),
            option: () => true,
        })
        await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
        child.emit('exit', 0)

        await expect(promise).resolves.toBeUndefined()
        expect(spawn).toHaveBeenLastCalledWith(
            expect.any(String),
            expect.any(Array),
            expect.objectContaining({
                env: expect.objectContaining({
                    TUNNEL_URL: 'https://stable.ngrok.app',
                }),
            }),
        )
        expect(close).toHaveBeenCalledOnce()
    })

    it('resolveTsdownBin resolves tsdown from the workspace', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        const bin = DevCommand.resolveTsdownBin(process.cwd())
        expect(bin).toMatch(/tsdown/)
        expect(bin).toMatch(/\.[mc]?js$/)
    })
})

describe('devServerEnv', () => {
    it('binds localhost by default', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')
        const vars = DevCommand.devServerEnv({})

        expect(vars.NODE_ENV).toBe('development')
        expect(vars.APP_HOST).toBe('127.0.0.1')
        expect(vars.ARKSTACK_ENV_RELOAD).toBe('true')
        expect(vars.TUNNEL).toBeUndefined()
        expect(vars.APP_SECURE).toBeUndefined()
    })

    it('--host exposes on the local network', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ host: true }).APP_HOST).toBe('0.0.0.0')
    })

    it('--secure flags HTTPS while the command manages Ngrok separately', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ secure: true }).APP_SECURE).toBe('true')
        expect(DevCommand.devServerEnv({ tunnel: true }).TUNNEL).toBeUndefined()
    })

    it('combines all flags', async () => {
        const { DevCommand } = await import('../src/commands/DevCommand')

        expect(DevCommand.devServerEnv({ host: true, secure: true, tunnel: true })).toEqual({
            NODE_ENV: 'development',
            APP_HOST: '0.0.0.0',
            ARKSTACK_ENV_RELOAD: 'true',
            APP_SECURE: 'true',
        })
    })
})
