import type { DbNotification } from '../drivers/DbNotification'
import type { MailNotification } from '../drivers/MailNotification'
import type { RealtimeNotification } from '../drivers/RealtimeNotification'
import type { SmsNotification } from '../drivers/SmsNotification'

export type DriverMap = {
    mail: MailNotification
    email: MailNotification
    sms: SmsNotification
    db: DbNotification
    realtime: RealtimeNotification
}
