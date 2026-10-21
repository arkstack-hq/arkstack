import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'parasito'

import { ExpressDriver } from '../src/index'

describe('ExpressDriver after middleware', () => {
  it('runs once the response finishes without re-entering the router', async () => {
    const app = express()
    const handler = vi.fn((_req: express.Request, res: express.Response) => {
      res.json({ ok: true })
    })
    const fallthrough = vi.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next())
    let finished!: () => void
    const done = new Promise<void>((resolve) => (finished = resolve))
    const after = vi.fn((_req: unknown, _res: unknown, next: () => void) => {
      next()
      finished()
    })

    new ExpressDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      after: [after],
    } as never)
    app.get('/thing', handler)
    app.use(fallthrough)

    const res = await request(app).get('/thing')
    await done

    expect(res.status).toBe(200)
    expect(after).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledOnce()
    expect(fallthrough).not.toHaveBeenCalled()
  })

  it('logs a failing after middleware without exiting the process', async () => {
    const app = express()
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    let failed!: () => void
    const done = new Promise<void>((resolve) => (failed = resolve))
    const after = vi.fn(async () => {
      setTimeout(failed, 0)
      throw new Error('after blew up')
    })

    new ExpressDriver({ bindRouter: vi.fn() }).applyMiddleware(app, {
      after: [after],
    } as never)
    app.get('/thing', (_req, res) => res.json({ ok: true }))

    const res = await request(app).get('/thing')
    await done

    expect(res.status).toBe(200)
    expect(errors.mock.calls.flat().join(' ')).toContain('after blew up')
    expect(exit).not.toHaveBeenCalled()

    exit.mockRestore()
    errors.mockRestore()
  })
})
