import { AsyncLocalStorage } from 'node:async_hooks'
import type { InertiaRequest, PageProps } from './types'

/** Per-request state the Inertia adapter carries through the request lifecycle. */
export interface InertiaStore {
    /** The normalized current request. */
    request: InertiaRequest
    /** Props shared for the duration of this request (seeded from the global bag). */
    shared: PageProps
}

/**
 * Async-local store binding the current request to the Inertia helpers. The
 * driver middleware runs the downstream handler inside {@link runInertia} so that
 * `inertia()` / `Inertia.*` can resolve the active request and shared props
 * without threading them through every call — mirroring how resora binds its
 * `{ req, res }` context.
 */
const storage = new AsyncLocalStorage<InertiaStore>()

/**
 * Props shared across every request (set outside a request, e.g. at boot). Each
 * request seeds its own {@link InertiaStore.shared} bag from this so per-request
 * sharing never leaks between requests.
 */
const globalShared: PageProps = {}

/** Run `callback` with `request` bound as the active Inertia context. */
export const runInertia = <T> (request: InertiaRequest, callback: () => T): T => {
    return storage.run({ request, shared: { ...globalShared } }, callback)
}

/** The active store, or `undefined` when called outside an Inertia request. */
export const currentStore = (): InertiaStore | undefined => storage.getStore()

/** Merge data into the shared bag — the current request's if active, else the global one. */
export const shareData = (data: PageProps): void => {
    const target = storage.getStore()?.shared ?? globalShared

    Object.assign(target, data)
}

/** Read the effective shared bag (request-scoped when active, else global). */
export const sharedData = (): PageProps => {
    return storage.getStore()?.shared ?? globalShared
}

/** Remove every globally shared prop (primarily for tests). */
export const flushShared = (): void => {
    for (const key of Object.keys(globalShared)) {
        delete globalShared[key]
    }
}
