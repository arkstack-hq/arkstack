import { User as BaseUser } from '../../packages/auth/src'
import PersonalAccessToken from './PersonalAccessToken'

export default class User extends BaseUser {
    protected static table = 'users'

    personalAccessTokens () {
        return this.hasMany(PersonalAccessToken, 'userId')
    }
}
