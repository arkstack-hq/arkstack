import { describe, expect, it, vi } from 'vitest'
import { H3 } from 'h3'

import { H3Driver } from '../src/index'

describe('H3Driver after middleware', () => {
  it('runs after the handler, which runs once, and keeps its response', async () => {
    const app = new H3()
    const handler = vi.fn(() => ({ ok: true }))
    const after = vi.fn((_event: unknown, next: () => unknown) => next())

    new H3Driver({ bindRouter: vi.fn() } as never).applyMiddleware(app, {
      after: [after],
    } as never)
    app.get('/thing', handler)

    const res = await app.fetch(new Request('http://localhost/thing'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(handler).toHaveBeenCalledOnce()
    expect(after).toHaveBeenCalledOnce()
  })
})
