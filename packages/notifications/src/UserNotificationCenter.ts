import type { ArkormCollection, LengthAwarePaginator } from 'arkormx'

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

    /**
     * Fetch all the users unread messages
     * 
     * @param user 
     */
    static async unreadForUser(user: User): Promise<ArkormCollection<UserNotification, UserNotification[]>>
    /**
     * Fetch all the users unread messages with a lenght aware paginator instance
     * 
     * @param user 
     * @param perPage 
     */
    static async unreadForUser(user: User, perPage: number): Promise<LengthAwarePaginator<UserNotification>>
    static async unreadForUser(user: User, perPage?: number): Promise<unknown> {
        const Model = await this.getModel()

        const query = Model.query().where({ userId: user.id, readAt: null })

        if (perPage) {
            return await query.paginate()
        }

        return await query.get()
    }

    /**
     * Mark the notification as read
     * 
     * @param notification 
     */
    static async markRead(notification: UserNotification | string | number) {
        const Model = await this.getModel()
        const id = typeof notification === 'object' ? notification.id : notification
        const readAt = new Date()

        await Model.query().where({ id }).update({ readAt })

        if (typeof notification === 'object') {
            notification.readAt = readAt
        }
    }

    /**
     * Mark all unread notifications as read
     * 
     * @param user 
     */
    static async markAllRead(user: User, ids?: string[] | number[]) {
        const Model = await this.getModel()

        const query = Model.query().where({ userId: user.id, readAt: null })

        if (ids) {
            query.whereIn('id', ids)
        }

        await query.update({ readAt: new Date() })
    }

    /**
     * Delete the indicated notifications
     * 
     * @param notification 
     */
    static async delete(notification: UserNotification | string | number | UserNotification[] | string[] | number[]) {
        const Model = await this.getModel()

        if (Array.isArray(notification)) {
            const ids = notification.map(e => typeof e === 'object' ? e.id : e)

            await Model.query().whereIn('id', ids).delete()
        } else {
            const id = typeof notification === 'object' ? notification.id : notification

            await Model.query().where({ id }).delete()
        }

    }
}
