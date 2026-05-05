import { Encryption, Hash, env, getModel } from '@arkstack/common'
import { randomBytes } from 'node:crypto'

import { User } from './Contracts/User'
import { UserTwoFactor } from './Contracts/UserTwoFactor'
import type { IssuedSmsCode, SmsCodePurpose, TwoFactorMethod, TwoFactorSetup, TwoFactorStatus } from './types/TwoFactor'

type TwoFactorUser = User & {
    phone?: string | null
}

const secretAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const appName = () => env('APP_NAME', 'Arkstack')
const smsCodeTtlMinutes = () => Number(env('TWO_FACTOR_SMS_TTL_MINUTES', 10)) || 10

export class TwoFactor {
    private static async getModel () {
        return await getModel<typeof UserTwoFactor>('UserTwoFactor')
    }

    private static async getRecord (userId: User['id']) {
        const Model = await this.getModel()

        return await Model.query().where({ userId }).first()
    }

    private static async upsert (
        userId: User['id'],
        attributes: Partial<Pick<UserTwoFactor,
            | 'method' | 'secretCiphertext' | 'smsCodeHash' | 'smsCodeExpiresAt'
            | 'smsCodePurpose' | 'enabledAt' | 'recoveryCodeHashes'
        >>
    ) {
        const Model = await this.getModel()

        await Model.query().updateOrInsert({ userId }, attributes)
    }

    static normalizeMethod (method?: string | null): TwoFactorMethod | null {
        if (method === 'authenticator' || method === 'sms') {
            return method
        }

        return null
    }

    static maskPhone (phone?: string | null) {
        if (!phone) {
            return null
        }

        const normalized = phone.replace(/\s+/g, '')

        if (normalized.length <= 4) {
            return normalized
        }

        return `${'*'.repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-4)}`
    }

    static getLabel (user: User) {
        return user.email || `${appName()}:${user.id}`
    }

    static getTotp (user: User, secret: string) {
        return Hash.totp(secret, this.getLabel(user), appName())
    }

    static generateSecret (size = 20) {
        const bytes = randomBytes(size)
        let secret = ''

        for (const byte of bytes) {
            secret += secretAlphabet[byte % secretAlphabet.length]
        }

        return secret
    }

    static createSetup (user: User, secret?: string): TwoFactorSetup {
        const resolvedSecret = secret ?? this.generateSecret()
        const totp = this.getTotp(user, resolvedSecret)

        return {
            secret: resolvedSecret,
            otpauthUrl: totp.toString(),
        }
    }

    static verifyCode (user: User, secret: string, code: string) {
        return this.getTotp(user, secret).validate({ token: code, window: 1 }) !== null
    }

    static async getMethod (userId: User['id']) {
        const record = await this.getRecord(userId)

        return this.normalizeMethod(record?.method)
    }

    static async setMethod (userId: User['id'], method: TwoFactorMethod) {
        await this.upsert(userId, { method })
    }

    static async getSecret (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.secretCiphertext ? Encryption.decrypt(record.secretCiphertext) : null
    }

    static async setSecret (userId: User['id'], secret: string) {
        await this.upsert(userId, { secretCiphertext: Encryption.encrypt(secret) })
    }

    static async clearSecret (userId: User['id']) {
        await this.upsert(userId, { secretCiphertext: null })
    }

    static async getEnabledAt (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.enabledAt?.toISOString() ?? null
    }

    static async setEnabledAt (userId: User['id'], enabledAt: string | Date = new Date()) {
        await this.upsert(userId, {
            enabledAt: typeof enabledAt === 'string' ? new Date(enabledAt) : enabledAt,
        })
    }

    static async clear (userId: User['id']) {
        const Model = await this.getModel()

        await Model.query().where({ userId }).delete()
    }

    static generateBackupCodes (count = 8) {
        return Array.from({ length: count }, () => {
            const left = randomBytes(3).toString('hex').slice(0, 4).toUpperCase()
            const right = randomBytes(3).toString('hex').slice(0, 4).toUpperCase()

            return `${left}-${right}`
        })
    }

    static async hashBackupCodes (codes: string[]) {
        return await Promise.all(codes.map(async code => await Hash.make(code)))
    }

    static async readRecoveryCodeHashes (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.recoveryCodeHashes ?? []
    }

    static async writeRecoveryCodeHashes (userId: User['id'], hashes: string[]) {
        await this.upsert(userId, { recoveryCodeHashes: hashes })
    }

    static async consumeRecoveryCode (userId: User['id'], recoveryCode: string) {
        const hashes = await this.readRecoveryCodeHashes(userId)

        for (const [index, hash] of hashes.entries()) {
            if (await Hash.verify(recoveryCode, hash)) {
                await this.writeRecoveryCodeHashes(
                    userId,
                    hashes.filter((_, currentIndex) => currentIndex !== index),
                )

                return true
            }
        }

        return false
    }

    static async readStatus (userId: User['id']): Promise<TwoFactorStatus> {
        const record = await this.getRecord(userId)
        const enabledAt = record?.enabledAt?.toISOString() ?? null
        const recoveryCodes = record?.recoveryCodeHashes ?? []

        return {
            enabled: !!enabledAt,
            enabledAt,
            method: this.normalizeMethod(record?.method),
            recoveryCodesRemaining: recoveryCodes.length,
        }
    }

    static createSmsCode () {
        return Math.floor(100000 + Math.random() * 900000).toString()
    }

    static async issueSmsCode (user: User, purpose: SmsCodePurpose): Promise<IssuedSmsCode> {
        if (!(user as TwoFactorUser).phone) {
            throw new Error('A phone number is required to issue a two-factor SMS code.')
        }

        const code = this.createSmsCode()
        const smsCodeHash = await Hash.make(code)
        const expiresAt = new Date(Date.now() + smsCodeTtlMinutes() * 60 * 1000)

        await this.upsert(user.id, {
            smsCodeHash,
            smsCodeExpiresAt: expiresAt,
            smsCodePurpose: purpose,
        })

        return {
            code,
            expiresAt,
            purpose,
        }
    }

    static async clearSmsCode (userId: User['id']) {
        await this.upsert(userId, {
            smsCodeHash: null,
            smsCodeExpiresAt: null,
            smsCodePurpose: null,
        })
    }

    static async verifySmsCode (userId: User['id'], code: string, purpose: SmsCodePurpose) {
        const record = await this.getRecord(userId)

        if (!record?.smsCodeHash || !record.smsCodeExpiresAt || record.smsCodePurpose !== purpose) {
            return false
        }

        if (record.smsCodeExpiresAt.getTime() < Date.now()) {
            await this.clearSmsCode(userId)

            return false
        }

        const isValid = await Hash.verify(code, record.smsCodeHash)

        if (isValid) {
            await this.clearSmsCode(userId)
        }

        return isValid
    }
}
