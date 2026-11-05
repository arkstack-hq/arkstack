import { Arkstack, DriverPrepareContext, ServerStartInfo, TunneledServerStartInfo } from '.'

declare global {
  function app(): Arkstack<never, never>
  var arkctx: {
    runtime: 'CLI' | 'HTTP' | 'Worker'
    command?: string
  }
}

// `Hook` and its registry live in @arkstack/foundry (@arkstack/common only
// re-exports them), so typed hook names are declared there.
declare module '@arkstack/foundry' {
  interface HookRegistry {
    'set:root-dir': {
      after: (dir: string) => void
    }
    /**
     * Fired by `driver.prepare()` while the runtime app is set up for serving.
     */
    'driver:prepare': {
      /** Before public assets and middleware are applied. */
      before: (context: DriverPrepareContext) => void | Promise<void>
      /** After the app middleware, just before routes are bound. */
      router: (context: DriverPrepareContext) => void | Promise<void>
      /** After routes and the error handler are in place. */
      after: (context: DriverPrepareContext) => void | Promise<void>
    }
    /**
     * Fired by every driver once its server is listening (dev and production),
     * after the startup banner and once any tunnel is open.
     */
    'server:start': {
      after: (info: ServerStartInfo) => void | Promise<void>
      /**
       * Only when the server is reachable through a tunnel; runs after `after`.
       */
      tunneled: (info: TunneledServerStartInfo) => void | Promise<void>
    }
  }
}
