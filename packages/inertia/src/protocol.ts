/** Methods whose redirects must use `303 See Other` so the Inertia client re-issues a GET. */
export const SEE_OTHER_METHODS = new Set(['PUT', 'PATCH', 'DELETE'])

/**
 * Whether a `302` redirect produced for the given method should be upgraded to a
 * `303 See Other` on an Inertia visit. Inertia's client follows a `303` with a
 * `GET`, which is required after `PUT`/`PATCH`/`DELETE` mutations.
 */
export const shouldUpgradeRedirect = (method: string, status: number): boolean => {
    return status === 302 && SEE_OTHER_METHODS.has(method.toUpperCase())
}
