import { config } from '@arkstack/common'
import type { InertiaConfig } from './types'

/** The defaults applied when an app provides no (or partial) `inertia` config. */
export const defaultConfig: InertiaConfig = {
    root_view: 'app',
    root_id: 'app',
    version: null,
    ssr: { enabled: false },
}

/**
 * Read the merged Inertia configuration. Values from the app's
 * `src/config/inertia.ts` are layered over {@link defaultConfig}. Never throws —
 * a missing config file falls back entirely to the defaults.
 */
export const inertiaConfig = (): InertiaConfig => {
    try {
        const userConfig = config('inertia', {}) as Partial<InertiaConfig> | undefined

        return {
            ...defaultConfig,
            ...(userConfig ?? {}),
            ssr: { ...defaultConfig.ssr, ...(userConfig?.ssr ?? {}) },
        }
    } catch {
        return { ...defaultConfig }
    }
}

/** A version override set at runtime via `Inertia.version(...)`, if any. */
let versionOverride: InertiaConfig['version'] | undefined

/** Set the asset version at runtime, taking precedence over config. */
export const setVersion = (version: InertiaConfig['version']): void => {
    versionOverride = version
}

/** Resolve the current asset version to a string (empty string when disabled). */
export const resolveVersion = async (): Promise<string> => {
    const source = versionOverride ?? inertiaConfig().version
    const value = typeof source === 'function' ? await source() : source

    return value == null ? '' : String(value)
}
