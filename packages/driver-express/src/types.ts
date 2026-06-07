import type { ArkstackMiddlewareConfig } from '@arkstack/contract'
import { ClassMiddleware } from 'clear-router/types/basic'
import type { Handler } from 'express'

export type Middleware = Handler | ClassMiddleware<Handler>

export type MiddlewareConfig = ArkstackMiddlewareConfig<Middleware>;
