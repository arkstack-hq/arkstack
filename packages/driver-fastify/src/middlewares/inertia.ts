import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Binds the Inertia request context for Fastify. Register it in the `before`
 * middleware position.
 *
 * It runs the rest of the request inside Inertia's async-local context, so
 * `inertia()` and `Inertia.*` resolve the active request, and upgrades `302`
 * redirects to `303 See Other` for `PUT`, `PATCH` and `DELETE` Inertia visits,
 * which the Inertia client needs to follow the redirect with a `GET`.
 *
 * `@arkstack/inertia` is imported dynamically so the package stays optional.
 */
export const inertia = () => {
  return (req: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
    import('@arkstack/inertia')
      .then(({ runInertia, shouldUpgradeRedirect }) => {
        const request = {
          method: String(req.method ?? 'GET').toUpperCase(),
          url: req.url || '/',
          header: (name: string) => {
            const value = req.headers[name.toLowerCase()]

            return Array.isArray(value) ? value[0] : value
          },
        }

        if (request.header('x-inertia') === 'true') {
          const code = reply.code.bind(reply)

          reply.code = reply.status = (statusCode: number) =>
            code(shouldUpgradeRedirect(request.method, statusCode) ? 303 : statusCode)
        }

        runInertia(request, () => done())
      })
      .catch(done)
  }
}

export class InertiaMiddleware {
  handle(req: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) {
    return inertia()(req, reply, done)
  }
}
