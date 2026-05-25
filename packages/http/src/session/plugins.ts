import { attachViewState, ensureSession, registerResponseFlashSweep } from './helpers'

import { HttpContext } from '../types/Http'
import { Session } from './Session'
import { definePlugin as defineClearRouterPlugin } from 'clear-router/core'
import { definePlugin as defineKanunPlugin } from 'kanun'
import { getSessionDriver } from './config'

export const arkstackHttpPlugin = defineClearRouterPlugin<any, HttpContext>({
    name: 'arkstack-http',
    setup: ({ bind, useHttpContext }) => {
        bind(Session, ({ ctx }: { ctx: HttpContext }) => ensureSession(ctx))

        useHttpContext(async (context) => {
            globalThis.request = (key?: string) => key
                ? context.request.input(key)
                : context.request

            const persistent = await getSessionDriver().start(context)
            const session = ensureSession(context.ctx, persistent.state, persistent)

            context.httpSession = session

            if (!('session' in context) || context.session instanceof Session) {
                context.session = session
            }
            context.errors = session.errors
            attachViewState(context, session)
            registerResponseFlashSweep(context, session)
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