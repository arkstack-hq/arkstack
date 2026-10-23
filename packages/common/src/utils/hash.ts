import { Secret, TOTP } from 'otpauth'
import { appKey, env } from '../system'
import { compare, genSalt, hash } from 'bcryptjs'

import { createHmac } from 'node:crypto'

export class Hash {
  /**
   * Hash a value using bcrypt
   *
   * @param value
   * @returns
   */
  static async make(value: string): Promise<string> {
    const salt = await genSalt(10)

    return await hash(value, salt)
  }

  /**
   * Verify a value against a hashed value
   *
   * @param value
   * @param hashedValue
   * @returns
   */
  static async verify(value: string, hashedValue: string): Promise<boolean> {
    return await compare(value, hashedValue)
  }

  /**
   * Generate a one-time password (OTP) using TOTP algorithm
   *
   * @param digits    The number of digits for the OTP, default is 6.
   * @param label     A label to identify the OTP, can be an email or phone number.
   * @param period    Interval of time for which a token is valid, in seconds.
   * @returns
   */
  static otp(digits: number = 6, label: string = 'Alice', period: number = 30) {
    return new TOTP({
      label,
      digits,
      issuer: env('APP_NAME', 'Roseed'),
      algorithm: 'SHA1',
      period, // in seconds.
      secret: Hash.otpSecret(label),
    })
  }

  /**
   * The OTP secret for a label, derived from the application key so codes
   * differ per label and cannot be computed without the key.
   *
   * @param label
   * @returns
   */
  private static otpSecret(label: string): Secret {
    const key = appKey()
    if (!key) throw new Error('APP_KEY is required to generate one-time passwords. Run `ark key:generate`.')

    const digest = createHmac('sha256', key).update(`otp:${label}`).digest()

    return new Secret({ buffer: new Uint8Array(digest).buffer })
  }

  static totp(secret: string, label: string, issuer: string = env('APP_NAME', 'Roseed'), period: number = 30) {
    return new TOTP({
      issuer,
      label,
      algorithm: 'SHA1',
      digits: 6,
      period,
      secret: Secret.fromBase32(secret),
    })
  }
}
