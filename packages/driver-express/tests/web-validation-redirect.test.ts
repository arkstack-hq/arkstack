import '../../http/src/setup'

import { arkstackHttpPlugin, decodeSessionPayload, decryptSessionValue, web } from '../../http/src'
import { describe, expect, it } from 'vitest'

import { Router as ClearRouter } from 'clear-router/express'
import { defaultErrorHandler } from '../src/error-handler'
import express from 'express'
import request from 'parasito'

const createRouter = (name: string) => class TestRouter extends ClearRouter {
    protected static routerStateNamespace = `express-web-validation:${name}`
}

void ClearRouter.use(arkstackHttpPlugin)

const validationError = () => Object.assign(new Error('The given data was invalid.'), {
    statusCode: 422,
    errors: () => ({
        email: ['The email field is required.'],
    }),
})

const captureCookie = (value: unknown, cookies: string[]) => {
    if (Array.isArray(value)) {
        cookies.push(...value.map(String))

        return
    }

    if (typeof value === 'string') {
        cookies.push(value)
    }
}

const cookiePayload = (cookie: string) => {
    const rawValue = cookie.split(';')[0]?.split('=').slice(1).join('=')
    const decoded = decryptSessionValue(decodeURIComponent(rawValue), 'arkstack-session-secret')

    return decodeSessionPayload<any>(decoded)
}

const sessionCookiesFromHeader = (header: string | null | undefined) => {
    return header?.split(/,\s*(?=arkstack_session=)/).filter(Boolean).map(part => part.trim().split(';')[0]) ?? []
}

const findErrorCookie = (cookies: string[]) => {
    return cookies.find((cookie) => cookiePayload(cookie)?.errors?.email?.[0] === 'The email field is required.')?.split(';')[0]
}

describe('Express web validation redirects', () => {
    it('does not create sessions for routes without web middleware', async () => {
        const app = express()
        const router = express.Router()
        const Router = createRouter('stateless')

        Router.get('/api/ping', (context) => {
            return context.res.status(200).json({
                hasSession: 'session' in context || 'httpSession' in context,
                hasErrors: 'errors' in context,
            })
        })

        Router.apply(router)
        app.use(router)

        const response = await request(app).get('/api/ping').expect(200)

        expect(response.body).toEqual({
            hasSession: false,
            hasErrors: false,
        })
        expect(response.headers.get('set-cookie')).toBeNull()
    })

    it('redirects web validation errors back and persists flashed errors', async () => {
        const app = express()
        const router = express.Router()
        const Router = createRouter('route')
        const cookies: string[] = []

        app.use(express.json())
        app.use((_req, res, next) => {
            const setHeader = res.setHeader.bind(res)

            res.setHeader = ((name: string, value: unknown) => {
                if (name.toLowerCase() === 'set-cookie') {
                    captureCookie(value, cookies)
                }

                return setHeader(name, value as never)
            }) as never

            next()
        })

        Router.post('/register', () => {
            throw validationError()
        }, [web])

        Router.get('/register', ({ req, res, errors }) => {
            return res.status(200).json({
                redirectedTo: req.path,
                email: errors.first('email'),
                all: errors.toJSON(),
            })
        }, [web])

        Router.get('/errors', ({ res, errors }) => {
            return res.status(200).json({
                email: errors.first('email'),
                all: errors.toJSON(),
            })
        }, [web])

        Router.apply(router)
        app.use(router)
        app.use(defaultErrorHandler)

        const response = await request(app)
            .post('/register')
            .set('referer', '/register')
            .set('accept', 'text/html')
            .send({ email: 'ada@example.com' })

        expect(response.status, response.text).toBe(200)
        expect(response.raw.redirects).toContainEqual(expect.stringContaining('/register'))
        expect(response.body.redirectedTo).toBe('/register')

        const cookie = findErrorCookie(cookies)
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
