import { User as BaseUser } from '@arkstack/auth'
import { PersonalAccessToken } from './PersonalAccessToken'
import { UserNotification } from './UserNotification'
import { UserTwoFactor } from './UserTwoFactor'
import { UserFactory } from 'src/database/factories/UserFactory'

export class User extends BaseUser {
    declare email: string
    declare password: string
    declare name: string
    declare createdAt: Date
    declare updatedAt: Date

    protected static override factoryClass = UserFactory

    protected static override columns = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }

    protected override hidden = [
        'password'
    ]

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
