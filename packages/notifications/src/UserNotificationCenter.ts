import { getModel } from '@arkstack/common'

import { UserNotification } from './Contracts/UserNotification'
import type { DbNotificationPayload, NotificationUser } from './types'

export class UserNotificationCenter {
    private static async getModel () {
        return await getModel<typeof UserNotification>('UserNotification')
    }

    static async create (user: NotificationUser, payload: DbNotificationPayload) {
        const Model = await this.getModel()

        return await Model.query().create({
            userId: user.id,
            type: payload.type ?? null,
            title: payload.title,
            description: payload.description,
            actionText: payload.actionText ?? null,
            actionLink: payload.actionLink ?? null,
            meta: payload.meta ?? null,
        })
    }

    static async forUser (user: NotificationUser) {
        const Model = await this.getModel()

        return await Model.query().where({ userId: user.id }).get()
    }

    static async unreadForUser (user: NotificationUser) {
        const Model = await this.getModel()

        return await Model.query().where({ userId: user.id, readAt: null }).get()
    }

    static async markRead (notification: UserNotification | UserNotification['id']) {
        const Model = await this.getModel()
        const id = notification instanceof UserNotification ? notification.id : notification
        const readAt = new Date()

        await Model.query().where({ id }).update({ readAt })

        if (notification instanceof UserNotification) {
            notification.readAt = readAt
        }
    }

    static async markAllRead (user: NotificationUser) {
        const Model = await this.getModel()

        await Model.query().where({ userId: user.id, readAt: null }).update({ readAt: new Date() })
    }

    static async delete (notification: UserNotification | UserNotification['id']) {
        const Model = await this.getModel()
        const id = notification instanceof UserNotification ? notification.id : notification

        await Model.query().where({ id }).delete()
    }
}
