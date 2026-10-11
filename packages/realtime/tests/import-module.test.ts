import { describe, expect, it, vi } from 'vitest'

import { createRealtime } from '../src'

/** A Pusher constructor that records how it was built. */
const fakePusher = () => {
  const built: Array<{ key: string; options: Record<string, unknown> }> = []

  class Pusher {
    constructor(key: string, options: Record<string, unknown>) {
      built.push({ key, options })
    }

    subscribe() {
      return { bind() {}, unbind() {}, trigger: () => true }
    }

    unsubscribe() {}

    disconnect() {}
  }

  return { built, module: { default: Pusher } }
}

describe('importModule', () => {
  it('loads pusher-js through the supplied importer', async () => {
    const { built, module } = fakePusher()
    const importModule = vi.fn(async () => module)
    const client = createRealtime({
      transport: 'pusher',
      pusher: { key: 'k', apiBase: '/api' },
      importModule,
    })

    await client.forUser(1, vi.fn())

    expect(importModule).toHaveBeenCalledWith('pusher-js')
    expect(built).toEqual([expect.objectContaining({ key: 'k' })])
  })

  it('loads every firebase module the database transport needs through it', async () => {
    const importModule = vi.fn(
      async (specifier: string) =>
        (
          ({
            'firebase/app': {
              getApps: () => [],
              initializeApp: () => ({ name: 'app' }),
            },
            'firebase/auth': {
              getAuth: () => ({ currentUser: null }),
              signInWithCustomToken: vi.fn(),
              signOut: vi.fn(),
            },
            'firebase/database': {
              getDatabase: () => ({}),
              ref: () => ({}),
              onValue: (_ref: unknown, handler: (snapshot: { val(): unknown }) => void) => {
                handler({ val: () => 0 })

                return () => {}
              },
            },
          }) as Record<string, unknown>
        )[specifier],
    )
    const client = createRealtime({
      transport: 'firebase-database',
      'firebase-database': {
        apiKey: 'a',
        projectId: 'p',
        databaseURL: 'https://p.firebaseio.com',
      },
      importModule,
    })

    await client.onPoll(vi.fn())

    expect(importModule.mock.calls.map(([specifier]) => specifier).sort()).toEqual([
      'firebase/app',
      'firebase/auth',
      'firebase/database',
    ])
  })

  it('issues device tokens through it when falling back to the firebase config', async () => {
    const importModule = vi.fn(
      async (specifier: string) =>
        (
          ({
            'firebase/app': {
              getApps: () => [],
              initializeApp: () => ({ name: 'arkstack-push' }),
            },
            'firebase/messaging': {
              getMessaging: () => ({}),
              isSupported: async () => true,
              getToken: async () => 'token-from-importer',
            },
          }) as Record<string, unknown>
        )[specifier],
    )
    const client = createRealtime({
      transport: 'polling',
      firebase: {
        apiKey: 'a',
        projectId: 'p',
        appId: 'i',
        messagingSenderId: 'm',
      },
      importModule,
    })

    await expect(client.deviceToken()).resolves.toBe('token-from-importer')
    expect(importModule).toHaveBeenCalledWith('firebase/messaging')
  })

  it('explains a missing SDK when the importer fails', async () => {
    const client = createRealtime({
      transport: 'pusher',
      pusher: { key: 'k' },
      importModule: async () => {
        throw new Error('not found')
      },
    })

    await expect(client.forUser(1, vi.fn())).rejects.toThrow(/pusher-js/)
  })
})
