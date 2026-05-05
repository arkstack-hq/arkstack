import type { DriverResult, NotificationData, NotificationRecipient } from '../types'

export abstract class NotificationContract<TResult = DriverResult> {
    protected contextData: NotificationData = {}

    abstract send (
        message: string,
        subject?: string,
        recipient?: NotificationRecipient,
        data?: NotificationData
    ): Promise<TResult>

    abstract from (from: string): this
    abstract subject (subject: string): this
    abstract recipient (recipient: NotificationRecipient): this

    data (data: NotificationData): this {
        this.contextData = data

        return this
    }

    protected mergeData (data?: NotificationData) {
        return {
            ...this.contextData,
            ...data,
            year: new Date().getFullYear(),
        }
    }
}
