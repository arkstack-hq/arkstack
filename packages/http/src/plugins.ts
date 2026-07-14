import { Request, setRequestResolver } from './Request'
import { Response, setResponseResolver } from './Response'
import { Session, clearFallbackSession, setSessionResolver } from './session/Session'
import { attachViewState, ensureSession, getSession, registerResponseFlashSweep } from './session/helpers'

import { ClearHttpContext } from 'clear-router'
import { definePlugin as defineClearRouterPlugin } from 'clear-router/core'
import { definePlugin as defineKanunPlugin } from 'kanun'
import { getSessionDriver } from './session/config'

const requestBindingKey = Symbol.for('arkstack:http:request')
const responseBindingKey = Symbol.for('arkstack:http:response')

export const arkstackHttpPlugin = defineClearRouterPlugin<any, ClearHttpContext>({
    name: 'arkstack-http',
    setup: ({ bind, getRequest, getResponse, useHttpContext }) => {
        setRequestResolver(() => {
            const request = getRequest()
            const bound = request?.ctx?.[requestBindingKey]

            return bound instanceof Request
                ? bound
                : request instanceof Request ? request : Request.from(request)
        })
        setResponseResolver(() => {
            const response = getResponse()
            const bound = getRequest()?.ctx?.[responseBindingKey]

            return bound instanceof Response
                ? bound
                : response instanceof Response ? response : Response.from(response as never)
        })
        setSessionResolver(() => {
            const request = getRequest()

            return getSession(request?.ctx ?? request)
        })

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
        }, { scope: 'request' })

        bind(Request, ({ request, ctx }: { request: Request, ctx: ClearHttpContext }) => {
            const httpContext = ctx as ClearHttpContext & Record<PropertyKey, any>
            const cached = httpContext[requestBindingKey]

            if (cached instanceof Request) {
                return cached
            }

            const current = request instanceof Request
                ? request
                : Request.from(request ?? ctx)!

            current.ctx = httpContext
            httpContext[requestBindingKey] = current
            httpContext.clearRequest = current

            return current.syncFromSource()
        }, { scope: 'request' })

        bind(Response, ({ response, ctx }: { response: Response, ctx: ClearHttpContext }) => {
            const httpContext = ctx as ClearHttpContext & Record<PropertyKey, any>
            const cached = httpContext[responseBindingKey]

            if (cached instanceof Response) {
                return cached
            }

            const current = response instanceof Response
                ? response
                : Response.from(response ?? ctx)!

            httpContext[responseBindingKey] = current
            httpContext.clearResponse = current

            return current
        }, { scope: 'request' })

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
                clearFallbackSession()
            }
        })
    },
})

export const kanunSessionPlugin = defineKanunPlugin({
    name: 'kanun-session-plugin',
    install({ onValidationError }) {
        onValidationError((validator) => {
            const currentSession: Session = globalThis.session?.() as never

            if (currentSession instanceof Session) {
                currentSession.addValidationErrors(validator)
            }
        })
    },
})
