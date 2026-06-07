import type { ArkstackMiddlewareConfig } from '@arkstack/contract'
import { ClassMiddleware } from 'clear-router/types/basic'
import type { H3Middleware } from '@arkstack/driver-h3'
import { Middleware as HMiddleware } from 'h3'

export type Middleware = HMiddleware | ClassMiddleware<HMiddleware>

export type MiddlewareConfig =
    | ArkstackMiddlewareConfig<Middleware>
    | ArkstackMiddlewareConfig<H3Middleware>