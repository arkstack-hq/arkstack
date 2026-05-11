import { User as BaseUser } from '../../packages/auth/src'
import PersonalAccessToken from './PersonalAccessToken'
import UserNotification from './UserNotification'
import UserTwoFactor from './UserTwoFactor'

export default class User extends BaseUser {
    protected static table = 'users'

    personalAccessTokens () {
        return this.hasMany(PersonalAccessToken, 'userId')
    }

    twoFactor () {
        return this.hasOne(UserTwoFactor, 'userId')
    }

    notifications () {
        return this.hasMany(UserNotification, 'userId')
    }
}
