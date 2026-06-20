import { DotPath, DotPathValue, config } from '@arkstack/common'

import { CacheConfig } from './types'

/**
 * Read a value from the `cache` configuration namespace with a fallback.
 *
 * Mirrors the framework `config()` helper but is scoped to the cache config and
 * never throws when the config file is missing, returning the default instead.
 *
 * @param key           Dot path within the cache config.
 * @param defaultValue  Value returned when the key is not set.
 */
export const configure = <T extends DotPath<CacheConfig>> (
    key: T,
    defaultValue: unknown,
): DotPathValue<CacheConfig, T> => {
    try {
        return config(`cache.${key}`, defaultValue) as never
    } catch {
        return defaultValue as never
    }
}
