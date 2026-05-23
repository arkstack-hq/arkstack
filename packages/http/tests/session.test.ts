import { ErrorBag, Request, Response, Session, ensureSession, kanunSessionPlugin } from '../src'
import { describe, expect, it } from 'vitest'

import { CoreRouter } from 'clear-router/core'
import { Validator } from 'kanun'

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
})
