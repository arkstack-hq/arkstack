import { DotPath, DotPathValue, config } from '@arkstack/common'

import { QueueConfig } from './types'

/**
 * Read a value from the `queue` configuration namespace with a fallback.
 *
 * Never throws when the config file is missing; returns the default instead.
 *
 * @param key           Dot path within the queue config.
 * @param defaultValue  Value returned when the key is not set.
 */
export const configure = <T extends DotPath<QueueConfig>> (
    key: T,
    defaultValue: unknown,
): DotPathValue<QueueConfig, T> => {
    try {
        return config(`queue.${key}`, defaultValue) as never
    } catch {
        return defaultValue as never
    }
}
