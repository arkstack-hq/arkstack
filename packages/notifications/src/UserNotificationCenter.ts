import type { DbNotificationPayload } from './types'
import { Notification } from './Notification'
import type { User } from '@app/models/User'
import type { UserNotification } from '@app/models/UserNotification'
import { getModel } from '@arkstack/common'

export class UserNotificationCenter {
    private static async getModel() {
        return await getModel<typeof UserNotification>('UserNotification')
    }

    /**
     * Create a database notification then broadcast it using the configured realtime driver
     * 
     * @param user 
     * @param payload 
     */
    static async send(user: User, payload: DbNotificationPayload, channel: string[] = []) {
        return await Notification.realtime()
            .store()
            .channel(user.pushTokens ?? channel)
            .meta(payload.meta)
            .type(payload.type)
            .subject(payload.title)
            .action(payload.actionText, payload.actionLink)
            .send(payload.description, payload.title, undefined, payload)

    }

    /**
     * Create a database notification
     * 
     * @param user 
     * @param payload 
     */
    static async create(user: User, payload: DbNotificationPayload) {
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

    static async forUser(user: User) {
        const Model = await this.getModel()

        return await Model.query().where({ userId: user.id }).get()
    }

    static async unreadForUser(user: User) {
        const Model = await this.getModel()

        return await Model.query().where({ userId: user.id, readAt: null }).get()
    }

    static async markRead(notification: UserNotification | UserNotification['id']) {
        const Model = await this.getModel()
        const id = typeof notification === 'object' ? notification.id : notification
        const readAt = new Date()

        await Model.query().where({ id }).update({ readAt })

        if (typeof notification === 'object') {
            notification.readAt = readAt
        }
    }

    static async markAllRead(user: User) {
        const Model = await this.getModel()

        await Model.query().where({ userId: user.id, readAt: null }).update({ readAt: new Date() })
    }

    static async delete(notification: UserNotification | UserNotification['id']) {
        const Model = await this.getModel()
        const id = typeof notification === 'object' ? notification.id : notification

        await Model.query().where({ id }).delete()
    }
}
