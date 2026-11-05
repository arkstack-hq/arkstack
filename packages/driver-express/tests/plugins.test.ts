import { ArkstackPlugin, Hook, Plugins } from '@arkstack/foundry'
import { beforeEach, describe, expect, it } from 'vitest'
import express, { type Express } from 'express'

import { ExpressDriver } from '../src/index'
import request from 'parasito'

class HealthPlugin extends ArkstackPlugin {
  readonly name = 'health'
  readonly drivers = ['express']

  hooks() {
    return {
      'driver:prepare': {
        before: ({ app }: { app: unknown }) => {
          ;(app as Express).use((_req, res, next) => {
            res.setHeader('x-health', 'on')
            next()
          })
        },
        router: ({ app }: { app: unknown }) => {
          ;(app as Express).get('/health', (_req, res) => {
            res.json({ ok: true })
          })
        },
      },
    }
  }
}

describe('ExpressDriver plugins', () => {
  beforeEach(() => {
    Plugins.clear()
    Hook.clear()
  })

  it('lets a plugin add middleware and routes while the app is prepared', async () => {
    const driver = new ExpressDriver({
      bindRouter: (app) => {
        app.get('/', (_req, res) => {
          res.send('home')
        })
      },
    })
    const app = express()

    Plugins.use(new HealthPlugin())
    await driver.prepare(app)

    const health = await request(app).get('/health')
    const home = await request(app).get('/')

    expect(health.status).toBe(200)
    expect(health.body).toEqual({ ok: true })
    expect(health.headers.get('x-health')).toBe('on')
    expect(home.text).toBe('home')
  })
})
