import type { InertiaConfig, InertiaPage } from './types'

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
 * Build the root mount element carrying the serialized page object in its
 * `data-page` attribute — the element the Inertia client adapter hydrates.
 */
export const renderDataPage = (page: InertiaPage, rootId: string): string => {
    const json = escapeHtmlAttribute(JSON.stringify(page))

    return `<div id="${rootId}" data-page="${json}"></div>`
}

/** Minimal built-in root document used when the configured root view is absent. */
export const builtInTemplate = (mount: string): string => {
    return [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '</head>',
        '<body>',
        mount,
        '</body>',
        '</html>',
    ].join('\n')
}

/**
 * Render the full HTML document for an initial (non-XHR) visit. When the
 * configured `root_view` Edge template exists it is rendered with the page data
 * and an `inertia` variable holding the mount element; otherwise a minimal
 * built-in document is returned.
 */
export const renderRootHtml = async (
    page: InertiaPage,
    config: InertiaConfig,
): Promise<string> => {
    const mount = renderDataPage(page, config.root_id)

    try {
        const { view } = await import('@arkstack/view')
        const factory = view()

        if (factory.exists(config.root_view)) {
            return await view(config.root_view, {
                page,
                inertia: mount,
                inertiaHead: '',
            }).render()
        }
    } catch {
        /** View layer unavailable; fall back to the built-in document. */
    }

    return builtInTemplate(mount)
}
