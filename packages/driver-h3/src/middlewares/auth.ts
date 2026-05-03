import type { H3Event } from 'h3'
import { Auth, AuthenticationException, type User } from '@arkstack/auth'

export type AuthenticatedH3Context<TUser extends User = User> = {
    user?: TUser;
    authUser?: TUser;
    authToken?: string;
}

export const auth = async (event: H3Event, next: () => unknown | Promise<unknown>) => {
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

    const requestSource = {
        headers: event.req.headers,
        method: event.req.method,
        url: event.req.url,
        path: getEventPath(event),
    }
    const user = await Auth.make().setRequest(requestSource).authorizeToken(token)
    const context = event.context as AuthenticatedH3Context

    context.user = user
    context.authUser = user
    context.authToken = token

    return await next()
}

const readBearerToken = (authorization: string | null) => {
    if (!authorization?.startsWith('Bearer ')) {
        return null
    }

    return authorization.substring(7)
}

const getEventPath = (event: H3Event) => event.req._url?.pathname
