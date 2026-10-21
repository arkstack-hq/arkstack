import type { ServerStartInfo } from '@arkstack/contract'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { H3 } from 'h3'
import { H3Driver } from '../src/index'
import { Hook } from '@arkstack/foundry'

vi.mock('@ngrok/ngrok', () => ({
  default: { forward: vi.fn(async () => ({ url: () => 'https://opened.ngrok.app' })) },
}))

// `serve` "binds" immediately, so no real port is opened.
vi.mock('h3', async (original) => ({
  ...(await original<typeof import('h3')>()),
  serve: vi.fn(() => ({ ready: async () => undefined })),
}))

/** Start the driver and return what the `server:start` hook received. */
const startAndCapture = async (port = 4321) => {
  let received: ServerStartInfo | undefined
  Hook.on('server:start', { after: (info) => void (received = info) })

  // H3's start() awaits the hook, so it has run once start() resolves.
  await new H3Driver({ bindRouter: vi.fn() } as never).start(new H3(), port)

  return received!
}

describe('H3Driver server:start hook', () => {
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
    expect(await startAndCapture(4321)).toEqual({
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

    expect((await startAndCapture()).tunnelUrl).toBe('https://opened.ngrok.app')
  })

  it('runs the hook after the startup banner', async () => {
    const order: string[] = []
    vi.mocked(console.log).mockImplementation(() => void order.push('banner'))
    Hook.on('server:start', { after: () => void order.push('hook') })

    await new H3Driver({ bindRouter: vi.fn() } as never).start(new H3(), 4321)

    expect(order).toEqual(['banner', 'hook'])
  })

  it('logs a failing listener instead of rejecting start()', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    Hook.on('server:start', {
      after: () => {
        throw new Error('listener blew up')
      },
    })

    await expect(new H3Driver({ bindRouter: vi.fn() } as never).start(new H3(), 4321)).resolves.toBeUndefined()
    expect(errors.mock.calls.flat().join(' ')).toContain('listener blew up')
  })

  describe('tunneled position', () => {
    /** Start the driver (which awaits every position) and report what ran. */
    const startAndWatch = async () => {
      const order: string[] = []
      let tunneled: ServerStartInfo | undefined
      Hook.on('server:start', {
        after: () => void order.push('after'),
        tunneled: (info) => {
          order.push('tunneled')
          tunneled = info
        },
      })

      await new H3Driver({ bindRouter: vi.fn() } as never).start(new H3(), 4321)

      return { order, tunneled }
    }

    it('runs after `after` with the tunnel it opened', async () => {
      process.env.TUNNEL = 'true'

      const { order, tunneled } = await startAndWatch()

      expect(order).toEqual(['after', 'tunneled'])
      expect(tunneled?.tunnelUrl).toBe('https://opened.ngrok.app')
    })

    it('does not run without a tunnel', async () => {
      expect((await startAndWatch()).order).toEqual(['after'])
    })

    it('still runs when `after` throws', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      process.env.TUNNEL_URL = 'https://preset.example.com'
      let tunnelUrl: string | undefined
      Hook.on('server:start', {
        after: () => {
          throw new Error('after blew up')
        },
        tunneled: (info) => void (tunnelUrl = info.tunnelUrl),
      })

      await new H3Driver({ bindRouter: vi.fn() } as never).start(new H3(), 4321)

      expect(tunnelUrl).toBe('https://preset.example.com')
    })
  })
})
