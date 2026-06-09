import { attachViewState, ensureSession, getSession, registerResponseFlashSweep } from './session/helpers'

import { ClearHttpContext } from 'clear-router'
import { Request } from './Request'
import { Session } from './session/Session'
import { definePlugin as defineClearRouterPlugin } from 'clear-router/core'
import { definePlugin as defineKanunPlugin } from 'kanun'
import { getSessionDriver } from './session/config'

export const arkstackHttpPlugin = defineClearRouterPlugin<any, ClearHttpContext>({
    name: 'arkstack-http',
    setup: ({ bind, useHttpContext }) => {
        bind(Session, async ({ ctx }: { ctx: ClearHttpContext }) => {
            const existing = getSession(ctx)

            if (existing) {
                return existing
            }

            const persistent = await getSessionDriver().start(ctx)
            const session = ensureSession(ctx, persistent.state, persistent)

            attachViewState(ctx, session)
            registerResponseFlashSweep(ctx, session)

            return session
        })

        bind(Request, ({ request, ctx }: { request: Request, ctx: ClearHttpContext }) => {
            const current = request instanceof Request
                ? request
                : Request.from(request ?? ctx)!

            return current.syncFromSource()
        })

        useHttpContext((context) => {
            const session = getSession(context.ctx)

            if (session) {
                context.httpSession = session

                if (!('session' in context) || context.session instanceof Session) {
                    context.session = session
                }

                context.errors = session.errors
                attachViewState(context.ctx, session)
                attachViewState(context, session)
                registerResponseFlashSweep(context, session)
            } else {
                delete (globalThis as Record<string, any>).session
            }

            globalThis.request = (key?: string) => key
                ? context.request.input(key)
                : context.request
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
