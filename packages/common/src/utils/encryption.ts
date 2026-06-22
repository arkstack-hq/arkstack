import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { appKey } from '../system'

export class Encryption {
    private static readonly algorithm = 'aes-256-gcm'

    private static getKey () {
        // Unified APP_KEY, with backward-compatible fallback to the legacy
        // TWO_FACTOR_ENCRYPTION_KEY variable.
        const secret = appKey('TWO_FACTOR_ENCRYPTION_KEY')

        if (!secret) {
            throw new Error('APP_KEY is required to use two-factor authentication. Run `ark key:generate`.')
        }

        return createHash('sha256').update(secret).digest()
    }

    static encrypt (value: string) {
        const iv = randomBytes(12)
        const cipher = createCipheriv(this.algorithm, this.getKey(), iv)
        const ciphertext = Buffer.concat([
            cipher.update(value, 'utf8'),
            cipher.final(),
        ])
        const authTag = cipher.getAuthTag()

        return [iv, authTag, ciphertext].map((part) => part.toString('base64url')).join(':')
    }

    static decrypt (payload: string) {
        const [iv, authTag, ciphertext] = payload.split(':')

        if (!iv || !authTag || !ciphertext) {
            throw new Error('Invalid encrypted payload format')
        }

        const decipher = createDecipheriv(
            this.algorithm,
            this.getKey(),
            Buffer.from(iv, 'base64url'),
        )

        decipher.setAuthTag(Buffer.from(authTag, 'base64url'))

        const plaintext = Buffer.concat([
            decipher.update(Buffer.from(ciphertext, 'base64url')),
            decipher.final(),
        ])

        return plaintext.toString('utf8')
    }
}