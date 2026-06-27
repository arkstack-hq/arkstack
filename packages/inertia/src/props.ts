import type {
    AlwaysPropContract,
    DeferPropContract,
    InertiaPropWrapper,
    LazyPropContract,
} from './types'

/**
 * A prop that is excluded from the initial page load and only resolved when the
 * client explicitly requests it via a partial reload. Use for expensive data the
 * first render does not need.
 */
export class LazyProp implements LazyPropContract {
    readonly __inertia = 'lazy' as const

    constructor(private readonly callback: () => unknown) {}

    call () {
        return this.callback()
    }
}

/**
 * A prop that is always included in the response — even on partial reloads that
 * do not list it — and cannot be filtered out by `only`/`except`.
 */
export class AlwaysProp implements AlwaysPropContract {
    readonly __inertia = 'always' as const

    constructor(private readonly value: unknown) {}

    call () {
        return typeof this.value === 'function' ? (this.value as () => unknown)() : this.value
    }
}

/**
 * A prop excluded from the initial response and fetched by the client in a
 * follow-up request after the page loads. Deferred props sharing a `group` are
 * fetched together in a single request.
 */
export class DeferProp implements DeferPropContract {
    readonly __inertia = 'defer' as const

    constructor(private readonly callback: () => unknown, readonly group: string = 'default') {}

    call () {
        return this.callback()
    }
}

/** Narrow an arbitrary value to one of the Inertia prop wrappers. */
export const isPropWrapper = (value: unknown): value is InertiaPropWrapper => {
    return Boolean(
        value
        && typeof value === 'object'
        && '__inertia' in value
        && typeof (value as { call?: unknown }).call === 'function',
    )
}

export const isLazyProp = (value: unknown): value is LazyPropContract =>
    isPropWrapper(value) && value.__inertia === 'lazy'

export const isAlwaysProp = (value: unknown): value is AlwaysPropContract =>
    isPropWrapper(value) && value.__inertia === 'always'

export const isDeferProp = (value: unknown): value is DeferPropContract =>
    isPropWrapper(value) && value.__inertia === 'defer'
