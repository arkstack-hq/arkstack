import { NotificationData, NotificationRecipient } from '../types'

import { Job } from '@arkstack/jobs'
import { NotificationContract } from '../Contracts/NotificationContract'

export class SendNotification extends Job {
  tries = 3
  backoff = 30

  constructor(
    private notification: NotificationContract,
    private message: string,
    private subject?: string,
    private recipient?: NotificationRecipient,
    private data?: NotificationData
  ) {
    super()
  }

  async handle() {
    await this.notification.send(
      this.message,
      this.subject,
      this.recipient,
      this.data
    )
  }
}
