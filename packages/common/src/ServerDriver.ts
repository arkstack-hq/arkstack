import { ArkstackKitDriver, type ServerStartInfo } from '@arkstack/contract'
import { env } from './system'

import { Hook } from '@arkstack/foundry'
import { Logger } from './Logger'
import { localNetworkAddress } from './tls'
import ngrok from '@ngrok/ngrok'

/**
 * Where and how a driver should bind its server, read from the environment.
 */
export interface ServerBinding {
  host: string
  port: number
  scheme: ServerStartInfo['scheme']
  secure: boolean
}

/**
 * Base driver for runtimes that listen on a port. It resolves the bind address,
 * opens the dev tunnel, prints the startup lines and runs the `server:start` hook,
 * leaving only the runtime-specific listen call to each driver.
 */
export abstract class ServerDriver<TApp, TMiddleware> extends ArkstackKitDriver<TApp, TMiddleware> {
  protected tunnel_url?: string

  /**
   * If trafic has been proxied via ngrok, this will return the tunnel URL.
   *
   * @returns
   */
  geTunnelUrl(): string | undefined {
    return this.tunnel_url
  }

  /**
   * Resolves the bind address from `APP_HOST` (or `HOST`) and `APP_SECURE`.
   *
   * The host defaults to `0.0.0.0` so the server is reachable on all network
   * interfaces, which platforms like Railway require for their healthcheck.
   *
   * @param port
   * @returns
   */
  protected binding(port: number): ServerBinding {
    const secure = env('APP_SECURE', false) === true

    return {
      host: env('APP_HOST', env('HOST', '0.0.0.0')),
      port,
      scheme: secure ? 'https' : 'http',
      secure,
    }
  }

  /**
   * Announces a server that is now listening: opens or records the tunnel,
   * prints the startup lines and runs the `server:start` hook.
   *
   * @param binding
   */
  protected async announce(binding: ServerBinding): Promise<void> {
    const { host, port, scheme, secure } = binding
    const lines = this.startupLines(binding)
    const tunnelUrl = await this.openTunnel(port)

    if (tunnelUrl) {
      lines.push(
        Logger.log(
          [
            ['Traffic has been tunnelled to', 'white'],
            [tunnelUrl, 'green'],
          ],
          ' ',
          false,
        ),
      )
    }

    console.log(lines.join('\n'))

    await this.emitServerStart({
      host,
      port,
      scheme,
      secure,
      url: `${scheme}://${this.localHost(host)}:${port}`,
      tunnelUrl,
    })
  }

  /**
   * Uses a preset `TUNNEL_URL`, or opens an ngrok tunnel when `TUNNEL` is set.
   *
   * @param port
   * @returns The public tunnel URL, if any.
   */
  protected async openTunnel(port: number): Promise<string | undefined> {
    let url: string | undefined = env('TUNNEL_URL') || undefined

    if (!url && env('TUNNEL', false) === true) {
      url = await this.forward(port)

      if (url) process.env.TUNNEL_URL = url
    }

    if (url) {
      const tunnelUrl = url

      this.tunnel_url = tunnelUrl
      globalThis.tunnelUrl = () => tunnelUrl
    }

    return url
  }

  /**
   * Opens an ngrok tunnel to the given port.
   *
   * @param port
   * @returns The public tunnel URL, if ngrok returned one.
   */
  protected async forward(port: number): Promise<string | undefined> {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: env('NGROK_AUTHTOKEN'),
      domain: env('NGROK_DOMAIN'),
    })

    return listener.url() || undefined
  }

  /**
   * Builds the "Server is running" lines, adding a local-network URL when the
   * server is bound to all interfaces so other devices can reach it.
   *
   * @param binding
   * @returns
   */
  protected startupLines({ host, port, scheme }: ServerBinding): string[] {
    const lines = [
      Logger.log(
        [
          ['Server is running on', 'white'],
          [`${scheme}://${this.localHost(host)}:${port}`, 'cyan'],
        ],
        ' ',
        false,
      ),
    ]

    const address = this.bindsAll(host) ? localNetworkAddress() : undefined

    if (address) {
      lines.push(
        Logger.log(
          [
            ['Network access via', 'white'],
            [`${scheme}://${address}:${port}`, 'cyan'],
          ],
          ' ',
          false,
        ),
      )
    }

    return lines
  }

  /**
   * Runs the `server:start` hook: `after` always, then `tunneled` when a tunnel
   * is open. A failing listener is logged, never thrown, so it cannot take down
   * a running server or skip the next position.
   *
   * @param info
   */
  protected async emitServerStart(info: ServerStartInfo): Promise<void> {
    await this.emitPosition('after', () => Hook.emit('server:start', 'after', info))

    const { tunnelUrl } = info

    if (tunnelUrl) {
      await this.emitPosition('tunneled', () => Hook.emit('server:start', 'tunneled', { ...info, tunnelUrl }))
    }
  }

  private async emitPosition(position: string, run: () => unknown): Promise<void> {
    try {
      await run()
    } catch (error) {
      Logger.error(
        `server:start ${position} hook failed: ${error instanceof Error ? error.message : String(error)}`,
        false,
      )
    }
  }

  private bindsAll(host: string): boolean {
    return host === '0.0.0.0' || host === '::'
  }

  private localHost(host: string): string {
    return this.bindsAll(host) ? 'localhost' : host
  }
}
