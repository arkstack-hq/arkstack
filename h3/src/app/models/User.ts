import { User as BaseUser } from '@arkstack/auth'
import PersonalAccessToken from './PersonalAccessToken'

export default class User extends BaseUser {
    declare email: string
    declare password: string
    declare name: string
    declare createdAt: Date
    declare updatedAt: Date

    personalAccessTokens () {
        return this.hasMany(PersonalAccessToken, 'userId')
    }
}
