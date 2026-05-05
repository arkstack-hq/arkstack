import { describe, expect, it } from 'vitest'

import { Hash } from '@arkstack/common'
import { TwoFactor, type User } from '../src'

const user = {
    id: 1,
    email: 'two-factor@example.com',
    name: 'Two Factor',
    password: 'password',
} as User

describe('TwoFactor', () => {
    it('normalizes supported methods', () => {
        expect(TwoFactor.normalizeMethod('authenticator')).toBe('authenticator')
        expect(TwoFactor.normalizeMethod('sms')).toBe('sms')
        expect(TwoFactor.normalizeMethod('email')).toBeNull()
        expect(TwoFactor.normalizeMethod(null)).toBeNull()
    })

    it('masks phone numbers', () => {
        expect(TwoFactor.maskPhone('+234 801 234 5678')).toBe('**********5678')
        expect(TwoFactor.maskPhone('1234')).toBe('1234')
        expect(TwoFactor.maskPhone()).toBeNull()
    })

    it('creates authenticator setup payloads and verifies generated codes', () => {
        const setup = TwoFactor.createSetup(user)
        const code = TwoFactor.getTotp(user, setup.secret).generate()

        expect(setup.secret).toMatch(/^[A-Z2-7]+$/)
        expect(setup.otpauthUrl).toContain('otpauth://totp/')
        expect(TwoFactor.verifyCode(user, setup.secret, code)).toBe(true)
        expect(TwoFactor.verifyCode(user, setup.secret, '000000')).toBe(false)
    })

    it('generates recovery codes and hashes them', async () => {
        const codes = TwoFactor.generateBackupCodes()
        const hashes = await TwoFactor.hashBackupCodes(codes)

        expect(codes).toHaveLength(8)
        expect(codes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/)
        expect(hashes).toHaveLength(codes.length)
        expect(hashes[0]).not.toBe(codes[0])
        expect(await Hash.verify(codes[0], hashes[0])).toBe(true)
    })

    it('creates six digit SMS codes', () => {
        expect(TwoFactor.createSmsCode()).toMatch(/^\d{6}$/)
    })
})
