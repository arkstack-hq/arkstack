import { Model } from 'arkormx'

import type { SmsCodePurpose, TwoFactorMethod } from '../types/TwoFactor'
import type { User } from './User'

export abstract class UserTwoFactor extends Model {
    declare id: number | string
    declare userId: User['id']
    declare method: TwoFactorMethod | null
    declare secretCiphertext: string | null
    declare smsCodeHash: string | null
    declare smsCodeExpiresAt: Date | null
    declare smsCodePurpose: SmsCodePurpose | null
    declare enabledAt: Date | null
    declare recoveryCodeHashes: string[] | null
    declare createdAt: Date
    declare updatedAt: Date

    protected static override table?: string | undefined = 'user_two_factors'

    protected casts = {
        recoveryCodeHashes: 'json',
    } as const
}
