import type { Handler, NextFunction, Request, Response } from 'express'

import { Hook } from '@arkstack/foundry'

export const auth: Handler = async (req, res, next) => {
  const { Auth, AuthenticationException } = await import('@arkstack/auth')

  try {
    await Hook.emit('middleware:auth', 'before', { req, res })

    const token = readBearerToken(req.headers.authorization)

    if (!token) {
      throw new AuthenticationException('Unauthenticated', {
        req,
        status: 401,
      })
    }

    const auth = Auth.make().setRequest(req)
    const user = await auth.authorizeToken(token)

    req.user = user
    req.auth = auth
    req.authUser = user
    req.session = auth.session()
    req.authToken = token

    await Hook.emit('middleware:auth', 'after', { req, res })

    next()
  } catch (error) {
    await Hook.emit('middleware:auth', 'error', error, { req, res })

    next(error)
  }
}

export class AuthMiddleware {
  handler(req: Request, res: Response, next: NextFunction) {
    return auth(req, res, next)
  }
}

const readBearerToken = (authorization: string | string[] | undefined) => {
  const value = Array.isArray(authorization) ? authorization[0] : authorization

  if (!value?.startsWith('Bearer ')) {
    return null
  }

  return value.substring(7)
}
