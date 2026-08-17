import type { DriverResult, NotificationData, NotificationRecipient } from '../types'

import { SendNotification } from '../jobs/SendNotification'
import { configure } from '../config'

export abstract class NotificationContract<TResult = DriverResult> {
    protected contextData: NotificationData = {}

    /**
     * Send your notification
     * 
     * @param message 
     * @param subject 
     * @param recipient 
     * @param data 
     */
    abstract send(
        message: string,
        subject?: string,
        recipient?: NotificationRecipient,
        data?: NotificationData
    ): Promise<TResult>

    abstract from(from: string): this
    abstract subject(subject: string): this
    abstract recipient(recipient: NotificationRecipient): this

    data(data: NotificationData): this {
        this.contextData = data

        return this
    }

    /**
     * Send the notification to our configured queue
     * 
     * @param message 
     * @param subject 
     * @param recipient 
     * @param data 
     * @returns 
     */
    async queue(
        message: string,
        subject?: string,
        recipient?: NotificationRecipient,
        data?: NotificationData
    ): Promise<string> {
        const job = SendNotification.dispatch(this, message, subject, recipient, data)

        if (configure('queue.name')) {
            job.onQueue(configure('queue.name'))
        }

        if (configure('queue.connection')) {
            job.onConnection(configure('queue.connection'))
        }

        return job
    }

    protected mergeData(data?: NotificationData) {
        return {
            ...this.contextData,
            ...data,
            year: new Date().getFullYear(),
        }
    }
}
