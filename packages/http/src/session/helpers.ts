import type { SessionDriverResult, SessionInitialState } from './types'

import { Session } from './Session'
import { isRecord } from '../helpers'
import { sessionKey } from './utils'
import { old } from '../old'

const sweepRegisteredKey = Symbol.for('arkstack:http:flash-sweep-registered')

const attachSessionProperty = (target: Record<PropertyKey, any>, session: Session) => {
    target.httpSession = session

    if (!('session' in target) || target.session instanceof Session) {
        target.session = session
    }
}

const responseSource = (target: Record<PropertyKey, any>) => {
    return target.res
        ?? target.ctx?.res
        ?? target.response?.source
        ?? target.clearResponse?.source
        ?? target.context?.res
        ?? target.context?.response?.source
}

export const registerResponseFlashSweep = (target: unknown, session?: Session) => {
    if (!isRecord(target)) {
        return
    }

    const current = session ?? getSession(target)
    const res = responseSource(target)

    if (!(current instanceof Session) || !isRecord(res) || typeof res.end !== 'function' || res[sweepRegisteredKey]) {
        return
    }

    res[sweepRegisteredKey] = true
    const end = res.end.bind(res)

    res.end = (...args: any[]) => {
        void current.sweepFlash()
            .catch(() => undefined)
            .finally(() => end(...args))

        return res
    }
}

export const attachViewState = (target: Record<PropertyKey, any>, session: Session) => {
    attachSessionProperty(target, session)
    target.errors = session.errors

    if (isRecord(target.req)) {
        attachSessionProperty(target.req, session)
        target.req.errors = session.errors
        target.req.old = old
    }

    if (isRecord(target.res)) {
        target.res.locals = {
            ...(target.res.locals || {}),
            session,
            errors: session.errors,
            flash: session.flashBag,
            old,
        }
    }

    if (isRecord(target.response?.source)) {
        target.response.source.locals = {
            ...(target.response.source.locals || {}),
            session,
            errors: session.errors,
            flash: session.flashBag,
            old,
        }
    }

    if (isRecord(target.context)) {
        attachSessionProperty(target.context, session)
        target.context.errors = session.errors
        target.context.flash = session.flashBag
        target.context.old = old
    }

    if (isRecord(target.state)) {
        attachSessionProperty(target.state, session)
        target.state.errors = session.errors
        target.state.flash = session.flashBag
        target.state.old = old
    }

    if (typeof target.set === 'function') {
        target.set('session', session)
        target.set('errors', session.errors)
        target.set('flash', session.flashBag)
        target.set('old', old)
    }
}

/**
 * Ensure a valid session exists
 * 
 * @param ctx 
 * @param initial 
 * @returns 
 */
export const ensureSession = (
    ctx: unknown,
    initial?: SessionInitialState | Record<string, any>,
    persistent?: SessionDriverResult
): Session => {
    if (!isRecord(ctx)) {
        return new Session(initial, persistent)
    }

    const existing = ctx[sessionKey]
        ?? (ctx.session instanceof Session ? ctx.session : undefined)
        ?? (isRecord(ctx.req) && ctx.req.httpSession instanceof Session ? ctx.req.httpSession : undefined)
    const session = existing instanceof Session
        ? existing
        : new Session(initial, persistent)

    ctx[sessionKey] = session
    attachViewState(ctx, session)

    return session
}

/**
 * Get the current session
 * 
 * @param ctx 
 * @returns 
 */
export const getSession = (ctx: unknown): Session | undefined => {
    if (!isRecord(ctx)) {
        return undefined
    }

    const session = ctx[sessionKey]
        ?? (ctx.httpSession instanceof Session ? ctx.httpSession : undefined)
        ?? (ctx.session instanceof Session ? ctx.session : undefined)
        ?? (isRecord(ctx.req) && ctx.req.httpSession instanceof Session ? ctx.req.httpSession : undefined)
        ?? (isRecord(ctx.context) && ctx.context.httpSession instanceof Session ? ctx.context.httpSession : undefined)

    return session instanceof Session ? session : undefined
}