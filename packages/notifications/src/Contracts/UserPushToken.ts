import { Model } from 'arkormx'

export abstract class UserPushToken extends Model {
  declare token: string
  declare platform: 'ios' | 'android' | 'web'
}
