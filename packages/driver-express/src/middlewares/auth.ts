import { Auth, AuthenticationException } from '@arkstack/auth'

import type { Handler } from 'express'
import { Hook } from '@arkstack/common'

export const auth: Handler = async (req, res, next) => {
    try {
        if (Hook.has('middleware:auth', 'before'))
            Hook.get('middleware:auth', 'before')?.({ req, res })

        const token = readBearerToken(req.headers.authorization)

        if (!token) {
            throw new AuthenticationException('Unauthenticated', { req, status: 401 })
        }

        const auth = Auth.make().setRequest(req)
        const user = await Auth.make().setRequest(req).authorizeToken(token)

        req.user = user
        req.auth = auth
        req.authUser = user
        req.authToken = token

        if (Hook.has('middleware:auth', 'after'))
            Hook.get('middleware:auth', 'after')?.({ req, res })

        next()
    } catch (error) {
        if (Hook.has('middleware:auth', 'error'))
            Hook.get('middleware:auth', 'error')?.(error, { req, res })

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
