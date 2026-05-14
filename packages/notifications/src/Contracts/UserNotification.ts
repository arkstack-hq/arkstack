import type { DbNotificationType, NotificationData } from '../types'

import { Model } from '@arkstack/database'

export abstract class UserNotification extends Model {
    [key: string]: any
    declare type: DbNotificationType | null
    declare title: string
    declare description: string
    declare actionText: string | null
    declare actionLink: string | null
    declare meta: NotificationData | null
    declare readAt: Date | null
    declare createdAt: Date
    declare updatedAt: Date

    protected static table?: string | undefined = 'user_notifications'

    protected casts = {
        meta: 'json',
    } as const
}
