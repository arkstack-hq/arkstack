import { PersonalAccessToken as BasePersonalAccessToken } from '@arkstack/auth'
import User from './User'

export default class PersonalAccessToken extends BasePersonalAccessToken {
    declare name: string
    declare token: string
    declare abilities: string[]
    declare deviceInfo: Record<string, unknown>
    declare lastUsedAt: Date
    declare expiresAt: Date
    declare createdAt: Date
    declare updatedAt: Date

    user () {
        return this.belongsTo(User, 'userId')
    }
}
