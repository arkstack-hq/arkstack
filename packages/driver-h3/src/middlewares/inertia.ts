import type { H3Event } from 'h3'
import type { NextFunction } from 'clear-router/types/h3'

/**
 * Bind the Inertia request context for H3.
 *
 * Normalizes the H3 event into the adapter's driver-agnostic shape and runs the
 * downstream handler inside Inertia's async-local context (mirroring the `resora`
 * middleware), so `inertia()` / `Inertia.*` resolve the active request.
 *
 * It also upgrades a `302` redirect returned for a `PUT`/`PATCH`/`DELETE` Inertia
 * visit to `303 See Other`, which the Inertia client requires to follow the
 * redirect with a `GET`. (Prefer `Inertia.redirect()` / `Inertia.back()`, which
 * already emit the correct status.)
 *
 * `@arkstack/inertia` is imported dynamically so the package stays optional.
 */
export const inertia = () => {
    return async (event: H3Event, next: NextFunction) => {
        const { runInertia, shouldUpgradeRedirect } = await import('@arkstack/inertia')

        const sourceUrl = event.req._url
            ? event.req._url.pathname + event.req._url.search
            : (event.req.url || '/')

        const request = {
            method: String(event.req.method ?? 'GET').toUpperCase(),
            url: sourceUrl,
            header: (name: string) => event.req.headers.get(name) ?? undefined,
        }

        return runInertia(request, async () => {
            const result = await next()

            if (
                request.header('x-inertia') === 'true'
                && result
                && typeof result === 'object'
                && typeof (result as { statusCode?: unknown }).statusCode === 'number'
                && shouldUpgradeRedirect(request.method, (result as { statusCode: number }).statusCode)
            ) {
                (result as { statusCode: number }).statusCode = 303
            }

            return result
        })
    }
}

export class InertiaMiddleware {
    handler (event: H3Event, next: NextFunction) {
        return inertia()(event, next)
    }
}
