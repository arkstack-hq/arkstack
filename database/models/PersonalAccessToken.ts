import { PersonalAccessToken as BasePersonalAccessToken } from '../../packages/auth/src'
import User from './User'

export default class PersonalAccessToken extends BasePersonalAccessToken {
    protected static table = 'personal_access_tokens'
    protected static columns = {
        userId: 'user_id',
        deviceInfo: 'device_info',
        lastUsedAt: 'last_used_at',
        expiresAt: 'expires_at',
    }

    user () {
        return this.belongsTo(User, 'userId')
    }
}
