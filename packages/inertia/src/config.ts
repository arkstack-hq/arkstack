import { config } from '@arkstack/common'
import type { InertiaConfig } from './types'

/** The defaults applied when an app provides no (or partial) `inertia` config. */
export const defaultConfig: InertiaConfig = {
    root_view: 'app',
    root_id: 'app',
    version: null,
    ssr: { enabled: false },
}

/** Runtime overrides applied on top of file config via {@link configure}. */
let configOverrides: Partial<InertiaConfig> = {}

/**
 * Override Inertia configuration at runtime, taking precedence over
 * `src/config/inertia.ts`. Useful for programmatic setups and tests. Merges
 * shallowly, with `ssr` merged one level deep.
 */
export const configure = (partial: Partial<InertiaConfig>): void => {
    configOverrides = {
        ...configOverrides,
        ...partial,
        ...(partial.ssr ? { ssr: { ...configOverrides.ssr, ...partial.ssr } } : {}),
    }
}

/** Clear any runtime configuration overrides (primarily for tests). */
export const resetConfig = (): void => {
    configOverrides = {}
}

/**
 * Read the merged Inertia configuration. Runtime overrides ({@link configure})
 * are layered over the app's `src/config/inertia.ts`, which is layered over
 * {@link defaultConfig}. Never throws — a missing config file falls back entirely
 * to the defaults.
 */
export const inertiaConfig = (): InertiaConfig => {
    let userConfig: Partial<InertiaConfig> | undefined

    try {
        userConfig = config('inertia', {}) as Partial<InertiaConfig> | undefined
    } catch {
        userConfig = undefined
    }

    return {
        ...defaultConfig,
        ...(userConfig ?? {}),
        ...configOverrides,
        ssr: {
            ...defaultConfig.ssr,
            ...(userConfig?.ssr ?? {}),
            ...(configOverrides.ssr ?? {}),
        },
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
