import type {
  ChannelAuthRequest,
  ChannelAuthorizer,
  PushResult,
  PushTokenLike,
  RealtimeBroadcastPayload,
  RealtimeClientConfig,
  RealtimeDeliveryOptions,
  RealtimeDriverName,
  RealtimeDriverOptions,
} from './types'

import { FirebaseDatabaseRealtimeDriver } from './drivers/realtime/FirebaseDatabaseRealtimeDriver'
import { FirebaseRealtimeDriver } from './drivers/realtime/FirebaseRealtimeDriver'
import { MemoryRealtimeDriver } from './drivers/realtime/MemoryRealtimeDriver'
import { PollingRealtimeDriver } from './drivers/realtime/PollingRealtimeDriver'
import { PusherRealtimeDriver } from './drivers/realtime/PusherRealtimeDriver'
import type { RealtimeDriver } from './Contracts/RealtimeDriver'
import { RequestException } from '@arkstack/common'
import { configure } from './config'

type RealtimeSettings = {
  transport?: RealtimeDriverName
  push?: 'firebase' | false
  push_tokens?: (user: any) => PushTokenLike[] | Promise<PushTokenLike[]>
  channel_prefix?: string
  event?: string
  driverFactory?: () => RealtimeDriver
}

type ChannelRule = {
  pattern: string
  regex: RegExp
  keys: string[]
  authorizer: ChannelAuthorizer
}

export type BroadcastRouteOptions = {
  /** Route prefix (default `/realtime`). */
  prefix?: string
  /** Extra middleware run before the framework `auth` middleware. */
  middleware?: unknown | unknown[]
}

/**
 * The server side of realtime: builds transports from config, broadcasts
 * arbitrary events, and authorizes channel subscriptions against registered
 * channel rules for every transport.
 */
export class Broadcast {
  private static rules: ChannelRule[] = []

  private static settings(): RealtimeSettings {
    return (configure('drivers.realtime', {}) ?? {}) as RealtimeSettings
  }

  /**
   * The configured streaming transport name.
   *
   * @returns
   */
  static transport(): RealtimeDriverName {
    return this.settings().transport ?? 'pusher'
  }

  /**
   * The prefix of the per-user notification channel.
   *
   * @returns
   */
  static channelPrefix(): string {
    return this.settings().channel_prefix ?? 'user.'
  }

  /**
   * Register who may subscribe to channels matching `pattern`. `{name}`
   * placeholders match one dot-free segment and are passed to the authorizer.
   * A later registration of the same pattern replaces the earlier one.
   *
   * @param pattern  e.g. `private-team.{teamId}`
   * @param authorizer
   * @returns
   */
  static channel<Subject = any>(pattern: string, authorizer: ChannelAuthorizer<Subject>): typeof Broadcast {
    const keys: string[] = []
    const source = pattern
      .split(/(\{[^}]+\})/)
      .map((part) => {
        const key = /^\{([^}]+)\}$/.exec(part)?.[1]

        if (key) {
          keys.push(key)

          return '([^.]+)'
        }

        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      })
      .join('')

    this.rules = this.rules.filter((rule) => rule.pattern !== pattern)
    this.rules.push({
      pattern,
      regex: new RegExp(`^${source}$`),
      keys,
      authorizer,
    })

    return this
  }

  /**
   * Remove every registered channel rule.
   */
  static forgetChannels(): void {
    this.rules = []
  }

  /**
   * Whether `subject` may subscribe to `channel`. The first matching rule
   * decides. The per-user notification channel is allowed for its own user
   * unless a rule overrides it. Unmatched channels are denied.
   *
   * @param subject
   * @param channel
   * @returns
   */
  static async authorize(subject: unknown, channel: string): Promise<boolean> {
    for (const rule of this.rules) {
      const match = rule.regex.exec(channel)

      if (match) {
        const params = Object.fromEntries(rule.keys.map((key, index) => [key, match[index + 1]]))

        return Boolean(await rule.authorizer(subject, params))
      }
    }

    const id = (subject as { id?: unknown } | null)?.id

    return id !== undefined && id !== null && channel === `${this.channelPrefix()}${id}`
  }

  /**
   * Build a transport. Uses the configured `driverFactory` when there is one,
   * otherwise the named or configured built-in.
   *
   * @param options
   * @returns
   */
  static driver(options: RealtimeDriverOptions = {}): RealtimeDriver {
    const factory = options.driverFactory ?? this.settings().driverFactory

    if (factory) {
      return factory()
    }

    const transport = options.transport ?? this.transport()

    return this.make(transport, (options as Record<string, unknown>)[transport] as Record<string, unknown>)
  }

  /**
   * Build a named built-in transport from its `transports.*` config.
   *
   * @param transport
   * @param overrides
   * @returns
   */
  static make(transport: RealtimeDriverName, overrides: Record<string, unknown> = {}): RealtimeDriver {
    const config = {
      ...(configure(`transports.${transport}` as never, {}) as Record<string, unknown>),
      ...overrides,
    }

    switch (transport) {
      case 'firebase':
        return new FirebaseRealtimeDriver(config)
      case 'firebase-database':
        return new FirebaseDatabaseRealtimeDriver(config)
      case 'polling':
        return new PollingRealtimeDriver(config)
      case 'memory':
        return new MemoryRealtimeDriver()
      case 'pusher':
        return new PusherRealtimeDriver(config)
      default:
        throw new Error(`Realtime: unknown transport "${transport}"`)
    }
  }

  /**
   * Broadcast an arbitrary event on one or more channels over the configured
   * transport.
   *
   * @param channel
   * @param event
   * @param payload
   * @param delivery
   * @returns
   */
  static async broadcast(
    channel: string | string[],
    event: string,
    payload: RealtimeBroadcastPayload,
    delivery?: RealtimeDeliveryOptions,
  ): Promise<unknown> {
    if (Array.isArray(channel) && channel.length === 0) {
      return
    }

    return await this.driver().broadcast(channel, event, payload, delivery)
  }

  /**
   * The device push transport, or null when push is off. When `push` is unset,
   * apps streaming over `firebase` keep pushing to devices as they always have.
   *
   * @returns
   */
  static pushDriver(): FirebaseRealtimeDriver | null {
    const { push } = this.settings()
    const enabled = push === 'firebase' || (push === undefined && this.transport() === 'firebase')

    return enabled ? (this.make('firebase') as FirebaseRealtimeDriver) : null
  }

  /**
   * A user's device tokens, from the configured `push_tokens` resolver or the
   * user's `pushTokens` property.
   *
   * @param user
   * @returns
   */
  static async pushTokens(user: unknown): Promise<string[]> {
    const resolver = this.settings().push_tokens
    const tokens = resolver
      ? await resolver(user)
      : (user as { pushTokens?: PushTokenLike | PushTokenLike[] } | null)?.pushTokens

    if (!tokens) return []

    return (Array.isArray(tokens) ? tokens : [tokens])
      .map((token) => (typeof token === 'string' ? token : token?.token))
      .filter((token): token is string => !!token)
  }

  /**
   * Push an event to device tokens over the push transport. Returns null when
   * push is off or there are no tokens.
   *
   * @param tokens
   * @param event
   * @param payload
   * @param delivery
   * @returns
   */
  static async push(
    tokens: string[],
    event: string,
    payload: RealtimeBroadcastPayload,
    delivery?: RealtimeDeliveryOptions,
  ): Promise<PushResult | null> {
    const driver = this.pushDriver()

    if (!driver || tokens.length === 0) {
      return null
    }

    return (await driver.broadcast(tokens, event, payload, delivery)) as PushResult
  }

  /**
   * Authorize `subject` for the requested channel and return what the active
   * transport needs: a Pusher signature, a Firebase custom token, or nothing.
   *
   * @param subject  Usually the authenticated user.
   * @param request  The client's `socket_id` and `channel_name`.
   * @param options  `uid` overrides the Firebase uid (defaults to `subject.id`).
   * @returns
   */
  static async handleAuth(
    subject: unknown,
    request: ChannelAuthRequest,
    options: { uid?: string; driver?: RealtimeDriver } = {},
  ): Promise<unknown> {
    const channel = request.channel_name

    RequestException.abortIf(!channel, 'Missing channel_name', 422)
    RequestException.abortIf(!(await this.authorize(subject, channel!)), 'Channel access denied', 403)

    const driver = options.driver ?? this.driver()

    if (driver instanceof FirebaseDatabaseRealtimeDriver) {
      return await driver.auth(options.uid ?? String((subject as { id?: unknown })?.id ?? ''), channel!)
    }

    RequestException.abortIf(driver instanceof PusherRealtimeDriver && !request.socket_id, 'Missing socket_id', 422)

    return await driver.auth(request.socket_id ?? '', channel!)
  }

  /**
   * Public settings a `@arkstack/realtime` client is created from.
   *
   * @returns
   */
  static clientConfig(): RealtimeClientConfig {
    const transport = this.transport()
    const settings = this.settings()
    const config: RealtimeClientConfig = {
      transport,
      event: settings.event ?? 'notification',
      channelPrefix: this.channelPrefix(),
    }

    config[transport] = this.driver().clientConfig?.() ?? {}

    if (settings.push === 'firebase' && transport !== 'firebase') {
      config.firebase = this.make('firebase').clientConfig?.() ?? {}
    }

    return config
  }

  /**
   * Register `POST {prefix}/auth` and `GET {prefix}/config`, both behind the
   * framework `auth` middleware.
   *
   * @param options
   */
  static async routes(options: BroadcastRouteOptions = {}): Promise<void> {
    const prefix = options.prefix ?? '/realtime'
    const drivers = ['@arkstack/driver-express', '@arkstack/driver-h3']

    for (const path of drivers) {
      try {
        const { Router } = await import(path)
        const { auth } = await import(`${path}/middlewares`)
        const middleware = [options.middleware ?? []].flat().concat(auth)

        Router.post(`${prefix}/auth`, async ({ clearRequest, req }: any) => {
          const result = await this.handleAuth(req?.user ?? clearRequest.user, {
            socket_id: clearRequest.input('socket_id'),
            channel_name: clearRequest.input('channel_name'),
          })

          // pusher-js only accepts a 200 from the authorizer.
          return new Response(JSON.stringify(result ?? {}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }).middleware(middleware)

        Router.get(`${prefix}/config`, () => this.clientConfig()).middleware(middleware)

        return
      } catch {
        continue
      }
    }

    throw new Error('Realtime: no supported HTTP driver is installed to register routes on')
  }
}
