import type { InertiaPage } from './types'

/** The default address the Inertia SSR server listens on. */
export const DEFAULT_SSR_URL = 'http://127.0.0.1:13714/render'

/** The payload returned by an Inertia SSR server for a rendered page. */
export interface SsrResponse {
    /** HTML strings to inject into the document `<head>` (title, meta, style). */
    head: string[]
    /** The rendered `<div id="app" data-page="…">…</div>` mount element. */
    body: string
}

/**
 * Render a page via an external Inertia SSR server.
 *
 * POSTs the page object to the SSR endpoint (a Node process running the app's SSR
 * bundle) and returns its `{ head, body }`. Returns `null` on any failure — an
 * unreachable server, a non-2xx response, or a malformed payload — so the caller
 * can fall back to client-side rendering rather than failing the request.
 *
 * @see https://inertiajs.com/server-side-rendering
 */
export const renderViaSsr = async (
    page: InertiaPage,
    url: string = DEFAULT_SSR_URL,
): Promise<SsrResponse | null> => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(page),
        })

        if (!response.ok) {
            return null
        }

        const data = await response.json() as Partial<SsrResponse> | null

        if (!data || typeof data.body !== 'string') {
            return null
        }

        return {
            head: Array.isArray(data.head) ? data.head : [],
            body: data.body,
        }
    } catch {
        return null
    }
}
