import {
  Broadcast,
  FirebaseDatabaseRealtimeDriver,
  FirebaseRealtimeDriver,
  MemoryRealtimeDriver,
  Notification,
  PollingRealtimeDriver,
  PusherRealtimeDriver,
  UserNotificationCenter,
  firebaseChannelKey,
} from '../src'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** Override `drivers.realtime` for one test. */
const withSettings = (settings: Record<string, unknown>) => {
  vi.spyOn(Broadcast as any, 'settings').mockReturnValue(settings)
}

afterEach(() => {
  vi.restoreAllMocks()
  Broadcast.forgetChannels()
  MemoryRealtimeDriver.clear()
})

describe('Broadcast channel registry', () => {
  it('passes placeholder values to the authorizer', async () => {
    const authorizer = vi.fn(() => true)
    Broadcast.channel('private-team.{teamId}.project.{projectId}', authorizer)

    await expect(Broadcast.authorize({ id: 1 }, 'private-team.t-1.project.p-2')).resolves.toBe(true)
    expect(authorizer).toHaveBeenCalledWith({ id: 1 }, { teamId: 't-1', projectId: 'p-2' })
  })

  it('does not let a placeholder span a dot', async () => {
    Broadcast.channel('private-team.{teamId}', () => true)

    await expect(Broadcast.authorize({ id: 1 }, 'private-team.t-1.project.p-2')).resolves.toBe(false)
  })

  it('denies a channel no rule matches', async () => {
    await expect(Broadcast.authorize({ id: 1 }, 'private-anything')).resolves.toBe(false)
  })

  it('allows the per-user channel for its own user only', async () => {
    await expect(Broadcast.authorize({ id: 7 }, 'user.7')).resolves.toBe(true)
    await expect(Broadcast.authorize({ id: 8 }, 'user.7')).resolves.toBe(false)
    await expect(Broadcast.authorize(null, 'user.7')).resolves.toBe(false)
  })

  it('lets a rule override the per-user channel', async () => {
    Broadcast.channel('user.{id}', () => false)

    await expect(Broadcast.authorize({ id: 7 }, 'user.7')).resolves.toBe(false)
  })

  it('replaces an earlier rule for the same pattern', async () => {
    Broadcast.channel('private-x.{id}', () => false)
    Broadcast.channel('private-x.{id}', () => true)

    await expect(Broadcast.authorize({}, 'private-x.1')).resolves.toBe(true)
  })

  it('treats regex characters in a pattern literally', async () => {
    Broadcast.channel('private-a+b.{id}', () => true)

    await expect(Broadcast.authorize({}, 'private-aab.1')).resolves.toBe(false)
    await expect(Broadcast.authorize({}, 'private-a+b.1')).resolves.toBe(true)
  })
})

describe('Broadcast transports', () => {
  it('builds every built-in transport', () => {
    expect(Broadcast.make('pusher')).toBeInstanceOf(PusherRealtimeDriver)
    expect(Broadcast.make('firebase')).toBeInstanceOf(FirebaseRealtimeDriver)
    expect(Broadcast.make('firebase-database')).toBeInstanceOf(FirebaseDatabaseRealtimeDriver)
    expect(Broadcast.make('polling')).toBeInstanceOf(PollingRealtimeDriver)
    expect(Broadcast.make('memory')).toBeInstanceOf(MemoryRealtimeDriver)
  })

  it('rejects an unknown transport', () => {
    expect(() => Broadcast.make('nope' as never)).toThrow(/unknown transport/)
  })

  it('uses the configured transport', () => {
    withSettings({ transport: 'memory' })

    expect(Broadcast.driver()).toBeInstanceOf(MemoryRealtimeDriver)
    expect(Notification.realtime().driver).toBeInstanceOf(MemoryRealtimeDriver)
  })

  it('broadcasts arbitrary events and skips an empty channel list', async () => {
    withSettings({ transport: 'memory' })

    await Broadcast.broadcast(['a', 'b'], 'session.updated', { id: 's-1' })
    await Broadcast.broadcast([], 'ignored', {})

    expect(MemoryRealtimeDriver.broadcasts()).toEqual([
      {
        channel: ['a', 'b'],
        event: 'session.updated',
        payload: { id: 's-1' },
        delivery: undefined,
      },
    ])
  })

  it('records memory broadcasts on globalThis so separate module graphs share them', async () => {
    await new MemoryRealtimeDriver().broadcast('c', 'e', { n: 1 })

    const store = globalThis as Record<symbol, unknown[]>

    expect(store[Symbol.for('arkstack.realtime.memory')]).toHaveLength(1)
  })

  it('tells polling clients how often to poll and pushes nothing', async () => {
    const driver = new PollingRealtimeDriver({ interval: 2000 })

    await expect(driver.broadcast('c', 'e', {})).resolves.toBeUndefined()
    expect(driver.clientConfig()).toEqual({ interval: 2000 })
  })

  it('hands pusher-js a self-hosted server address when host is set', () => {
    const driver = new PusherRealtimeDriver({
      key: 'k',
      cluster: 'eu',
      use_tls: false,
      host: 'soketi.test',
      port: 6001,
    })

    expect(driver.clientConfig()).toEqual({
      key: 'k',
      cluster: 'eu',
      forceTLS: false,
      wsHost: 'soketi.test',
      wsPort: 6001,
      wssPort: 6001,
    })
  })

  it('omits the server address for hosted Pusher', () => {
    const driver = new PusherRealtimeDriver({ key: 'k', cluster: 'eu' })

    expect(driver.clientConfig()).toEqual({
      key: 'k',
      cluster: 'eu',
      forceTLS: true,
    })
  })

  it('describes the active transport and the push transport for clients', () => {
    withSettings({
      transport: 'polling',
      push: 'firebase',
      channel_prefix: 'private-user.',
    })

    const config = Broadcast.clientConfig()

    expect(config.transport).toBe('polling')
    expect(config.channelPrefix).toBe('private-user.')
    expect(config.event).toBe('notification')
    expect(config.polling).toEqual({ interval: 5000 })
    expect(config.firebase).toEqual(expect.objectContaining({ vapidKey: expect.any(String) }))
  })
})

describe('Broadcast.handleAuth', () => {
  it('requires a channel name', async () => {
    await expect(Broadcast.handleAuth({ id: 1 }, {})).rejects.toThrow(/channel_name/)
  })

  it('denies a channel the subject is not authorized for', async () => {
    await expect(Broadcast.handleAuth({ id: 1 }, { channel_name: 'user.2', socket_id: '1.1' })).rejects.toThrow(
      /denied/,
    )
  })

  it('requires a socket id for Pusher', async () => {
    const driver = new PusherRealtimeDriver()

    await expect(Broadcast.handleAuth({ id: 1 }, { channel_name: 'user.1' }, { driver })).rejects.toThrow(/socket_id/)
  })

  it('signs an authorized Pusher channel', async () => {
    const driver = new PusherRealtimeDriver()
    const auth = vi.spyOn(driver, 'auth').mockResolvedValue({ auth: 'key:sig' })

    await expect(
      Broadcast.handleAuth({ id: 1 }, { channel_name: 'user.1', socket_id: '1.1' }, { driver }),
    ).resolves.toEqual({ auth: 'key:sig' })
    expect(auth).toHaveBeenCalledWith('1.1', 'user.1')
  })

  it('grants Firebase database channels to the subject uid', async () => {
    const driver = new FirebaseDatabaseRealtimeDriver()
    const auth = vi.spyOn(driver, 'auth').mockResolvedValue({ token: 't', expires_at: 1 })

    await Broadcast.handleAuth({ id: 9 }, { channel_name: 'user.9' }, { driver })
    await Broadcast.handleAuth({ id: 9 }, { channel_name: 'user.9' }, { driver, uid: 'custom' })

    expect(auth.mock.calls).toEqual([
      ['9', 'user.9'],
      ['custom', 'user.9'],
    ])
  })
})

describe('device push', () => {
  const user = { id: 7, pushTokens: [{ token: 'a' }, 'b'] } as never

  const pushDriver = () => {
    const driver = new FirebaseRealtimeDriver()
    const broadcast = vi.spyOn(driver, 'broadcast').mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      invalidTokens: ['b'],
    })
    vi.spyOn(Broadcast, 'pushDriver').mockReturnValue(driver)

    return broadcast
  }

  it('streams to the user channel and pushes to their devices', async () => {
    withSettings({ transport: 'memory', push: 'firebase' })
    const broadcast = pushDriver()

    const result = await Notification.realtime().recipient(user).send('Hello', 'Hi')

    expect(MemoryRealtimeDriver.broadcasts()[0].channel).toBe('user.7')
    expect(broadcast).toHaveBeenCalledWith(['a', 'b'], 'notification', expect.objectContaining({ title: 'Hi' }), {})
    expect(result.push).toEqual({
      successCount: 1,
      failureCount: 1,
      invalidTokens: ['b'],
    })
  })

  it('skips the push when asked', async () => {
    withSettings({ transport: 'memory', push: 'firebase' })
    const broadcast = pushDriver()

    const result = await Notification.realtime().recipient(user).push(false).send('Hello')

    expect(broadcast).not.toHaveBeenCalled()
    expect(result.push).toBeUndefined()
  })

  it("pushes to explicit devices instead of the user's own", async () => {
    withSettings({ transport: 'memory', push: 'firebase' })
    const broadcast = pushDriver()

    await Notification.realtime().recipient(user).devices(['z']).send('Hello')

    expect(broadcast.mock.calls[0][0]).toEqual(['z'])
  })

  it('resolves tokens through the configured resolver', async () => {
    withSettings({ push_tokens: async () => ['x', { token: 'y' }] })

    await expect(Broadcast.pushTokens({ id: 1 })).resolves.toEqual(['x', 'y'])
  })

  it('keeps pushing to devices on the firebase transport when push is unset', () => {
    withSettings({ transport: 'firebase' })

    expect(Broadcast.pushDriver()).toBeInstanceOf(FirebaseRealtimeDriver)
  })

  it('lets push: false turn device push off on the firebase transport', () => {
    withSettings({ transport: 'firebase', push: false })

    expect(Broadcast.pushDriver()).toBeNull()
  })

  it('does nothing when push is off', async () => {
    withSettings({ transport: 'memory' })

    expect(Broadcast.pushDriver()).toBeNull()
    await expect(Broadcast.push(['a'], 'e', {})).resolves.toBeNull()
  })

  it('chains broadcast() on a database notification', async () => {
    withSettings({ transport: 'memory' })
    vi.spyOn(UserNotificationCenter, 'create').mockResolvedValue({
      id: 5,
      readAt: null,
      createdAt: new Date(),
    } as never)

    await Notification.db()
      .broadcast()
      .recipient({ id: 2 } as never)
      .send('D', 'T')

    expect(MemoryRealtimeDriver.broadcasts()[0]).toMatchObject({
      channel: 'user.2',
      payload: { title: 'T' },
    })
  })

  it('still broadcasts a stored notification to a user with no devices', async () => {
    withSettings({ transport: 'memory' })
    vi.spyOn(UserNotificationCenter, 'create').mockResolvedValue({
      id: 3,
      readAt: null,
      createdAt: new Date(),
    } as never)

    await UserNotificationCenter.send({ id: 4 } as never, {
      title: 'T',
      description: 'D',
    })

    expect(MemoryRealtimeDriver.broadcasts()[0]).toMatchObject({
      channel: 'user.4',
      payload: { id: '3' },
    })
  })
})

describe('FirebaseDatabaseRealtimeDriver', () => {
  const fakeServices = () => {
    let next = 0
    const updates: Array<Record<string, unknown>> = []
    const indexed: Array<{ key: string; val: unknown }> = []
    const query = {
      endAt: vi.fn(() => query),
      limitToFirst: vi.fn(() => query),
      once: vi.fn(async () => ({
        forEach: (cb: (child: { key: string; val(): unknown }) => void) => {
          indexed.forEach((entry) => cb({ key: entry.key, val: () => entry.val }))

          return false
        },
      })),
    }
    const database = {
      ref: vi.fn(() => ({
        push: () => ({ key: `k${++next}` }),
        update: vi.fn(async (values: Record<string, unknown>) => {
          updates.push(values)
        }),
        orderByChild: vi.fn(() => query),
      })),
    }
    const auth = {
      createCustomToken: vi.fn(async (uid: string) => `token-for-${uid}`),
    }

    return { database, auth, updates, indexed, query }
  }

  const withServices = (services: ReturnType<typeof fakeServices>, options = {}) => {
    const driver = new FirebaseDatabaseRealtimeDriver(options)
    ;(driver as any).servicesPromise = Promise.resolve(services)

    return driver
  }

  it('encodes channel names into single database keys', () => {
    expect(firebaseChannelKey('private-user.7')).toBe('private-user%2E7')
    expect(firebaseChannelKey('a/b#c$d[e]')).toBe('a%2Fb%23c%24d%5Be%5D')
  })

  it('writes each channel event and its index entry in one update', async () => {
    const services = fakeServices()
    const driver = withServices(services)

    await driver.broadcast(['user.1', 'user.2'], 'notification', { id: 'n' })

    expect(services.updates).toHaveLength(1)
    expect(services.updates[0]).toEqual({
      'arkstack/channels/user%2E1/k1': {
        event: 'notification',
        payload: { id: 'n' },
        at: { '.sv': 'timestamp' },
      },
      'arkstack/channels-index/k1': {
        channel: 'user%2E1',
        at: { '.sv': 'timestamp' },
      },
      'arkstack/channels/user%2E2/k2': {
        event: 'notification',
        payload: { id: 'n' },
        at: { '.sv': 'timestamp' },
      },
      'arkstack/channels-index/k2': {
        channel: 'user%2E2',
        at: { '.sv': 'timestamp' },
      },
    })
  })

  it('grants the channel until the TTL ends and mints a token', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const services = fakeServices()
    const driver = withServices(services, { grant_ttl: 60 })

    await expect(driver.auth('u-1', 'user.1')).resolves.toEqual({
      token: 'token-for-u-1',
      expires_at: 61_000,
    })
    expect(services.updates[0]).toEqual({
      'arkstack/grants/u-1/user%2E1': 61_000,
    })
  })

  it('rejects a uid that cannot be a database key', async () => {
    const driver = withServices(fakeServices())

    await expect(driver.auth('a.b', 'user.1')).rejects.toThrow(/uid/)
    await expect(driver.auth('', 'user.1')).rejects.toThrow(/uid/)
  })

  it('prunes old events in a bounded batch', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(100_000)
    const services = fakeServices()
    services.indexed.push({ key: 'k1', val: { channel: 'user%2E1' } }, { key: 'k2', val: { channel: 'user%2E2' } })
    const driver = withServices(services)

    await expect(driver.prune(60, 2)).resolves.toBe(2)
    expect(services.query.endAt).toHaveBeenCalledWith(40_000)
    expect(services.query.limitToFirst).toHaveBeenCalledWith(2)
    expect(services.updates[0]).toEqual({
      'arkstack/channels/user%2E1/k1': null,
      'arkstack/channels-index/k1': null,
      'arkstack/channels/user%2E2/k2': null,
      'arkstack/channels-index/k2': null,
    })
  })

  it('skips the write when nothing is old enough to prune', async () => {
    const services = fakeServices()
    const driver = withServices(services)

    await expect(driver.prune(60)).resolves.toBe(0)
    expect(services.updates).toHaveLength(0)
  })

  it('gives clients the database URL and channel root', () => {
    const driver = new FirebaseDatabaseRealtimeDriver({
      database_url: 'https://x.firebaseio.com',
      root: 'rt/channels',
    })

    expect(driver.clientConfig()).toEqual(
      expect.objectContaining({
        databaseURL: 'https://x.firebaseio.com',
        root: 'rt/channels',
      }),
    )
  })
})

describe('UserNotificationCenter queries', () => {
  /** A fake model whose query records each builder call. */
  const fakeModel = () => {
    const calls: Array<[string, unknown[]]> = []
    const query: Record<string, (...args: unknown[]) => unknown> = {}

    for (const method of ['where', 'whereNull', 'whereIn']) {
      query[method] = (...args) => {
        calls.push([method, args])

        return query
      }
    }

    for (const method of ['updateFrom', 'update', 'paginate', 'get']) {
      query[method] = async (...args) => {
        calls.push([method, args])

        return method === 'updateFrom' ? 3 : []
      }
    }

    vi.spyOn(UserNotificationCenter as any, 'getModel').mockResolvedValue({
      query: () => query,
    })

    return calls
  }

  it('marks every unread notification read, not just one', async () => {
    const calls = fakeModel()

    await UserNotificationCenter.markAllRead({ id: 7 } as never)

    expect(calls.map(([method]) => method)).toEqual(['where', 'whereNull', 'updateFrom'])
    expect(calls[1][1]).toEqual(['readAt'])
    expect(calls.some(([method]) => method === 'update')).toBe(false)
  })

  it('limits marking read to the given ids', async () => {
    const calls = fakeModel()

    await UserNotificationCenter.markAllRead({ id: 7 } as never, ['a', 'b'])

    expect(calls).toContainEqual(['whereIn', ['id', ['a', 'b']]])
  })

  it('paginates unread notifications with the requested page size', async () => {
    const calls = fakeModel()

    await UserNotificationCenter.unreadForUser({ id: 7 } as never, 25)

    expect(calls).toContainEqual(['paginate', [25]])
    expect(calls).toContainEqual(['whereNull', ['readAt']])
  })
})
