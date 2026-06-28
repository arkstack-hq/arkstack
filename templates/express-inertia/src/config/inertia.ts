import type { InertiaConfig } from '@arkstack/inertia'
import { env } from '@arkstack/common'

/**
 * Inertia adapter configuration.
 *
 * @see https://arkstack.toneflix.net/guide/inertia
 */
export default (): InertiaConfig => {
  return {
    /**
     * The root Edge template that wraps the SPA. It renders the `{{{ inertia }}}`
     * mount element and loads your client bundle (e.g. via Vite tags).
     */
    root_view: 'app',

    /** The id of the DOM element the Inertia client mounts onto. */
    root_id: 'app',

    /**
     * Asset version used for cache-busting. When the client's version differs on
     * a GET visit, Inertia forces a full reload so stale assets are replaced.
     * Return a string (e.g. a build hash) or `null` to disable versioning.
     */
    version: env('INERTIA_VERSION', null),

    /**
     * Server-side rendering. When enabled, the initial page is rendered by an
     * external SSR server (your built SSR bundle) and the markup is embedded in
     * the response; if that server is unreachable the adapter falls back to
     * client-side rendering. `url` is the SSR server's render endpoint, and
     * `bundle` is the built SSR entry run by `ark inertia:ssr`.
     */
    ssr: {
      enabled: env('INERTIA_SSR', false),
      url: env('INERTIA_SSR_URL', 'http://127.0.0.1:13714/render'),
      bundle: 'dist-ssr/ssr.js',
    },
  }
}
