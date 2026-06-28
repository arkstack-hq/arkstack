import type { InertiaConfig, InertiaPage } from './types'

import { renderViaSsr } from './ssr'

/** Escape a string for safe inclusion in a double-quoted HTML attribute. */
export const escapeHtmlAttribute = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

/**
 * Build the elements the Inertia client adapter hydrates: the (empty) mount
 * `<div id="…">` plus the JSON `<script type="application/json" data-page="…">`
 * carrying the serialized page object.
 *
 * The client reads the initial page from the JSON script element
 * (`script[data-page][type="application/json"]`), not from a `data-page`
 * attribute on the mount div. Forward slashes are escaped to `\/` so an embedded
 * `</script>` in the page payload cannot terminate the script element early
 * (`\/` remains a valid JSON escape for `/`).
 */
export const renderDataPage = (page: InertiaPage, rootId: string): string => {
    const json = JSON.stringify(page).replace(/\//g, '\\/')

    return `<script data-page="${rootId}" type="application/json">${json}</script><div id="${rootId}"></div>`
}

/** Minimal built-in root document used when the configured root view is absent. */
export const builtInTemplate = (mount: string, head: string = ''): string => {
    return [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        ...(head ? [head] : []),
        '</head>',
        '<body>',
        mount,
        '</body>',
        '</html>',
    ].join('\n')
}

/**
 * Render the full HTML document for an initial (non-XHR) visit.
 *
 * When SSR is enabled the page is rendered by the external SSR server and its
 * markup + head tags are embedded; if the SSR server is unavailable it falls back
 * to a client-rendered mount element. The result is wrapped by the configured
 * `root_view` Edge template (which receives `inertia` and `inertiaHead`
 * variables), or a minimal built-in document when that view is absent.
 */
export const renderRootHtml = async (
    page: InertiaPage,
    config: InertiaConfig,
): Promise<string> => {
    let mount = renderDataPage(page, config.root_id)
    let head = ''

    if (config.ssr?.enabled) {
        const ssr = await renderViaSsr(page, config.ssr.url)

        if (ssr) {
            mount = ssr.body
            head = ssr.head.join('\n')
        }
    }

    try {
        const { view } = await import('@arkstack/view')
        const { registerInertiaTags } = await import('./tags')
        const factory = view()

        registerInertiaTags(factory)

        if (factory.exists(config.root_view)) {
            return await view(config.root_view, {
                page,
                inertia: mount,
                inertiaHead: head,
            }).render()
        }
    } catch {
        /** View layer unavailable; fall back to the built-in document. */
    }

    return builtInTemplate(mount, head)
}
