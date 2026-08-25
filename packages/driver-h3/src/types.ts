import type { ArkstackMiddlewareConfig, PromiseOrValue } from '@arkstack/contract'
import type { H3, H3Event, Middleware as HMiddleware } from 'h3'

import type { ClassMiddleware } from 'clear-router/types/basic'
import type { Middleware as H3BaseMiddleware } from 'clear-router/types/h3'

export type Middleware = HMiddleware | ClassMiddleware<HMiddleware>

export type MiddlewareConfig =
    | ArkstackMiddlewareConfig<Middleware>
    | ArkstackMiddlewareConfig<H3Middleware>

export type H3Middleware = H3BaseMiddleware | [H3BaseMiddleware, Record<string, any>];

export interface H3DriverOptions {
    bindRouter: (app: H3) => PromiseOrValue<void>;
    mountPublicAssets?: (app: H3, publicPath: string) => PromiseOrValue<void>;
    createApp?: () => H3;
    onError?: (err: Error | string, event: H3Event) => unknown;
}