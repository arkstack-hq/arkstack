import type { DbNotificationPayload, NotificationData, NotificationRecipient } from '../types'

import { NotificationContract } from '../Contracts/NotificationContract'
import type { User } from '@app/models/User'
import type { UserNotification } from '@app/models/UserNotification'
import { UserNotificationCenter } from '../UserNotificationCenter'
import { getModel } from '@arkstack/common'
import { interpolate } from '../utils/template'

export class DbNotification extends NotificationContract<UserNotification> {
    private user?: User
    private payload: Partial<DbNotificationPayload> = {}

    from(_from: string): this {
        return this
    }

    subject(subject: string): this {
        this.payload.title = subject

        return this
    }

    recipient(recipient: NotificationRecipient | User): this {
        if (typeof recipient === 'object' && !Array.isArray(recipient) && typeof recipient.id !== 'undefined') {
            this.user = recipient

            return this
        }

        throw new Error('Database notifications require a user recipient')
    }

    type(type: DbNotificationPayload['type']): this {
        this.payload.type = type

        return this
    }

    action(text?: string | null, link?: string | null): this {
        this.payload.actionText = text
        this.payload.actionLink = link

        return this
    }

    meta(meta?: NotificationData | null): this {
        this.payload.meta = meta

        return this
    }

    async create(user: User, payload: DbNotificationPayload) {
        await getModel<typeof UserNotification>('UserNotification')

        return await UserNotificationCenter.create(user, payload)
    }

    async send(
        message: string,
        subject?: string,
        _recipient?: NotificationRecipient,
        data?: NotificationData
    ) {
        if (!this.user) {
            throw new Error('No user recipient provided for database notification')
        }

        const mergedData = this.mergeData(data)

        return await this.create(this.user, {
            type: this.payload.type ?? null,
            title: interpolate(subject ?? this.payload.title ?? '', mergedData),
            description: interpolate(message, mergedData),
            actionText: this.payload.actionText ?? null,
            actionLink: this.payload.actionLink ?? null,
            meta: this.payload.meta ?? null,
        })
    }
}
