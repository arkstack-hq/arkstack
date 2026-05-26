import '../../http/src/setup'

import { decodeSessionPayload, decryptSessionValue, web } from '../../http/src'
import { describe, expect, it } from 'vitest'

import { Router as ClearRouter } from 'clear-router/h3'
import { H3 } from 'h3'
import { defaultErrorHandler } from '../src/error-handler'
import request from 'parasito'

const createRouter = (name: string) => class TestRouter extends ClearRouter {
    protected static routerStateNamespace = `h3-web-validation:${name}`
}

const validationError = () => Object.assign(new Error('The given data was invalid.'), {
    statusCode: 422,
    errors: () => ({
        email: ['The email field is required.'],
    }),
})

const sessionCookiesFromHeader = (header: string | null | undefined) => {
    return header?.split(/,\s*(?=arkstack_session=)/).filter(Boolean).map(part => part.trim().split(';')[0]) ?? []
}

const cookiePayload = (cookie: string) => {
    const rawValue = cookie.split(';')[0]?.split('=').slice(1).join('=')
    const decoded = decryptSessionValue(decodeURIComponent(rawValue), 'arkstack-session-secret')

    return decodeSessionPayload<any>(decoded)
}

describe('H3 web validation redirects', () => {
    it('redirects web validation errors back and persists flashed errors', async () => {
        const app = new H3({
            silent: true,
            onError: defaultErrorHandler,
        })
        const Router = createRouter('route')

        Router.post('/register', () => {
            throw validationError()
        }, [web])

        Router.get('/errors', ({ errors }) => {
            return {
                email: errors.first('email'),
                all: errors.toJSON(),
            }
        }, [web])

        Router.apply(app)

        const response = await request(app)
            .post('/register')
            .set('referer', '/register')
            .set('accept', 'text/html')
            .send({ email: 'ada@example.com' })

        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe('/register')

        const cookie = sessionCookiesFromHeader(response.headers.get('set-cookie')).at(-1)
        expect(cookie).toEqual(expect.stringContaining('arkstack_session='))

        const errors = await request(app)
            .get('/errors')
            .set('Cookie', cookie)
            .expect(200)

        expect(errors.body.email).toBe('The email field is required.')
        expect(errors.body.all).toEqual({
            email: ['The email field is required.'],
        })

        const clearedCookies = sessionCookiesFromHeader(errors.headers.get('set-cookie'))
        const clearedCookie = clearedCookies.at(-1)

        expect(clearedCookies).toHaveLength(1)
        expect(clearedCookie).toEqual(expect.stringContaining('arkstack_session='))
        expect(cookiePayload(`${clearedCookie};` as string)?.errors).toEqual({})

        const swept = await request(app)
            .get('/errors')
            .set('Cookie', clearedCookie)
            .expect(200)

        expect(swept.body.email).toBe('')
        expect(swept.body.all).toEqual({})
    })
})