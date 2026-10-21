import type { ServerStartInfo } from '@arkstack/contract'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Express } from 'express'
import { ExpressDriver } from '../src/index'
import { Hook } from '@arkstack/foundry'

vi.mock('@ngrok/ngrok', () => ({
  default: { forward: vi.fn(async () => ({ url: () => 'https://opened.ngrok.app' })) },
}))

/** A fake app whose `listen` "binds" immediately, so no real port is opened. */
const fakeApp = () => ({ listen: vi.fn((_port, _host, onListen: () => void) => onListen()) }) as unknown as Express

/** Start the driver and resolve with what the `server:start` hook received. */
const startAndCapture = (port = 4321) =>
  new Promise<ServerStartInfo>((resolve) => {
    Hook.on('server:start', { after: (info) => resolve(info) })
    new ExpressDriver({ bindRouter: vi.fn() }).start(fakeApp(), port)
  })

describe('ExpressDriver server:start hook', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    Hook.clear()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    for (const key of ['APP_HOST', 'HOST', 'APP_SECURE', 'TUNNEL', 'TUNNEL_URL']) delete process.env[key]
  })

  afterEach(() => {
    process.env = { ...saved }
    vi.restoreAllMocks()
  })

  it('reports the bound address and a browsable local url', async () => {
    const info = await startAndCapture(4321)

    expect(info).toEqual({
      host: '0.0.0.0',
      port: 4321,
      scheme: 'http',
      secure: false,
      url: 'http://localhost:4321',
      tunnelUrl: undefined,
    })
  })

  it('passes the url of a tunnel it opened (not the unset TUNNEL_URL)', async () => {
    process.env.TUNNEL = 'true'

    const info = await startAndCapture()

    expect(info.tunnelUrl).toBe('https://opened.ngrok.app')
  })

  it('passes a pre-set TUNNEL_URL through', async () => {
    process.env.TUNNEL_URL = 'https://preset.example.com'

    const info = await startAndCapture()

    expect(info.tunnelUrl).toBe('https://preset.example.com')
  })

  it('logs a failing listener instead of crashing the started server', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let settled!: () => void
    const done = new Promise<void>((resolve) => (settled = resolve))

    Hook.on('server:start', {
      after: async () => {
        setTimeout(settled, 0)
        throw new Error('listener blew up')
      },
    })

    await new ExpressDriver({ bindRouter: vi.fn() }).start(fakeApp(), 4321)
    await done

    expect(errors.mock.calls.flat().join(' ')).toContain('listener blew up')
  })

  describe('tunneled position', () => {
    /** Start the driver; resolve with the order positions ran and the tunneled payload. */
    const startAndWatch = () =>
      new Promise<{ order: string[]; tunneled?: ServerStartInfo }>((resolve) => {
        const order: string[] = []
        Hook.on('server:start', {
          after: () => {
            order.push('after')
            // No tunnel: `tunneled` never runs, so settle once `after` has.
            if (!process.env.TUNNEL && !process.env.TUNNEL_URL) setTimeout(() => resolve({ order }), 0)
          },
          tunneled: (info) => {
            order.push('tunneled')
            resolve({ order, tunneled: info })
          },
        })
        new ExpressDriver({ bindRouter: vi.fn() }).start(fakeApp(), 4321)
      })

    it('runs after `after` with the tunnel it opened', async () => {
      process.env.TUNNEL = 'true'

      const { order, tunneled } = await startAndWatch()

      expect(order).toEqual(['after', 'tunneled'])
      expect(tunneled?.tunnelUrl).toBe('https://opened.ngrok.app')
    })

    it('runs for a preset TUNNEL_URL', async () => {
      process.env.TUNNEL_URL = 'https://preset.example.com'

      expect((await startAndWatch()).tunneled?.tunnelUrl).toBe('https://preset.example.com')
    })

    it('does not run without a tunnel', async () => {
      const { order, tunneled } = await startAndWatch()

      expect(order).toEqual(['after'])
      expect(tunneled).toBeUndefined()
    })

    it('still runs when `after` throws', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      process.env.TUNNEL = 'true'

      const tunneled = new Promise<string>((resolve) =>
        Hook.on('server:start', {
          after: () => {
            throw new Error('after blew up')
          },
          tunneled: ({ tunnelUrl }) => resolve(tunnelUrl),
        }),
      )
      new ExpressDriver({ bindRouter: vi.fn() }).start(fakeApp(), 4321)

      expect(await tunneled).toBe('https://opened.ngrok.app')
    })
  })
})
