import { PersonalAccessToken as BasePersonalAccessToken } from '@arkstack/auth'
import { User } from './User'

export class PersonalAccessToken extends BasePersonalAccessToken {
    declare name: string
    declare token: string
    declare abilities: string[]
    declare deviceInfo: Record<string, unknown>
    declare lastUsedAt: Date
    declare expiresAt: Date
    declare createdAt: Date
    declare updatedAt: Date

    protected static columns = {
        userId: 'user_id',
        deviceInfo: 'device_info',
        lastUsedAt: 'last_used_at',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }

    user () {
        return this.belongsTo(User, 'userId')
    }
}
