import { HasManyRelation, HasOneRelation } from 'arkormx/relationship'

import { Model } from 'arkormx'
import { PersonalAccessToken } from './PersonalAccessToken'
import { UserNotification } from '@arkstack/notifications'
import { UserTwoFactor } from './UserTwoFactor'

export abstract class User extends Model {
    declare id: number
    declare email: string
    declare name: string
    declare password: string
    declare createdAt: Date
    declare updatedAt: Date

    protected static table?: string | undefined = 'users'

    abstract personalAccessTokens (): HasManyRelation<this, PersonalAccessToken>

    abstract twoFactor (): HasOneRelation<this, UserTwoFactor>

    abstract notifications (): HasManyRelation<this, UserNotification>
}