import { Model } from '@arkstack/database'

export abstract class User extends Model {
    declare id: number
    declare email: string
    declare name: string
    declare password: string
    declare createdAt: Date
    declare updatedAt: Date

    protected static table?: string | undefined = 'users'
}