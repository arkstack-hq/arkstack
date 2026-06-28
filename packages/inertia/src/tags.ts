import type { ViewFactory } from '@arkstack/view'

/** Factories that already have the Inertia tags registered. */
const registered = new WeakSet<object>()

/**
 * Build an Edge tag compiler that outputs a template data variable raw (falling
 * back to an empty string when it is absent).
 * 
 * @param name 
 * @returns 
 */
const outputVariable = (name: string): Parameters<ViewFactory['tag']>[3] => {
    return (parser, buffer, token) => {
        const ast = parser.utils.transformAst(
            parser.utils.generateAST(`${name} || ""`, token.loc, token.filename),
            token.filename,
            parser,
        )

        buffer.outputExpression(parser.utils.stringify(ast), token.filename, token.loc.start.line, false)
    }
}

/**
 * Register the `@inertia` and `@inertiaHead` Edge tags on a view factory.
 *
 * - `@inertia` renders the root mount element (the JSON `<script data-page="…">`
 *   plus the mount `<div>`), or the server-rendered markup when SSR is enabled.
 * - `@inertiaHead` renders the SSR head tags (empty without SSR).
 *
 * Both read the values the adapter passes to the root template, so they replace
 * the equivalent `{{{ inertia }}}` / `{{{ inertiaHead }}}` interpolations.
 * Idempotent per factory.
 * 
 * @param factory 
 * @returns 
 */
export const registerInertiaTags = (factory: ViewFactory): void => {
    if (registered.has(factory)) {
        return
    }

    registered.add(factory)

    factory.tag('inertia', false, false, outputVariable('inertia'))
    factory.tag('inertiaHead', false, false, outputVariable('inertiaHead'))
}
