import { AlwaysProp, DeferProp, LazyProp } from './props'
import { configure, inertiaConfig, resolveVersion, setVersion } from './config'
import { currentStore, shareData, sharedData } from './context'

import { Response } from '@arkstack/http'
import { SEE_OTHER_METHODS } from './protocol'
import { renderRootHtml } from './html'
import { resolveProps } from './resolve'
import type { InertiaConfig, InertiaPage, InertiaRequest, PageProps } from './types'

const isInertiaRequest = (request: InertiaRequest) => request.header('x-inertia') === 'true'

const jsonResponse = (page: InertiaPage): Response<InertiaPage> => {
    return new Response<InertiaPage>({ statusCode: 200, body: page })
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Vary', 'X-Inertia')
        .header('X-Inertia', 'true') as Response<InertiaPage>
}

const htmlResponse = (html: string): Response<string> => {
    return new Response<string>({ statusCode: 200, body: html })
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Vary', 'X-Inertia') as Response<string>
}

/**
 * The Inertia adapter. Build server-driven SPA responses: controllers return
 * `Inertia.render('Page', props)` and the adapter emits either a JSON page object
 * (for Inertia XHR visits) or a full HTML document embedding the page (for the
 * initial visit). Shared props, partial reloads, asset versioning, deferred and
 * lazy props, and redirect status semantics are all handled here.
 *
 * @see https://inertiajs.com/the-protocol
 */
export class Inertia {
    /** Require an active request context, throwing a clear error otherwise. */
    private static request (): InertiaRequest {
        const store = currentStore()

        if (!store) {
            throw new Error(
                'Inertia called outside of a request. Ensure the Inertia middleware is registered.',
            )
        }

        return store.request
    }

    /**
     * Render an Inertia page. Returns a {@link Response} the runtime serializes:
     * a JSON page object for Inertia visits, or a full HTML document for the
     * initial page load.
     *
     * @param component  The client component name, e.g. `Users/Index`.
     * @param props      Props for the component (plain values, callbacks, or prop wrappers).
     */
    static async render (component: string, props: PageProps = {}): Promise<Response> {
        const request = Inertia.request()
        const config = inertiaConfig()
        const version = await resolveVersion()

        // Asset-version mismatch on a GET visit: tell the client to hard-reload.
        if (
            isInertiaRequest(request)
            && request.method === 'GET'
            && (request.header('x-inertia-version') ?? '') !== version
        ) {
            return Inertia.conflict(request.url)
        }

        const merged: PageProps = { ...sharedData(), ...props }
        const { props: resolved, deferredProps } = await resolveProps(component, merged, request)

        const page: InertiaPage = {
            component,
            props: resolved,
            url: request.url,
            version,
            ...(deferredProps ? { deferredProps } : {}),
        }

        if (isInertiaRequest(request)) {
            return jsonResponse(page)
        }

        return htmlResponse(await renderRootHtml(page, config))
    }

    /**
     * Redirect to an external URL. On an Inertia visit this responds `409` with
     * an `X-Inertia-Location` header so the client performs a full page visit;
     * otherwise it issues a normal `302` redirect.
     */
    static location (url: string): Response {
        if (isInertiaRequest(Inertia.request())) {
            return Inertia.conflict(url)
        }

        return Inertia.redirect(url, 302)
    }

    /**
     * Redirect within the app. For `PUT`/`PATCH`/`DELETE` requests the status is
     * upgraded to `303 See Other` (per the Inertia protocol) unless an explicit
     * status is given, so the client follows the redirect with a `GET`.
     */
    static redirect (url: string, status?: number): Response {
        const method = Inertia.request().method
        const code = status ?? (SEE_OTHER_METHODS.has(method) ? 303 : 302)

        return new Response({ statusCode: code, body: null }).header('Location', url) as Response
    }

    /** Redirect back to the referring URL (or `fallback`). */
    static back (fallback: string = '/'): Response {
        const request = Inertia.request()

        return Inertia.redirect(request.header('referer') || request.header('referrer') || fallback)
    }

    /** A `409` response carrying an `X-Inertia-Location` header. */
    private static conflict (url: string): Response {
        return new Response({ statusCode: 409, body: null }).header('X-Inertia-Location', url) as Response
    }

    /**
     * Share props with every Inertia response. Called inside a request the data
     * is scoped to that request; called outside (e.g. at boot) it applies globally.
     */
    static share (key: string, value: unknown): void
    static share (data: PageProps): void
    static share (keyOrData: string | PageProps, value?: unknown): void {
        shareData(typeof keyOrData === 'string' ? { [keyOrData]: value } : keyOrData)
    }

    /** Read the currently shared props (request-scoped when in a request). */
    static shared (): PageProps {
        return { ...sharedData() }
    }

    /** Set the asset version used for cache-busting, overriding config. */
    static version (version: InertiaConfig['version']): void {
        setVersion(version)
    }

    /** Override Inertia configuration at runtime (e.g. enable SSR programmatically). */
    static configure (partial: Partial<InertiaConfig>): void {
        configure(partial)
    }

    /**
     * A prop only resolved on a partial reload that explicitly requests it.
     * Excluded from the initial page load.
     */
    static lazy (callback: () => unknown): LazyProp {
        return new LazyProp(callback)
    }

    /** Alias of {@link Inertia.lazy} matching the modern Inertia client naming. */
    static optional (callback: () => unknown): LazyProp {
        return new LazyProp(callback)
    }

    /** A prop always included in the response, even on partial reloads. */
    static always (value: unknown): AlwaysProp {
        return new AlwaysProp(value)
    }

    /**
     * A prop excluded from the initial response and fetched by the client after
     * load. Deferred props sharing a `group` are fetched together.
     */
    static defer (callback: () => unknown, group: string = 'default'): DeferProp {
        return new DeferProp(callback, group)
    }
}
