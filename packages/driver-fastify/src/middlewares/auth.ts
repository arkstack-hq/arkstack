import type { FastifyReply, FastifyRequest } from 'fastify'

import { Hook } from '@arkstack/foundry'

/**
 * Authorizes the request's bearer token and attaches the user, auth and
 * session to the request.
 *
 * @param req
 * @param reply
 */
export const auth = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { Auth, AuthenticationException } = await import('@arkstack/auth')

  try {
    await Hook.emit('middleware:auth', 'before', { req, reply })

    const token = readBearerToken(req.headers.authorization)

    if (!token) {
      throw new AuthenticationException('Unauthenticated', {
        req,
        status: 401,
      })
    }

    const auth = Auth.make().setRequest(req as never)
    const user = await auth.authorizeToken(token)

    req.user = user
    req.auth = auth
    req.authUser = user
    req.session = auth.session()
    req.authToken = token

    await Hook.emit('middleware:auth', 'after', { req, reply })
  } catch (error) {
    await Hook.emit('middleware:auth', 'error', error, { req, reply })

    throw error
  }
}

export class AuthMiddleware {
  handle(req: FastifyRequest, reply: FastifyReply) {
    return auth(req, reply)
  }
}

const readBearerToken = (authorization: string | undefined) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  return authorization.substring(7)
}
