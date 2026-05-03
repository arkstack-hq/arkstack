import { Model } from 'arkormx'

export abstract class User extends Model {
    declare id: number
    declare email: string
    declare password: string
}