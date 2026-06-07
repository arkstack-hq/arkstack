import { AuthSession } from '../AuthSession'
import type { PersonalAccessToken } from '@app/models/PersonalAccessToken'
import { Request, type RequestSource } from '@arkstack/http'
import type { User } from '@app/models/User'

/**
 * The Auth class provides methods for user authentication, including verifying 
 * credentials, logging in, logging out, and managing personal access tokens. 
 * 
 * @author Legacy (3m1n3nc3)
 */
export abstract class AuthContract {
    /**
     * Set the current HTTP request instance being processed.
     * 
     * @param req   The HTTP request instance to be set.
     * @returns     The Auth instance itself for method chaining.
     */
    abstract setRequest (req: Request<User> | RequestSource<User>): this

    /**
     * Get the current HTTP request instance being processed, which may contain
     * user information and other request-specific data relevant to authentication operations.
     * 
     * @returns The current HTTP request instance or undefined if not set.
     */
    abstract getRequest (): Request<User> | undefined

    /**
     * Get the currently authenticated user
     * 
     * @returns The currently authenticated user or null if not authenticated.
     */
    abstract user (): User | null

    /**
     * Verify user credentials
     * 
     * @param email     The email address of the user.
     * @param password  The password of the user.
     * @returns         A boolean indicating whether the credentials are valid.
     */
    abstract verify (email: string, password: string): Promise<boolean>

    /**
     * Attempt to authenticate a user with the given email and password.
     * 
     * @param email 
     * @param password 
     * @returns 
     */
    abstract attempt (email: string, password: string): Promise<User>

    /**
     * Login a user and create a personal access token
     * 
     * @param email 
     * @param password 
     * @returns 
     */
    abstract login (email: string, password: string): Promise<PersonalAccessToken>

    /**
     * Create a temporary token for a user with a specific purpose, such as
     * two-factor authentication.
     * 
     * @param user 
     * @param purpose 
     * @param expiresIn 
     * @returns 
     */
    abstract createTemporaryToken (user: User, purpose: string, expiresIn?: string): Promise<string>

    /**
     * Authorize a temporary token and return the associated user if the token is 
     * valid and matches the expected purpose.
     * 
     * @param token 
     * @param purpose 
     * @returns 
     */
    abstract authorizeTemporaryToken (token: string, purpose: string): Promise<User>

    /**
     * Logout the currently authenticated user and delete all their personal access tokens
     * 
     * @param token 
     * @returns 
     */
    abstract logout (token?: string | PersonalAccessToken): Promise<void>

    /**
     * Check if the user is authenticated
     * 
     * @returns 
     */
    abstract check (): Promise<boolean>

    /**
     * Get the current session's personal access token
     * 
     * @returns 
     */
    abstract session (): AuthSession

    /**
     * Create a personal access token for a user
     * 
     * @param user 
     * @returns 
     */
    abstract create (user: User): Promise<PersonalAccessToken>

    /**
     * Authorize a token and return the associated user
     * 
     * @param token 
     * @returns 
     */
    abstract authorizeToken (token: string): Promise<User>
}
