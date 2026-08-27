import type { User } from '@app/models/User'
export type TwoFactorMethod = 'authenticator' | 'sms'

export type SmsCodePurpose = 'setup' | 'login'

export type TwoFactorSetup = {
    secret: string
    otpauthUrl: string
}

export type TwoFactorStatus = {
    enabled: boolean
    enabledAt: string | null
    method: TwoFactorMethod | null
    recoveryCodesRemaining: number
}

export type IssuedSmsCode = {
    code: string
    expiresAt: Date
    purpose: SmsCodePurpose
}

export type TwoFactorUser = User & {
    phone?: string | null
}