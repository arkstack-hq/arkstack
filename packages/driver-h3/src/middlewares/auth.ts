import type { H3Event } from 'h3'
import { Hook } from '@arkstack/common'

export const auth = async (event: H3Event, next: () => unknown | Promise<unknown>) => {
    const { Auth, AuthenticationException } = await import('@arkstack/auth')

    try {
        const token = readBearerToken(event.req.headers.get('authorization'))

        if (!token) {
            throw new AuthenticationException('Unauthenticated', {
                req: {
                    headers: event.req.headers,
                    method: event.req.method,
                    url: event.req.url,
                    path: getEventPath(event),
                },
                status: 401,
            })
        }

        if (Hook.has('middleware:auth', 'before'))
            Hook.get('middleware:auth', 'before')?.(event)

        const requestSource = {
            headers: event.req.headers,
            method: event.req.method,
            url: event.req.url,
            path: getEventPath(event),
        }
        const auth = Auth.make().setRequest(requestSource)
        const user = await auth.authorizeToken(token)

        event.context.user = user
        event.context.auth = auth
        event.context.session = auth.session()
        event.context.authUser = user
        event.context.authToken = token;
        (event.req as any).user = user;
        (event.req as any).auth = auth;
        (event.req as any).session = event.context.session;
        (event.req as any).authUser = user;
        (event.req as any).authToken = token

        if (Hook.has('middleware:auth', 'after'))
            Hook.get('middleware:auth', 'after')?.(event)

        return await next()
    } catch (error) {
        if (Hook.has('middleware:auth', 'error'))
            Hook.get('middleware:auth', 'error')?.(error, event)

        throw error
    }
}

const readBearerToken = (authorization: string | null) => {
    if (!authorization?.startsWith('Bearer ')) {
        return null
    }

    return authorization.substring(7)
}

const getEventPath = (event: H3Event) => event.req._url?.pathname
