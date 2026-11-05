import { ArkstackPlugin, Hook, HookMap, Plugins } from '@arkstack/foundry'
import { beforeEach, describe, expect, it } from 'vitest'

import { ArkstackKitDriver } from '../src/kits'

class RecordingDriver extends ArkstackKitDriver<string[], string> {
  readonly name = 'recording'

  createApp() {
    return []
  }

  mountPublicAssets(app: string[], publicPath: string) {
    app.push(`assets:${publicPath}`)
  }

  bindRouter(app: string[]) {
    app.push('router')
  }

  applyMiddleware(app: string[], _middleware: unknown) {
    app.push('middleware')
  }

  registerErrorHandler(app: string[]) {
    app.push('errors')
  }

  start() {}
}

class StepPlugin extends ArkstackPlugin {
  readonly name = 'steps'

  hooks(): HookMap {
    return {
      'driver:prepare': {
        before: ({ app }) => void (app as string[]).push('plugin:before'),
        router: ({ app }) => void (app as string[]).push('plugin:router'),
        after: ({ app }) => void (app as string[]).push('plugin:after'),
      },
    }
  }
}

class OtherDriverPlugin extends ArkstackPlugin {
  readonly name = 'other-driver'
  readonly drivers = ['fastify']
}

describe('ArkstackKitDriver.prepare', () => {
  beforeEach(() => {
    Plugins.clear()
    Hook.clear()
  })

  it('sets the app up in order and runs plugin hooks between the steps', async () => {
    const driver = new RecordingDriver()
    const app = driver.createApp()

    Plugins.use(new StepPlugin())
    await driver.prepare(app, { publicPath: 'public', middleware: 'cors' })

    expect(app).toEqual([
      'plugin:before',
      'assets:public',
      'middleware',
      'plugin:router',
      'router',
      'errors',
      'plugin:after',
    ])
  })

  it('skips assets and middleware that are not given', async () => {
    const driver = new RecordingDriver()
    const app = driver.createApp()

    await driver.prepare(app)

    expect(app).toEqual(['router', 'errors'])
  })

  it('refuses to prepare when a plugin does not support the driver', async () => {
    const driver = new RecordingDriver()

    Plugins.use(new OtherDriverPlugin())

    await expect(driver.prepare(driver.createApp())).rejects.toThrow('"recording" driver')
  })
})
