import { attachViewState, ensureSession } from './helpers'

import { HttpContext } from '../types/Http'
import { Session } from './Session'
import { definePlugin } from 'clear-router/core'

export const clearRouterSessionPlugin = definePlugin<any, HttpContext>({
    name: 'arkstack-http-session',
    setup: ({ bind, useHttpContext }) => {
        bind(Session, ({ ctx }: { ctx: HttpContext }) => ensureSession(ctx))
        useHttpContext((context) => {
            const session = ensureSession(context.ctx)

            context.httpSession = session
            if (!('session' in context) || context.session instanceof Session) {
                context.session = session
            }
            context.errors = session.errors
            attachViewState(context, session)
        })
    },
})
