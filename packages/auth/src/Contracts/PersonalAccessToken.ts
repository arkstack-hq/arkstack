import { Model } from '@arkstack/database'

export abstract class PersonalAccessToken extends Model {
    declare id: number
    declare name: string
    declare token: string
    declare abilities: string[]
    declare userId: number
    declare createdAt: Date
    declare expiresAt: Date | null
    declare lastUsedAt: Date | null
    declare deviceInfo: Record<string, unknown> | null
}
