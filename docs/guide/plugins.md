# Plugins

A plugin is a package, or a module in your app, that extends Arkstack without editing the app's core files. It can:

- hook into the driver while the app is set up, to add runtime middleware, routes or framework plugins
- listen to any other hook, such as `server:start` or `shutdown`
- add commands to `ark`
- say which drivers it works with

Plugins are built on the [hook registry](./hooks). A plugin's hooks are added with `Hook.listen()`, so they run next to your app's own `Hook.on()` callbacks and next to other plugins, instead of replacing them.

## Write a Plugin

Extend `ArkstackPlugin` from `@arkstack/foundry` (also exported by `@arkstack/common`). Only `name` is required.

```ts
import { ArkstackPlugin, type HookMap } from '@arkstack/foundry'
import type { Express } from 'express'
import { HealthCommand } from './HealthCommand'

export class HealthPlugin extends ArkstackPlugin {
  readonly name = 'health'
  readonly drivers = ['express']

  hooks(): HookMap {
    return {
      'driver:prepare': {
        router: ({ app }) => {
          ;(app as Express).get('/health', (_req, res) => {
            res.json({ ok: true })
          })
        },
      },
      'server:start': {
        after: ({ url }) => console.log(`health check at ${url}/health`),
      },
    }
  }

  commands() {
    return [HealthCommand]
  }

  register() {
    // Runs once, when the plugin is installed
  }
}
```

| Member       | Purpose                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `name`       | Unique name. Installing a second plugin with the same name does nothing.                      |
| `drivers`    | Driver names the plugin works with (`express`, `h3`, `fastify`). Empty means every driver.    |
| `hooks()`    | Hook listeners keyed by hook name. Annotate it as `HookMap` to type them from `HookRegistry`. |
| `commands()` | Musket command classes added to `ark`.                                                        |
| `register()` | Runs once at install time, for setup such as `Publisher.publishes()` or `Validator.use()`.    |

## Install a Plugin

Install plugins in `src/core/bootstrap.ts`, so both the HTTP server and the console see them:

```ts
import { HealthPlugin } from 'src/plugins/HealthPlugin'

export const app = new Application(expressApp).use(new HealthPlugin())
```

`app.use()` forwards to the `Plugins` registry, which you can also use directly:

```ts
import { Plugins } from '@arkstack/foundry'

Plugins.use(new HealthPlugin(), new AuditPlugin())

Plugins.has('health') // true
Plugins.get<HealthPlugin>('health')
Plugins.all()
Plugins.remove('health') // uninstalls it and removes its hook listeners
```

## Driver Integration

`driver.prepare()` sets the runtime app up for serving. It runs the `driver:prepare` hook between its steps:

| Position | Runs                                                   | Use it to                                        |
| -------- | ------------------------------------------------------ | ------------------------------------------------ |
| `before` | before public assets and the app middleware            | add early middleware or register runtime plugins |
| `router` | after the app middleware, just before routes are bound | add routes that need the app middleware          |
| `after`  | after routes and the error handler                     | inspect or finish the configured app             |

Each position receives `{ app, driver }`. `app` is the runtime app (an Express app, an H3 app or a Fastify instance), and `driver.name` tells you which one. Cast `app` to the runtime type your plugin supports, and list that runtime in `drivers`.

Before any step runs, `prepare()` checks every installed plugin against the current driver and throws if one does not support it. That way an Express-only plugin fails at boot on an H3 app, not on the first request.

On Fastify, register Fastify plugins (`app.register(...)`) in the `before` position. Fastify fixes a route's hooks when the route is built, so plugins registered after routes do not apply to them.

The templates call `prepare()` from `Application.boot()`:

```ts
public async boot(port: number, defer = false) {
  // Load public assets, middleware, routes and the error handler
  await this.driver.prepare(this.app, {
    publicPath: path.join(Arkstack.rootDir(), 'public'),
    middleware: config('middleware') as never,
  })

  // Start the server
  if (defer !== true) {
    await this.driver.start(this.app, port)
  }
}
```

If your `src/core/app.ts` still calls `mountPublicAssets`, `applyMiddleware`, `bindRouter` and `registerErrorHandler` one by one, replace those four calls with `prepare()` as above. Until then, plugin commands and other hooks work, but the `driver:prepare` hook never fires.

## Console Integration

`ark` loads `src/core/bootstrap.ts` before it registers commands, so the commands of every installed plugin are available next to the built-in ones:

```ts
import { Command } from '@h3ravel/musket'

export class HealthCommand extends Command {
  protected signature = 'health:check'
  protected description = 'Check that the app answers on /health'

  async handle() {
    // ...
  }
}
```

A plugin package that publishes config or stubs can register them in `register()` with `Publisher.publishes()`, and users copy them with `ark publish --package <name>`.
