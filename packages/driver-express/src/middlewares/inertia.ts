import type { Handler, NextFunction, Request, Response } from 'express'

/**
 * Bind the Inertia request context for Express.
 *
 * Normalizes the Express request into the adapter's driver-agnostic shape and
 * runs the downstream handler inside Inertia's async-local context (mirroring the
 * `resora` middleware), so `inertia()` / `Inertia.*` resolve the active request.
 *
 * It also upgrades `302` redirects to `303 See Other` for `PUT`/`PATCH`/`DELETE`
 * Inertia visits, which the Inertia client requires to follow the redirect with
 * a `GET`.
 *
 * `@arkstack/inertia` is imported dynamically so the package stays optional.
 */
export const inertia = (): Handler => {
    return async (req, res, next) => {
        try {
            const { runInertia, shouldUpgradeRedirect } = await import('@arkstack/inertia')

            const request = {
                method: String(req.method ?? 'GET').toUpperCase(),
                url: req.originalUrl || req.url || '/',
                header: (name: string) => {
                    const value = req.headers[name.toLowerCase()]

                    return Array.isArray(value) ? value[0] : value
                },
            }

            if (request.header('x-inertia') === 'true') {
                const original = res.redirect.bind(res)

                // express: redirect(url) | redirect(status, url)
                res.redirect = ((...args: unknown[]) => {
                    let status = typeof args[0] === 'number' ? args[0] : 302
                    const url = (typeof args[0] === 'number' ? args[1] : args[0]) as string

                    if (shouldUpgradeRedirect(request.method, status)) {
                        status = 303
                    }

                    return original(status, url)
                }) as Response['redirect']
            }

            runInertia(request, () => next())
        } catch (error) {
            next(error as Error)
        }
    }
}

export class InertiaMiddleware {
    handler (req: Request, res: Response, next: NextFunction) {
        return inertia()(req, res, next)
    }
}
