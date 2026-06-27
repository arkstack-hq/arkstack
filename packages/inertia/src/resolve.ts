import { isAlwaysProp, isDeferProp, isLazyProp, isPropWrapper } from './props'
import type { InertiaRequest, PageProps } from './types'

/** Parse a comma-separated partial-reload header into a trimmed, non-empty list. */
const csv = (value: string | undefined): string[] => {
    if (!value) {
        return []
    }

    return value.split(',').map(entry => entry.trim()).filter(Boolean)
}

/** Recursively evaluate prop wrappers and callbacks within a value. */
const evaluate = async (value: unknown): Promise<unknown> => {
    if (isPropWrapper(value)) {
        return evaluate(value.call())
    }

    if (typeof value === 'function') {
        return evaluate((value as () => unknown)())
    }

    if (value && typeof (value as PromiseLike<unknown>).then === 'function') {
        return evaluate(await value)
    }

    if (Array.isArray(value)) {
        return Promise.all(value.map(entry => evaluate(entry)))
    }

    if (value && typeof value === 'object' && (value as object).constructor === Object) {
        const entries = await Promise.all(
            Object.entries(value as PageProps).map(async ([key, val]) => [key, await evaluate(val)] as const),
        )

        return Object.fromEntries(entries)
    }

    return value
}

export interface ResolvedProps {
    props: PageProps
    deferredProps?: Record<string, string[]>
}

/**
 * Filter and evaluate page props for the current request, honouring Inertia's
 * partial-reload semantics:
 *
 * - On a full visit or a non-matching partial, lazy and deferred props are
 *   excluded; `always` and plain props are included.
 * - On a partial reload matching this component, only the requested keys
 *   (`X-Inertia-Partial-Data`) are kept — minus `X-Inertia-Partial-Except` —
 *   while `always` props are always kept.
 *
 * Deferred props are advertised under `deferredProps` (grouped) on the initial
 * response so the client can request them afterwards.
 */
export const resolveProps = async (
    component: string,
    props: PageProps,
    request: InertiaRequest,
): Promise<ResolvedProps> => {
    const isInertia = request.header('x-inertia') === 'true'
    const isPartial = isInertia && request.header('x-inertia-partial-component') === component
    const only = csv(request.header('x-inertia-partial-data'))
    const except = csv(request.header('x-inertia-partial-except'))

    const deferred: Record<string, string[]> = {}
    const included: PageProps = {}

    for (const [key, value] of Object.entries(props)) {
        let include: boolean

        if (!isPartial) {
            // Collect deferred props for the client to fetch after the initial load.
            if (isDeferProp(value)) {
                (deferred[value.group] ??= []).push(key)
            }

            include = !isLazyProp(value) && !isDeferProp(value)
        } else {
            include = only.length ? only.includes(key) : true

            if (except.length && except.includes(key)) {
                include = false
            }

            // Deferred props are only sent on a partial that explicitly asks for them.
            if (isDeferProp(value) && !only.includes(key)) {
                include = false
            }
        }

        // `always` props ignore every filter.
        if (isAlwaysProp(value)) {
            include = true
        }

        if (include) {
            included[key] = await evaluate(value)
        }
    }

    const deferredProps = !isPartial && Object.keys(deferred).length ? deferred : undefined

    return { props: included, deferredProps }
}
