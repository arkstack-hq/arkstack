import { Hash, env, getModel } from '@arkstack/common'
import { JWTPayload, SignJWT, jwtVerify } from 'jose'

import { AuthContract } from './Contracts/AuthContract'
import { AuthenticationException } from './Exceptions/AuthenticationException'
import { AuthSession } from './AuthSession'
import type { PersonalAccessToken } from '@app/models/PersonalAccessToken'
import { Request, type RequestSource } from '@arkstack/http'
import { SessionDevice } from './SessionDevice'
import type { User } from '@app/models/User'

/**
 * The Auth class provides methods for user authentication, including verifying 
 * credentials, logging in, logging out, and managing personal access tokens. 
 * 
 * @author Legacy (3m1n3nc3)
 */
export class Auth extends AuthContract {
    protected static req?: Request<User>
    private configuredSecret?: string
    #user: User | null = null

    constructor(secret?: string, req?: Request<User> | RequestSource<User>) {
        super()
        Auth.req = Request.from<User>(req)
        this.configuredSecret = secret
    }

    /**
     * Create a new instance of the Auth class with an optional secret for JWT 
     * signing and verification.
     * 
     * @param secret    The secret key used for signing and verifying JWTs.
     * @returns         A new instance of the Auth class.
     */
    static make (secret?: string) {
        return new Auth(secret)
    }

    /**
     * Set the current HTTP request instance being processed.
     * 
     * @param req   The HTTP request instance to be set.
     * @returns     The Auth class itself for method chaining.
     */
    static setRequest (req: Request<User> | RequestSource<User>) {
        this.req = Request.from<User>(req)

        return this
    }

    /**
     * Set the current HTTP request instance being processed.
     * 
     * @param req   The HTTP request instance to be set.
     * @returns     The Auth instance itself for method chaining.
     */
    setRequest (req: Request<User> | RequestSource<User>) {
        Auth.req ??= Request.from<User>(req)

        return this
    }

    /**
     * Get the current HTTP request instance being processed, which may contain
     * user information and other request-specific data relevant to authentication operations.
     * 
     * @returns The current HTTP request instance or undefined if not set.
     */
    getRequest (): Request<User> | undefined {
        return Auth.req
    }

    /**
     * Get the currently authenticated user
     * 
     * @returns The currently authenticated user or null if not authenticated.
     */
    user (): User | null {
        return this.#user
    }

    /**
     * Verify user credentials
     * 
     * @param email     The email address of the user.
     * @param password  The password of the user.
     * @returns         A boolean indicating whether the credentials are valid.
     */
    async verify (email: string, password: string): Promise<boolean> {
        const user = await (await getModel<typeof User>('User')).query().where({ email }).first()

        return !!user && await Hash.verify(password, user.password)
    }

    /**
     * Attempt to authenticate a user with the given email and password.
     * 
     * @param email 
     * @param password 
     * @returns 
     */
    async attempt (email: string, password: string): Promise<User> {
        const user = await (await getModel<typeof User>('User')).query().where({ email }).first()

        if (!user) {
            throw new AuthenticationException('User account not found', { req: Auth.req, status: 422, errors: { email: ['No account found for this email address'] } })
        }

        const isValid = await Hash.verify(password, user.password)

        if (!isValid) {
            throw new AuthenticationException('Invalid credentials', { req: Auth.req, status: 422, errors: { password: ['Invalid password'] } })
        }

        this.setAuthenticated(user)

        return user
    }

    /**
     * Login a user and create a personal access token
     * 
     * @param email 
     * @param password 
     * @returns 
     */
    async login (email: string, password: string): Promise<PersonalAccessToken> {
        const user = await this.attempt(email, password)

        return await this.create(user)
    }

    /**
     * Create a temporary token for a user with a specific purpose, such as
     * two-factor authentication.
     * 
     * @param user 
     * @param purpose 
     * @param expiresIn 
     * @returns 
     */
    async createTemporaryToken (user: User, purpose: string, expiresIn: string = '10m'): Promise<string> {
        return await this.createJWT({
            sub: user.id.toString(),
            email: user.email,
            purpose,
        }, expiresIn)
    }

    /**
     * Authorize a temporary token and return the associated user if the token is 
     * valid and matches the expected purpose.
     * 
     * @param token 
     * @param purpose 
     * @returns 
     */
    async authorizeTemporaryToken (token: string, purpose: string): Promise<User> {
        const payload = await this.verifyJWT(token)

        if (!payload || payload.purpose !== purpose || !payload.sub) {
            throw new AuthenticationException(
                'Invalid or expired two-factor session',
                { req: Auth.req, status: 401 }
            )
        }

        const user = await (await getModel<typeof User>('User')).query().find(payload.sub)

        if (!user) {
            throw new AuthenticationException(
                'User account not found',
                { req: Auth.req, status: 401 }
            )
        }

        this.setAuthenticated(user, token)

        return user
    }

    /**
     * Logout the currently authenticated user and delete all their personal access tokens
     * 
     * @param token 
     * @returns 
     */
    async logout (token?: string | PersonalAccessToken): Promise<void> {
        if (!this.#user && !token) {
            return
        }

        if (token) {
            if (typeof token === 'string') {
                const TokenModel = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')

                await TokenModel.query().where({ token }).delete()
            } else {
                await token.delete()
            }
        } else {
            const TokenModel = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')

            await TokenModel.query().where({ userId: this.#user!.id }).delete()
        }

        this.#user = null

        if (Auth.req?.auth === this) {
            Auth.req.clearAuthentication()
        }
    }

    /**
     * Check if the user is authenticated
     * 
     * @returns 
     */
    async check (): Promise<boolean> {
        return !!this.#user
    }

    /**
     * Get the current session's personal access token
     * 
     * @returns 
     */
    session () {
        return new AuthSession(this)
    }

    /**
     * Create a personal access token for a user
     * 
     * @param user 
     * @returns 
     */
    async create (user: User): Promise<PersonalAccessToken> {
        const payload: JWTPayload = {
            sub: user.id.toString(),
            email: user.email,
        }

        const token = await this.createJWT(payload)
        const deviceInfo = SessionDevice.fromRequest(Auth.req)

        const pat = await this.upsertDeviceToken(user, token, deviceInfo)

        pat.setLoadedRelation('user', user)
        this.setAuthenticated(user, token)

        return pat
    }

    /**
     * Create or replace the personal access token for the same user and device
     * while keeping a single active session record for that device.
     *
     * @param user The authenticated user.
     * @param token The new bearer token to persist.
     * @param deviceInfo The current request's device information.
     */
    private async upsertDeviceToken (user: User, token: string, deviceInfo: Record<string, unknown> | null) {
        const TokenModel = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')
        const deviceKey = SessionDevice.getUniqueKey(deviceInfo)
        const payload = {
            abilities: [],
            token,
            name: SessionDevice.getDisplayName(deviceInfo),
            userId: user.id,
            lastUsedAt: new Date(),
        } as {
            abilities: string[]
            token: string
            name: string
            userId: User['id']
            deviceInfo?: Record<string, unknown> | null
            lastUsedAt: Date
        }

        if (!deviceKey) {
            return await TokenModel.query().create(payload)
        }

        payload.deviceInfo = deviceInfo

        const existingSessions = (await TokenModel.query().where({ userId: user.id }).get()).all()
        const matchingSessions = existingSessions
            .filter((session) => SessionDevice.matches(session.deviceInfo, deviceInfo))
            .sort((left, right) => {
                const leftTime = (left.lastUsedAt ?? left.createdAt).getTime()
                const rightTime = (right.lastUsedAt ?? right.createdAt).getTime()

                return rightTime - leftTime
            })

        if (matchingSessions.length < 1) {
            return await TokenModel.query().create(payload)
        }

        const [session, ...duplicateSessions] = matchingSessions

        if (duplicateSessions.length > 0) {
            await Promise.all(duplicateSessions.map(async (session) => await session.delete()))
        }

        await TokenModel.query().where({ id: session.id }).update(payload)

        session.token = payload.token
        session.name = payload.name
        session.userId = payload.userId as never
        session.deviceInfo = payload.deviceInfo
        session.lastUsedAt = payload.lastUsedAt

        return session
    }

    /**
     * Authorize a token and return the associated user
     * 
     * @param token 
     * @returns 
     */
    async authorizeToken (token: string): Promise<User> {
        const payload = await this.verifyJWT(token)

        if (!payload) {
            throw new AuthenticationException(
                'Invalid or expired session',
                { req: Auth.req, status: 401 }
            )
        }

        const TokenModel = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')
        const pat = await TokenModel.query().where({ token }).first()

        if (!pat) {
            throw new AuthenticationException(
                'Invalid or expired access token',
                { req: Auth.req, status: 401 }
            )
        }

        const user = await (await getModel<typeof User>('User')).query().find(payload.sub!)

        if (!user) {
            throw new AuthenticationException(
                'User account not found',
                { req: Auth.req, status: 401 }
            )
        }

        void this.touchSession(pat).catch((error) => {
            if (env('NODE_ENV') === 'development') {
                console.error('Failed to update session activity', error)
            }
        })

        this.setAuthenticated(user, token)

        return user
    }

    /**
     * Create a JWT token
     * 
     * @param payload 
     * @returns 
     */
    private async createJWT (payload: JWTPayload, expiresIn: string = env('JWT_EXPIRES_IN', '1h')): Promise<string> {
        const jwt = await new SignJWT(payload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(new TextEncoder().encode(this.getSecret()))

        return jwt
    }

    /**
     * Verify a JWT token
     * 
     * @param token 
     * @returns 
     */
    private async verifyJWT (token: string): Promise<JWTPayload | null> {
        try {
            const { payload } = await jwtVerify(token, new TextEncoder().encode(this.getSecret()))

            return payload
        } catch {
            return null
        }
    }

    private getSecret (): string {
        return this.configuredSecret ?? env('JWT_SECRET', 'default_secret')
    }

    private setAuthenticated (user: User, token?: string) {
        this.#user = user
        Auth.req?.setAuthentication(this, user, token)
    }

    /**
     * Update the last used timestamp and device information of a personal 
     * access token to keep the session active and reflect the latest device details.
     * 
     * @param pat The personal access token to update.
     * @returns A promise that resolves when the update is complete.
     */
    private async touchSession (pat: PersonalAccessToken) {
        const now = new Date()
        const currentDeviceInfo = SessionDevice.fromRequest(Auth.req)
        const shouldUpdateLastUsedAt = !pat.lastUsedAt || (now.getTime() - pat.lastUsedAt.getTime()) > 5 * 60 * 1000
        const hasDeviceInfo = !!pat.deviceInfo
        const currentDisplayName = SessionDevice.getDisplayName(currentDeviceInfo)
        const storedDisplayName = SessionDevice.getDisplayName(pat.deviceInfo)
        const shouldRefreshDeviceInfo = !hasDeviceInfo || storedDisplayName !== currentDisplayName

        if (!shouldUpdateLastUsedAt && !shouldRefreshDeviceInfo) {
            return
        }

        const payload: {
            lastUsedAt: Date
            deviceInfo?: Record<string, unknown> | null
            name?: string
        } = {
            lastUsedAt: now,
        }

        if (shouldRefreshDeviceInfo) {
            payload.deviceInfo = currentDeviceInfo
            payload.name = currentDisplayName
        }

        const TokenModel = await getModel<typeof PersonalAccessToken>('PersonalAccessToken')

        await TokenModel.query().where({ id: pat.id }).update(payload)

        pat.lastUsedAt = now

        if (payload.deviceInfo !== undefined) {
            pat.deviceInfo = payload.deviceInfo
        }

        if (payload.name !== undefined) {
            pat.name = payload.name
        }
    }
}
