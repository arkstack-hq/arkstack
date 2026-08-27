import type { CipherOptions } from './types'

import { Cipher } from './Cipher'
import { EncryptionKey } from './EncryptionKey'
import { KeyPair } from './KeyPair'
import { SecureChannel } from './SecureChannel'

const PREFIX = 'ark1'

const CONTEXT = 'arkstack/sealed/v1'

/**
 * Anonymous encryption to a public key.
 *
 * The sender needs no identity of their own: a throwaway key pair is generated
 * per message, agreed with the recipient's public key over ECDH, and its public
 * half is carried in the payload so the recipient can reproduce the secret.
 * Only the holder of the matching private key can open the result — including
 * the sender, who cannot decrypt their own message afterwards.
 *
 * Payloads look like `ark1:<ephemeralPublicKey>:<iv>:<authTag>:<ciphertext>`.
 */
export class SealedBox {
    /** Payload discriminator. */
    static readonly prefix = PREFIX

    /**
     * Encrypt a message to a recipient's public key.
     *
     * @param message
     * @param recipientPublicKey
     * @param options
     * @returns
     */
    static async seal(
        message: string,
        recipientPublicKey: string | CryptoKey | KeyPair,
        options: CipherOptions = {},
    ): Promise<string> {
        const ephemeral = await KeyPair.generate()
        const recipient = await KeyPair.resolvePublic(recipientPublicKey)

        const ephemeralPublicKey = await ephemeral.exportPublicKey()

        const key = await this.derive(
            ephemeral,
            recipient,
            ephemeralPublicKey,
            await KeyPair.exportPublicKey(recipient),
        )

        return [PREFIX, ephemeralPublicKey, await new Cipher(key).encrypt(message, options)].join(':')
    }

    /**
     * Open a sealed payload with the recipient's private key.
     *
     * @param payload
     * @param recipientPrivateKey
     * @param options
     * @returns
     */
    static async open(
        payload: string,
        recipientPrivateKey: string | CryptoKey | KeyPair,
        options: CipherOptions = {},
    ): Promise<string> {
        const [prefix, ephemeralPublicKey, ...rest] = payload.split(':')

        if (prefix !== PREFIX || !ephemeralPublicKey || rest.length !== 3) {
            throw new Error('Invalid sealed payload format')
        }

        const recipient = recipientPrivateKey instanceof KeyPair
            ? recipientPrivateKey
            : await KeyPair.fromPrivateKey(recipientPrivateKey)

        if (!recipient.isComplete) {
            throw new Error('Opening a sealed payload requires the recipient private key')
        }

        const key = await this.derive(
            recipient,
            await KeyPair.importPublicKey(ephemeralPublicKey),
            ephemeralPublicKey,
            await recipient.exportPublicKey(),
        )

        return await new Cipher(key).decrypt(rest.join(':'), options)
    }

    /**
     * Whether a string is shaped like a sealed payload.
     *
     * @param value
     * @returns
     */
    static looksLikePayload(value: unknown): value is string {
        return typeof value === 'string'
            && value.startsWith(`${PREFIX}:`)
            && value.split(':').length === 5
    }

    /**
     * Derive the one-off message key. Both sides feed the same ordered pair of
     * public keys into the salt, so sender and recipient agree.
     *
     * @param owner              The side holding a private key.
     * @param peer               The other side's public key.
     * @param ephemeralPublicKey
     * @param recipientPublicKey
     * @returns
     */
    private static async derive(
        owner: KeyPair,
        peer: CryptoKey,
        ephemeralPublicKey: string,
        recipientPublicKey: string,
    ): Promise<EncryptionKey> {
        return await EncryptionKey.expand(
            await owner.sharedBits(peer),
            await SecureChannel.salt(ephemeralPublicKey, recipientPublicKey),
            CONTEXT,
        )
    }
}
