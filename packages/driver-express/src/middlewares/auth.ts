import type { Handler, Request as ExpressRequest } from 'express'
import { Auth, AuthenticationException, type User } from '@arkstack/auth'

export type AuthenticatedExpressRequest<TUser extends User = User> = ExpressRequest & {
    user?: TUser;
    authUser?: TUser;
    authToken?: string;
}

export const auth: Handler = async (req, _res, next) => {
    try {
        const token = readBearerToken(req.headers.authorization)

        if (!token) {
            throw new AuthenticationException('Unauthenticated', { req, status: 401 })
        }

        const user = await Auth.make().setRequest(req).authorizeToken(token)
        const request = req as AuthenticatedExpressRequest

        request.user = user
        request.authUser = user
        request.authToken = token

        next()
    } catch (error) {
        next(error)
    }
}

const readBearerToken = (authorization: string | string[] | undefined) => {
    const value = Array.isArray(authorization) ? authorization[0] : authorization

    if (!value?.startsWith('Bearer ')) {
        return null
    }

    return value.substring(7)
}
