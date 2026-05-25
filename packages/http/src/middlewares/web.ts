import { getSessionDriver } from '../session/config'
import { ensureSession, registerResponseFlashSweep } from '../session/helpers'
import { Session } from '../session/Session'
import { isRecord } from '../helpers'

export const webMiddlewareKey = Symbol.for('arkstack:http:web')

const markWebRequest = (target: unknown) => {
    if (isRecord(target)) {
        target[webMiddlewareKey] = true
        target.arkstackWeb = true
    }
}

const startWebSession = async (args: any[]): Promise<Session | undefined> => {
    const [first, second, third] = args
    const context = typeof third === 'function'
        ? {
            ctx: { req: first, res: second },
            req: first,
            res: second,
        }
        : first

    if (!isRecord(context)) {
        return
    }

    const existingSession = context.httpSession
        || (context.session instanceof Session ? context.session : undefined)
        || (isRecord(context.req) ? context.req.httpSession : undefined)
        || (isRecord(context.context) ? context.context.httpSession : undefined)

    if (existingSession instanceof Session) {
        return existingSession
    }

    const persistent = await getSessionDriver().start(context)

    return ensureSession(context, persistent.state, persistent)
}

export const web = async (...args: any[]) => {
    const [first, second, third] = args

    markWebRequest(first)
    markWebRequest(first?.context)
    markWebRequest(first?.req)

    if (isRecord(second)) {
        markWebRequest(second)
    }

    const session = await startWebSession(args)

    if (typeof third === 'function') {
        registerResponseFlashSweep({ res: second }, session)

        return third()
    }

    if (typeof second === 'function') {
        const result = await second()

        await session?.sweepFlash()

        return result
    }
}

export const isWebRequest = (target: unknown): boolean => {
    if (!isRecord(target)) {
        return false
    }

    return target[webMiddlewareKey] === true
        || target.arkstackWeb === true
        || isWebRequest(target.context)
        || isWebRequest(target.req)
}
