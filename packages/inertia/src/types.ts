/**
 * A bag of props passed to an Inertia page. Values may be plain JSON-serializable
 * data, synchronous/asynchronous callbacks (evaluated lazily when included), or
 * one of the special prop wrappers ({@link LazyPropContract}, {@link AlwaysPropContract},
 * {@link DeferPropContract}).
 */
export type PageProps = Record<string, unknown>

/**
 * The page object Inertia exchanges with the client. It is serialized to JSON for
 * Inertia XHR visits and embedded in the root template's `data-page` script
 * element on the initial full-page visit.
 *
 * @see https://inertiajs.com/the-protocol
 */
export interface InertiaPage {
    /** The client-side page component to render, e.g. `Users/Index`. */
    component: string
    /** The resolved props for the component. */
    props: PageProps
    /** The URL of the current page (path + query). */
    url: string
    /** The current asset version string. */
    version: string
    /** Deferred prop keys grouped by fetch group, sent so the client can request them after load. */
    deferredProps?: Record<string, string[]>
    /** Prop keys the client should merge into existing data instead of replacing. */
    mergeProps?: string[]
    /** Whether to clear the client-side history encryption state. */
    clearHistory?: boolean
    /** Whether to encrypt the client-side history entry. */
    encryptHistory?: boolean
}

/** Configuration for the Inertia adapter, read from `config('inertia')`. */
export interface InertiaConfig {
    /**
     * The root Edge template that wraps the SPA and renders the `data-page`
     * script element and mount div. Defaults to `app`. When the view does not
     * exist a minimal built-in template is used.
     */
    root_view: string
    /**
     * The id of the root DOM element the client mounts onto (and the `data-page`
     * value on the JSON script element). Defaults to `app`.
     */
    root_id: string
    /**
     * The asset version. A string, or a function returning one. When the client
     * reports a different version on a GET visit, the adapter responds with a
     * `409` and an `X-Inertia-Location` header so the client performs a full
     * reload. Defaults to `null` (versioning disabled).
     */
    version: string | null | (() => string | null | Promise<string | null>)
    /** Server-side rendering options. */
    ssr: {
        /** Whether the initial visit is rendered by the external SSR server. */
        enabled: boolean
        /** The SSR server's render endpoint. Defaults to the standard Inertia address. */
        url?: string
        /**
         * Path to the built SSR bundle run by `ark inertia:ssr`. Relative paths
         * are resolved from the app root. Defaults to `dist-ssr/ssr.js`.
         */
        bundle?: string
    }
}

/**
 * The normalized, driver-agnostic view of the current request that the Inertia
 * adapter needs. Each driver middleware constructs one of these from its native
 * request object.
 */
export interface InertiaRequest {
    /** The HTTP method, upper-cased (e.g. `GET`, `POST`, `PUT`). */
    method: string
    /** The request URL used as `page.url` (path + query string). */
    url: string
    /** Read a request header by (case-insensitive) name. */
    header (name: string): string | undefined
}

/** Marker contract for a prop that is only included on matching partial reloads. */
export interface LazyPropContract {
    readonly __inertia: 'lazy'
    call (): unknown
}

/** Marker contract for a prop that is always included, even on partial reloads. */
export interface AlwaysPropContract {
    readonly __inertia: 'always'
    call (): unknown
}

/**
 * Marker contract for a prop excluded from the initial response and fetched by
 * the client in a follow-up request, optionally grouped with other deferred props.
 */
export interface DeferPropContract {
    readonly __inertia: 'defer'
    readonly group: string
    call (): unknown
}

/** Any of the special Inertia prop wrappers. */
export type InertiaPropWrapper = LazyPropContract | AlwaysPropContract | DeferPropContract
