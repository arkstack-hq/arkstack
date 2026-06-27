import { Inertia } from './Inertia'
import type { PageProps } from './types'
import type { Response } from '@arkstack/http'

/**
 * Render an Inertia page, or — when called with no arguments — return the
 * {@link Inertia} manager for chaining (`inertia().share(...)`,
 * `inertia().version(...)`).
 *
 * @example
 * ```ts
 * // In a controller
 * return inertia('Users/Index', { users: await User.all() })
 *
 * // Share data with every response
 * inertia().share('appName', config('app.name'))
 * ```
 */
export function inertia (): typeof Inertia
export function inertia (component: string, props?: PageProps): Promise<Response>
export function inertia (component?: string, props: PageProps = {}): typeof Inertia | Promise<Response> {
    if (component === undefined) {
        return Inertia
    }

    return Inertia.render(component, props)
}
