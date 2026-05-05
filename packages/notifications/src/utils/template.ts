import type { NotificationData } from '../types'

export const interpolate = (value: string, data: NotificationData = {}) => {
    return value.replace(/\{([^{}]+)\}/g, (match, key) => {
        const replacement = data[key.trim()]

        return replacement === undefined || replacement === null ? match : String(replacement)
    })
}
