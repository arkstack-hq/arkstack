import { User as BaseUser } from '../../packages/auth/src'

export default class User extends BaseUser {
    protected static table = 'users'
}
