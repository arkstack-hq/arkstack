import { Auth } from './Auth'

/**
 * Create a new instance of the Auth class with an optional secret for JWT 
 * signing and verification.
 * 
 * @param secret — The secret key used for signing and verifying JWTs.
 * 
 * @returns — A new instance of the Auth class.
 */
export const auth = (secret?: string | undefined) => Auth.make(secret)