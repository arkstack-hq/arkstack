import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

type LaravelEncryptedPayload = {
    iv?: string
    value?: string
    mac?: string
    tag?: string
}

const keyFromSecret = (secret: string) => {
    if (secret.startsWith('base64:')) {
        const decoded = Buffer.from(secret.slice(7), 'base64')

        if (decoded.length === 32) {
            return decoded
        }
    }

    const raw = Buffer.from(secret, 'base64')

    if (raw.length === 32) {
        return raw
    }

    return createHash('sha256').update(secret).digest()
}

const macFor = (iv: string, value: string, key: Buffer) => {
    return createHmac('sha256', key).update(iv + value).digest('hex')
}

export const encryptSessionValue = (value: string, secret: string) => {
    const key = keyFromSecret(secret)
    const iv = randomBytes(16)
    const ivValue = iv.toString('base64')
    const cipher = createCipheriv('aes-256-cbc', key, iv)
    const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
    ]).toString('base64')
    const payload: LaravelEncryptedPayload = {
        iv: ivValue,
        value: encrypted,
        mac: macFor(ivValue, encrypted, key),
        tag: '',
    }

    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
}

export const decryptSessionValue = (payload: string | undefined, secret: string) => {
    if (!payload) {
        return undefined
    }

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as LaravelEncryptedPayload

        if (!decoded.iv || !decoded.value || !decoded.mac) {
            return undefined
        }

        const key = keyFromSecret(secret)
        const expected = macFor(decoded.iv, decoded.value, key)
        const actualBuffer = Buffer.from(decoded.mac)
        const expectedBuffer = Buffer.from(expected)

        if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
            return undefined
        }

        const decipher = createDecipheriv('aes-256-cbc', key, Buffer.from(decoded.iv, 'base64'))

        return Buffer.concat([
            decipher.update(Buffer.from(decoded.value, 'base64')),
            decipher.final(),
        ]).toString('utf8')
    } catch {
        return undefined
    }
}
