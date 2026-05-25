import { Session } from './Session'
import type { SessionInitialState } from './types'
import { isRecord } from '../helpers'
import { sessionKey } from './utils'

const attachSessionProperty = (target: Record<PropertyKey, any>, session: Session) => {
    target.httpSession = session

    if (!('session' in target) || target.session instanceof Session) {
        target.session = session
    }
}

export const attachViewState = (target: Record<PropertyKey, any>, session: Session) => {
    attachSessionProperty(target, session)
    target.errors = session.errors

    if (isRecord(target.res)) {
        target.res.locals = {
            ...(target.res.locals || {}),
            session,
            errors: session.errors,
        }
    }

    if (isRecord(target.response?.source)) {
        target.response.source.locals = {
            ...(target.response.source.locals || {}),
            session,
            errors: session.errors,
        }
    }

    if (isRecord(target.context)) {
        attachSessionProperty(target.context, session)
        target.context.errors = session.errors
    }

    if (isRecord(target.state)) {
        attachSessionProperty(target.state, session)
        target.state.errors = session.errors
    }

    if (typeof target.set === 'function') {
        target.set('session', session)
        target.set('errors', session.errors)
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
    persistent?: import('./types').SessionDriverResult
): Session => {
    if (!isRecord(ctx)) {
        return new Session(initial, persistent)
    }

    const existing = ctx[sessionKey] ?? (ctx.session instanceof Session ? ctx.session : undefined)
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

    const session = ctx[sessionKey] ?? ctx.session

    return session instanceof Session ? session : undefined
}