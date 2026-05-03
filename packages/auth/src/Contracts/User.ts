import { Model } from 'arkormx'

export abstract class User extends Model {
    declare id: number
    declare name: string
    declare email: string
    declare password: string

    protected static table?: string | undefined = 'users'
}