import { User as BaseUser } from '@arkstack/auth'
import PersonalAccessToken from './PersonalAccessToken'
import UserTwoFactor from './UserTwoFactor'

export default class User extends BaseUser {
    declare email: string
    declare password: string
    declare name: string
    declare createdAt: Date
    declare updatedAt: Date

    protected static columns = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }

    personalAccessTokens () {
        return this.hasMany(PersonalAccessToken, 'userId')
    }

    twoFactor () {
        return this.hasOne(UserTwoFactor, 'userId')
    }
}
