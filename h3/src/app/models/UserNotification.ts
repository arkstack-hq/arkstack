import { UserNotification as BaseUserNotification } from '@arkstack/notifications'
import { User } from './User'

export class UserNotification extends BaseUserNotification {
    protected static columns = {
        userId: 'user_id',
        actionText: 'action_text',
        actionLink: 'action_link',
        readAt: 'read_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }

    user () {
        return this.belongsTo(User, 'userId', 'id')
    }
}
