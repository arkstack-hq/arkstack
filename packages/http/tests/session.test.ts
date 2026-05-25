import { CookieSessionDriver, DatabaseSessionDriver, ErrorBag, FlashBag, FileSessionDriver, Request, Response, Session, ensureSession, kanunSessionPlugin, old, redirect, registerResponseFlashSweep } from '../src'
import { describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'

import { CoreRouter } from 'clear-router/core'
import { DB } from 'arkormx'
import { Validator } from 'kanun'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const makeCookieContext = (cookie?: string) => {
    const headers: Record<string, any> = {}
    const source = {
        headers,
        setHeader: (name: string, value: string | string[]) => {
            headers[name.toLowerCase()] = value
        },
        getHeader: (name: string) => headers[name.toLowerCase()],
        end: () => undefined,
    }

    return {
        ctx: {
            req: {
                headers: cookie ? { cookie } : {},
            },
            res: source,
        },
        response: new Response({ source }),
        source,
        get cookie () {
            const value = headers['set-cookie']
            const first = Array.isArray(value) ? value[value.length - 1] : value

            return first?.split(';')[0]
        },
    }
}

describe('HTTP Session', () => {
    it('stores regular and validation errors in a view-friendly error bag', () => {
        const errors = new ErrorBag()
            .add('email', 'Email is required')
            .validation({
                issues: [
                    { path: ['profile', 'name'], message: 'Name is required' },
                    { field: 'password', message: 'Password is too short' },
                ],
            })

        expect(errors.first('email')).toBe('Email is required')
        expect(errors.get('profile.name')).toEqual(['Name is required'])
        expect(errors.has('password')).toBe(true)
        expect(errors.toJSON()).toEqual({
            email: ['Email is required'],
            'profile.name': ['Name is required'],
            password: ['Password is too short'],
        })
    })

    it('normalizes Kanun validator message bags and validation exceptions', () => {
        const messageBag = {
            getMessages: () => ({
                email: ['The email field is required.'],
                password: ['The password must be at least 8 characters.'],
            }),
        }

        const validationException = Object.assign(new Error('The given data was invalid.'), {
            errors: () => ({
                name: ['The name field is required.'],
            }),
        })

        const errors = new ErrorBag()
            .validation(messageBag)
            .validation(validationException)

        expect(errors.keys()).toEqual(['email', 'password', 'name'])
        expect(errors.first('email')).toBe('The email field is required.')
        expect(errors.get('name')).toEqual(['The name field is required.'])
        expect(errors.all()).toEqual([
            'The email field is required.',
            'The password must be at least 8 characters.',
            'The name field is required.',
        ])
        expect(errors.hasAny(['missing', 'password'])).toBe(true)
        expect(errors.missing('missing')).toBe(true)
        expect(errors.toArray()).toEqual(errors.getMessages())
    })

    it('sweeps loaded flash data while keeping new flash data for the next request', async () => {
        const session = new Session({
            flash: { notice: 'Saved' },
            errors: { email: ['Email is required'] },
        })

        expect(session.getFlash('notice')).toBe('Saved')
        expect(session.errors.first('email')).toBe('Email is required')

        session.flash('next', 'Queued')
        session.addError('password', 'Password is required')
        await session.sweepFlash()

        expect(session.getFlash('notice')).toBeUndefined()
        expect(session.getFlash('next')).toBe('Queued')
        expect(session.errors.first('email')).toBe('')
        expect(session.errors.first('password')).toBe('Password is required')
        expect(session.flashBag).toBeInstanceOf(FlashBag)
        expect(session.errors).toBeInstanceOf(FlashBag)
    })

    it('keeps session data and validation errors together', () => {
        const session = new Session({ data: { intended: '/dashboard' } })
            .addValidationErrors({
                errors: {
                    email: ['Email is invalid'],
                },
            })

        expect(session.get('intended')).toBe('/dashboard')
        expect(session.hasErrors('email')).toBe(true)
        expect(session.forView().errors.first('email')).toBe('Email is invalid')
    })

    it('attaches session and errors to http contexts for views', () => {
        const ctx: any = {
            res: {
                locals: {
                    title: 'Welcome',
                },
            },
        }

        const session = ensureSession(ctx)
        session.addError('email', 'Email is required')

        expect(ctx.session).toBe(session)
        expect(ctx.errors).toBe(session.errors)
        expect(ctx.res.locals.title).toBe('Welcome')
        expect(ctx.res.locals.session).toBe(session)
        expect(ctx.res.locals.errors.first('email')).toBe('Email is required')
        expect(ensureSession(ctx)).toBe(session)
    })

    it('does not overwrite an existing non-http session property', () => {
        const existingSession = { type: 'auth' }
        const ctx: any = { session: existingSession }

        const session = ensureSession(ctx)

        expect(ctx.session).toBe(existingSession)
        expect(ctx.httpSession).toBe(session)
        expect(ctx.errors).toBe(session.errors)
    })

    it('normalizes full Kanun validators into field errors', async () => {
        const validator = Validator.make({ email: '' }, { email: 'required|email' })

        await expect(validator.passes()).resolves.toBe(false)

        const errors = new ErrorBag().validation(validator)

        expect(errors.has('email')).toBe(true)
        expect(errors.first('email')).toBe('The email field is required.')
        expect(errors.toJSON()).toEqual({
            email: ['The email field is required.'],
        })
    })

    it('fills the current session when Kanun validation fails', async () => {
        await import('../src/setup')

        const ctx: any = {
            clearRequest: new Request(),
            clearResponse: new Response({ source: { locals: {} } }),
        }

        await (CoreRouter as any).resolvePluginHttpCtx(ctx)

        const validator = Validator.make({ email: '' }, { email: 'required|email' })

        await expect(validator.passes()).resolves.toBe(false)

        expect(ctx.session.errors.first('email')).toBe('The email field is required.')
        expect(ctx.errors.first('email')).toBe('The email field is required.')
        expect(ctx.clearResponse.source.locals.errors.first('email')).toBe('The email field is required.')
    })

    it('does not fail Kanun validation hooks when no request session exists', async () => {
        const originalSession = globalThis.session
        let hook: ((validator: any) => void | Promise<void>) | undefined

        try {
            delete (globalThis as any).session
            kanunSessionPlugin.install({
                onValidationError (callback: any) {
                    hook = callback
                },
            } as any)

            const validator = Validator.make({ email: '' }, { email: 'required|email' })
            await validator.passes()

            expect(hook).toBeTypeOf('function')
            await hook!(validator)
        } finally {
            if (originalSession) {
                globalThis.session = originalSession
            } else {
                delete (globalThis as any).session
            }
        }
    })

    it('clears flashed cookie errors when the response ends', async () => {
        const driver = new CookieSessionDriver({ secret: 'test-secret', cookie: 'ark_test' })
        const first = makeCookieContext()
        const firstState = await driver.start(first)
        const firstSession = new Session(firstState.state, firstState)

        firstSession.addError('email', 'Email is required')
        await firstSession.save()

        const second = makeCookieContext(first.cookie)
        const secondState = await driver.start(second)
        const secondSession = new Session(secondState.state, secondState)

        expect(secondSession.errors.first('email')).toBe('Email is required')

        registerResponseFlashSweep(second, secondSession)
        second.source.end()
        await new Promise(resolve => setTimeout(resolve, 0))

        const third = makeCookieContext(second.cookie)
        const thirdState = await driver.start(third)
        const thirdSession = new Session(thirdState.state, thirdState)

        expect(thirdSession.errors.toJSON()).toEqual({})
    })

    it('persists cookie sessions across loads and keeps devices isolated', async () => {
        const driver = new CookieSessionDriver({ secret: 'test-secret', cookie: 'ark_test' })
        const first = makeCookieContext()
        const firstState = await driver.start(first)
        const firstSession = new Session(firstState.state, firstState)

        firstSession.put('notice', 'Saved')
        firstSession.addError('email', 'Email is required')
        await firstSession.save()

        const second = makeCookieContext(first.cookie)
        const secondState = await driver.start(second)
        const secondSession = new Session(secondState.state, secondState)
        const otherDevice = makeCookieContext()
        const otherState = await driver.start(otherDevice)
        const otherSession = new Session(otherState.state, otherState)

        expect(secondSession.id).toBe(firstSession.id)
        expect(secondSession.get('notice')).toBe('Saved')
        expect(secondSession.errors.first('email')).toBe('Email is required')
        expect(otherSession.id).not.toBe(firstSession.id)
        expect(otherSession.get('notice')).toBeUndefined()
    })

    it('persists file sessions server-side with a signed per-device cookie id', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'arkstack-session-'))
        const driver = new FileSessionDriver({ directory, secret: 'test-secret', cookie: 'ark_file' })

        try {
            const first = makeCookieContext()
            const firstState = await driver.start(first)
            const firstSession = new Session(firstState.state, firstState)

            firstSession.put('theme', 'dark')
            await firstSession.save()

            const second = makeCookieContext(first.cookie)
            const secondState = await driver.start(second)
            const secondSession = new Session(secondState.state, secondState)

            expect(secondSession.id).toBe(firstSession.id)
            expect(secondSession.get('theme')).toBe('dark')
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })

    it('persists database sessions with an opaque cookie id', async () => {
        try {
            const driver = new DatabaseSessionDriver({ secret: 'test-secret', cookie: 'ark_db' })
            const first = makeCookieContext()
            const firstState = await driver.start(first)
            const firstSession = new Session(firstState.state, firstState)

            firstSession.put('cart', ['book'])
            await firstSession.save()

            const second = makeCookieContext(first.cookie)
            const secondState = await driver.start(second)
            const secondSession = new Session(secondState.state, secondState)

            expect(secondSession.id).toBe(firstSession.id)
            expect(secondSession.get('cart')).toEqual(['book'])
        } finally {
            await DB.table('sessions').whereNotNull('id').delete()
        }
    })

    it('registers the clear-router session plugin through http setup', async () => {
        await import('../src/setup')

        const ctx: any = {
            clearRequest: new Request(),
            clearResponse: new Response({ source: { locals: {} } }),
        }

        await (CoreRouter as any).resolvePluginHttpCtx(ctx)

        expect(ctx.session).toBeInstanceOf(Session)
        expect(ctx.errors).toBe(ctx.session.errors)
        expect(ctx.clearResponse.source.locals.session).toBe(ctx.session)
    })
    it('reads old input directly from the current request input', () => {
        new Request({
            body: {
                email: 'ada@example.com',
                profile: { name: 'Ada' },
            },
        })

        expect(old('email')).toBe('ada@example.com')
        expect(old('profile.name')).toBe('Ada')
        expect(old('missing', 'fallback')).toBe('fallback')
        expect(old()).toEqual({
            email: 'ada@example.com',
            profile: { name: 'Ada' },
        })
    })

    it('creates redirect responses using the current request as the back target', () => {
        new Request({
            headers: {
                referer: '/contact',
            },
        })
        const response = new Response()

        globalThis.response = () => response

        const redirected = redirect()

        expect(redirected.statusCode).toBe(302)
        expect(redirected.getHeaders().location).toBe('/contact')
        expect(redirected.body).toBeNull()
    })

})
