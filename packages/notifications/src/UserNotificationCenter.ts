import type { ArkormCollection, LengthAwarePaginator } from 'arkormx'
import { Concrete, getModel } from '@arkstack/common'

import type { DbNotificationPayload } from './types'
import { Notification } from './Notification'
import type { User } from '@app/models/User'
import type { UserNotification } from '@app/models/UserNotification'

export class UserNotificationCenter {
    private static async getModel() {
        return getModel<Concrete<typeof UserNotification>>('UserNotification')
    }

    /**
     * Store a notification, broadcast it on the user's channel, and push it to
     * their devices when `drivers.realtime.push` is configured.
     *
     * @param user
     * @param payload
     * @param devices  Push to these tokens instead of the user's own.
     */
    static async send(user: User, payload: DbNotificationPayload, devices?: string[]) {
        const notification = Notification.realtime()
            .store()
            .recipient(user)
            .meta(payload.meta)
            .type(payload.type)
            .subject(payload.title)
            .action(payload.actionText, payload.actionLink)

        if (devices?.length) {
            notification.devices(devices)
        }

        return await notification.send(payload.description, payload.title, undefined, payload)
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

        const query = Model.query().where({ userId: user.id }).whereNull('readAt')

        if (perPage) {
            return await query.paginate(perPage)
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

        const query = Model.query().where({ userId: user.id }).whereNull('readAt')
        const scoped = ids ? query.whereIn('id', ids) : query

        // `update` changes a single row; `updateFrom` updates every match.
        await scoped.updateFrom({ readAt: new Date() })
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
