import { config } from '@arkstack/common'

export const notificationConfig = <T = unknown> (key: string, defaultValue: T): T => {
    try {
        return config(`notifications.${key}`, defaultValue) as T
    } catch {
        return defaultValue
    }
}
