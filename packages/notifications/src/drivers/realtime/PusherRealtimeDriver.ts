import type { PusherTransportConfig, RealtimeBroadcastPayload, RealtimeDeliveryOptions } from '../../types'
import { RequestException, env } from '@arkstack/common'

import { Broadcast } from '../../Broadcast'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'

/** The slice of the `pusher` server SDK this driver uses. */
interface PusherClient {
  trigger(channel: string | string[], event: string, data: unknown): Promise<unknown>
  authorizeChannel(
    socketId: string,
    channel: string,
    data?: {
      user_id: string
      user_info?: {
        [key: string]: any
      }
    },
  ): {
    auth: string
    channel_data?: string
    shared_secret?: string
  }
}

type PusherConstructor = new (options: {
  appId: string
  key: string
  secret: string
  cluster: string
  useTLS?: boolean
  host?: string
  port?: string
}) => PusherClient

/**
 * Broadcasts notifications over [Pusher Channels](https://pusher.com/channels).
 *
 * The `pusher` server SDK is an optional peer dependency, imported lazily so the
 * package installs without it; it is only required when this transport is used.
 */
export class PusherRealtimeDriver implements RealtimeDriver {
  private clientPromise?: Promise<PusherClient>

  constructor(private options: PusherTransportConfig = {}) {}

  private client(): Promise<PusherClient> {
    const specifier = 'pusher'
    this.clientPromise ??= (async () => {
      const mod = await import(specifier).catch(() => {
        throw new Error(
          'The "pusher" package is required for the Pusher realtime transport. Install it with `npm i pusher`.',
        )
      })

      const Pusher = (mod.default ?? mod) as PusherConstructor

      const { host, port } = this.server()

      return new Pusher({
        appId: this.options.app_id ?? env('PUSHER_APP_ID', ''),
        key: this.key(),
        secret: this.options.secret ?? env('PUSHER_SECRET', ''),
        cluster: this.cluster(),
        useTLS: this.useTLS(),
        ...(host ? { host, port: port ? String(port) : undefined } : {}),
      })
    })()

    return this.clientPromise
  }

  private key(): string {
    return this.options.key ?? env('PUSHER_KEY', '')
  }

  private cluster(): string {
    return this.options.cluster ?? env('PUSHER_CLUSTER', 'mt1')
  }

  private useTLS(): boolean {
    return this.options.use_tls ?? true
  }

  private server(): { host?: string; port?: number } {
    const host = this.options.host ?? (env('PUSHER_HOST', '') || undefined)
    const port = this.options.port ?? (Number(env('PUSHER_PORT', 0)) || undefined)

    return { host, port }
  }

  /**
   * The server address and TLS browsers connect with. Defaults to the address
   * the server uses, which differs when it reaches the server over a private
   * network (e.g. `soketi` inside Docker).
   *
   * @returns
   */
  private publicServer(): { host?: string; port?: number; useTLS: boolean } {
    const server = this.server()
    const host = this.options.public_host ?? (env('PUSHER_PUBLIC_HOST', '') || server.host)
    const port = this.options.public_port ?? (Number(env('PUSHER_PUBLIC_PORT', 0)) || server.port)
    const tls = env('PUSHER_PUBLIC_USE_TLS', '')
    const useTLS = this.options.public_use_tls ?? (tls === '' ? this.useTLS() : String(tls) === 'true')

    return { host, port, useTLS }
  }

  /**
   * Public settings a `pusher-js` client needs, including the self-hosted
   * server address when one is set.
   *
   * @returns
   */
  clientConfig(): Record<string, unknown> {
    const { host, port, useTLS } = this.publicServer()

    return {
      key: this.key(),
      cluster: this.cluster(),
      forceTLS: useTLS,
      ...(host ? { wsHost: host, wsPort: port, wssPort: port } : {}),
    }
  }

  /**
   * `delivery` is accepted for contract parity and ignored: Pusher pushes over a
   * connection the client already holds open, so there is no dozing radio to
   * wake and no per-message priority, TTL or collapse key to set.
   *
   * @param channel
   * @param event
   * @param payload
   * @param _delivery
   * @returns
   */
  async broadcast(
    channel: string | string[],
    event: string,
    payload: RealtimeBroadcastPayload,
    _delivery?: RealtimeDeliveryOptions,
  ) {
    const client = await this.client()

    // Pusher's `trigger` fans out to multiple channels when given an array.
    return await client.trigger(channel, event, payload)
  }

  /**
   * Authourize a pusher channel
   *
   * @param socketId
   * @param channel
   * @returns
   */
  async auth(
    socketId: string,
    channel: string,
    data?: Parameters<PusherClient['authorizeChannel']>[2],
  ): Promise<ReturnType<PusherClient['authorizeChannel']>> {
    const client = await this.client()

    return client.authorizeChannel(socketId, channel, data)
  }

  /**
   * Register a realtime autorization route
   *
   * @param authEndpoint
   * @param middleware
   * @param config
   * @param channelPrefix
   */
  static async registerAuthRoute(
    authEndpoint: string = '/realtime/auth',
    middleware?: unknown | unknown[],
    channelPrefix?: string,
    config: PusherTransportConfig = {},
  ): Promise<void> {
    return new PusherRealtimeDriver(config).registerAuthRoute(authEndpoint, middleware, channelPrefix)
  }

  /**
   * Register a realtime autorization route
   *
   * @param authEndpoint
   * @param middleware
   * @param channelPrefix
   */
  async registerAuthRoute(
    authEndpoint: string = '/realtime/auth',
    middleware?: unknown | unknown[],
    channelPrefix?: string,
  ): Promise<void> {
    const drivers = ['@arkstack/driver-express', '@arkstack/driver-h3']

    for (const path of drivers) {
      try {
        const { Router } = await import(path)
        const { auth } = await import(`${path}/middlewares`)

        Router.post(authEndpoint, async ({ clearRequest, req }: any) => {
          const user = req?.user ?? clearRequest.user
          const channel = clearRequest.input('channel_name')
          const socketId = clearRequest.input('socket_id')

          // An explicit channel limits access to exactly that channel.
          const allowed = channelPrefix ? channel === channelPrefix : await Broadcast.authorize(user, channel)

          RequestException.abortIf(!allowed, 'Channel access denied', 403)

          // pusher-js only accepts a 200 from the authorizer.
          return new Response(JSON.stringify(await this.auth(socketId, channel)), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }).middleware([middleware ?? []].flat().concat(auth))

        return
      } catch (e) {
        console.error(`Failed to register auth route for ${path}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }
}
