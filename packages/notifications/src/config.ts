import { DotPath, DotPathValue, config } from '@arkstack/common'

import { NotificationConfig } from './types'

// @ts-expect-error Just ignore the old fool
export const configure = <T extends DotPath<NotificationConfig>>(
    key: T,
    defaultValue?: unknown,
): DotPathValue<NotificationConfig, T> => {
    try {
        return config(`notifications.${key}`, defaultValue) as never
    } catch {
        return defaultValue as never
    }
}
