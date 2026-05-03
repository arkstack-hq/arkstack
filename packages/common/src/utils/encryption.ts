import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

import { env } from '../system'

export class Encryption {
    private static readonly algorithm = 'aes-256-gcm'

    private static getKey () {
        const secret = env('TWO_FACTOR_ENCRYPTION_KEY')

        if (!secret) {
            throw new Error('TWO_FACTOR_ENCRYPTION_KEY is required to use two-factor authentication')
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