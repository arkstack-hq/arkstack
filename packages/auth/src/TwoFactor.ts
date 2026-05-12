import { Encryption, Hash, env, getModel } from '@arkstack/common'
import type { IssuedSmsCode, SmsCodePurpose, TwoFactorMethod, TwoFactorSetup, TwoFactorStatus } from './types/TwoFactor'

import { Secret } from 'otpauth'
import { User } from './Contracts/User'
import { UserTwoFactor } from './Contracts/UserTwoFactor'
import { randomBytes } from 'node:crypto'

type TwoFactorUser = User & {
    phone?: string | null
}


export class TwoFactor {
    static smsCodeTtlMinutes: number = Number(env('TWO_FACTOR_SMS_TTL_MINUTES', 10)) || 10

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

    /** 
     * Build the account label used inside the OTP URI. 
     * 
     * @param user 
     * @returns 
     */
    static getLabel (user: User) {
        return user.email || `${env('APP_NAME', 'Arkstack')}:${user.id}`
    }

    /** 
     * Create the per-user TOTP instance for setup and verification. 
     * 
     * @param user 
     * @param secret 
     * @returns 
     */
    static getTotp (user: User, secret: string) {
        return Hash.totp(secret, this.getLabel(user), env('APP_NAME', 'Arkstack'))
    }

    /** 
     * Generate a new shared secret for authenticator-based 2FA. 
     * 
     * @returns The generated secret in base32 format.
     */
    static generateSecret (size = 20) {
        return new Secret({ size }).base32
    }

    /** 
     * Build the setup payload returned to the client.
     * 
     * @param user The user for whom the setup is being created.
     * @param secret Optional existing secret to use for the setup.
     * @returns An object containing the secret and the OTPAuth URL.
     */
    static createSetup (user: User, secret?: string): TwoFactorSetup {
        const resolvedSecret = secret ?? this.generateSecret()
        const totp = this.getTotp(user, resolvedSecret)

        return {
            secret: resolvedSecret,
            otpauthUrl: totp.toString(),
        }
    }

    /** 
     * Verify a 6-digit authenticator code for a user.
     * 
     * @param user The user for whom the code is being verified.
     * @param secret The secret used to generate the code.
     * @param code The 6-digit code to verify.
     * @returns  True if the code is valid, false otherwise.
     */
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

    /** 
     * Read the setup secret stored for a user.
     * 
     * @param userId The ID of the user.
     * @returns The stored secret, or null if not found.
     */
    static async getSecret (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.secretCiphertext ? Encryption.decrypt(record.secretCiphertext) : null
    }

    /** 
     * Store the setup secret for a user.
     * 
     * @param userId The ID of the user.
     * @param secret The secret to store.
     */
    static async setSecret (userId: User['id'], secret: string) {
        await this.upsert(userId, { secretCiphertext: Encryption.encrypt(secret) })
    }

    static async clearSecret (userId: User['id']) {
        await this.upsert(userId, { secretCiphertext: null })
    }

    /** 
     * Read the timestamp indicating whether 2FA is enabled.
     * 
     * @param userId The ID of the user.
     * @returns The timestamp when 2FA was enabled, or null if not enabled.
     */
    static async getEnabledAt (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.enabledAt?.toISOString() ?? null
    }

    /** 
     * Persist the timestamp marking 2FA as enabled.
     * 
     * @param userId The ID of the user.
     * @param enabledAt The timestamp to store.
     */
    static async setEnabledAt (userId: User['id'], enabledAt: string | Date = new Date()) {
        await this.upsert(userId, {
            enabledAt: typeof enabledAt === 'string' ? new Date(enabledAt) : enabledAt,
        })
    }

    /** 
     * Remove all persisted 2FA state for a user.
     * 
     * @param userId The ID of the user.
     */
    static async clear (userId: User['id']) {
        const Model = await this.getModel()

        await Model.query().where({ userId }).delete()
    }

    /** 
     * Generate one-time recovery codes shown when 2FA is enabled.
     * 
     * @returns An array of recovery codes.
     */
    static generateBackupCodes (count = 8) {
        return Array.from({ length: count }, () => {
            const left = randomBytes(3).toString('hex').slice(0, 4).toUpperCase()
            const right = randomBytes(3).toString('hex').slice(0, 4).toUpperCase()

            return `${left}-${right}`
        })

        // return Array.from({ length: 8 }, () => {
        //     const left = Math.random().toString(36).slice(2, 6).toUpperCase()
        //     const right = Math.random().toString(36).slice(2, 6).toUpperCase()

        //     return `${left}-${right}`
        // })
    }

    /** 
     * Hash recovery codes before persisting them.
     * 
     * @param codes An array of recovery codes to hash.
     * @returns An array of hashed recovery codes.
     */
    static async hashBackupCodes (codes: string[]) {
        return await Promise.all(codes.map(async code => await Hash.make(code)))
    }

    /** 
     * Read stored recovery-code hashes for a user.
     * 
     * @param userId The ID of the user.
     * @returns An array of recovery-code hashes.
     */
    static async readRecoveryCodeHashes (userId: User['id']) {
        const record = await this.getRecord(userId)

        return record?.recoveryCodeHashes ?? []
    }

    /** 
     * Persist recovery-code hashes on the user's dedicated 2FA record.
     * 
     * @param userId 
     * @param hashes 
     */
    static async writeRecoveryCodeHashes (userId: User['id'], hashes: string[]) {
        await this.upsert(userId, { recoveryCodeHashes: hashes })
    }

    /** 
     * Consume a valid recovery code and invalidate it immediately.
     * 
     * @param userId The ID of the user.
     * @param recoveryCode The recovery code to consume.
     * @returns True if the recovery code was valid and consumed, false otherwise.
     */
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

    /** 
     * Return the public 2FA status payload for a user.
     * 
     * @param userId The ID of the user.
     * @returns An object containing the 2FA status and recovery codes remaining.
     */
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

    /**
     * Issue a new SMS code for the given user and send it via SMS for the specified purpose.
     * 
     * @param user 
     * @param purpose 
     */
    static async issueSmsCode (user: User, purpose: SmsCodePurpose): Promise<IssuedSmsCode> {
        if (!(user as TwoFactorUser).phone) {
            throw new Error('A phone number is required to issue a two-factor SMS code.')
        }

        const code = this.createSmsCode()
        const smsCodeHash = await Hash.make(code)
        const expiresAt = new Date(Date.now() + TwoFactor.smsCodeTtlMinutes * 60 * 1000)

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

    /**
     * Verify a submitted SMS code for a user and purpose, consuming the code if valid.
     * 
     * @param userId 
     * @param code 
     * @param purpose 
     * @returns 
     */
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
