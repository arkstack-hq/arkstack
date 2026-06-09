import { Model } from 'arkormx'

export abstract class User extends Model {
    [key: string]: any
    declare email: string
    declare name: string
    declare password: string
    declare createdAt: Date
    declare updatedAt: Date

    protected static table?: string | undefined = 'users'
}