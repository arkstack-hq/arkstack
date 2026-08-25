import type { ArkstackMiddlewareConfig, PromiseOrValue } from '@arkstack/contract'
import type { ErrorRequestHandler, Express, Handler } from 'express'

import { ClassMiddleware } from 'clear-router/types/basic'

export type Middleware = Handler | ClassMiddleware<Handler>

export type MiddlewareConfig = ArkstackMiddlewareConfig<Middleware>;

export interface ExpressDriverOptions {
    bindRouter: (app: Express) => PromiseOrValue<void>;
    mountPublicAssets?: (app: Express, publicPath: string) => PromiseOrValue<void>;
    errorHandler?: ErrorRequestHandler | Handler;
}
