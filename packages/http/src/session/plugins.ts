import { attachViewState, ensureSession } from './helpers'

import { HttpContext } from '../types/Http'
import { Session } from './Session'
import { definePlugin as defineClearRouterPlugin } from 'clear-router/core'
import { definePlugin as defineKanunPlugin } from 'kanun'

export const clearRouterSessionPlugin = defineClearRouterPlugin<any, HttpContext>({
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

export const kanunSessionPlugin = defineKanunPlugin({
    name: 'kanun-session-plugin',
    install ({ onValidationError }) {
        onValidationError((validator) => {
            const currentSession: Session = globalThis.session?.() as never

            if (currentSession instanceof Session) {
                currentSession.addValidationErrors(validator)
            }
        })
    },
})