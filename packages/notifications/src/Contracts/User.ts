import { Model } from '@arkstack/database'

export abstract class User extends Model {
    [key: string]: any
    declare email: string
    declare name: string
    declare password: string
    declare createdAt: Date
    declare updatedAt: Date
    declare pushTokens?: string[] | null

    protected static table?: string | undefined = 'users'
}