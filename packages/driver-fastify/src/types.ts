import type {
  FastifyError,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyRegisterOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import type { ArkstackMiddlewareConfig, PromiseOrValue } from '@arkstack/contract'

import type { ClassMiddleware } from 'clear-router/types/basic'

/**
 * A Fastify hook handler, in async `(req, reply)` or callback `(req, reply, done)` form.
 */
export type FastifyMiddleware =
  | ((req: FastifyRequest, reply: FastifyReply) => PromiseOrValue<unknown>)
  | ((req: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => void)

export type Middleware = FastifyMiddleware | ClassMiddleware<FastifyMiddleware>

export type MiddlewareConfig = ArkstackMiddlewareConfig<Middleware>

export type FastifyErrorHandler = (
  error: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
) => PromiseOrValue<unknown>

/**
 * A Fastify plugin with its options, registered when the app is created.
 * Options can be a function, which Fastify calls when it loads the plugin.
 */
export type FastifyPluginEntry =
  | FastifyPluginAsync<any>
  | FastifyPluginCallback<any>
  | [FastifyPluginAsync<any> | FastifyPluginCallback<any>, FastifyRegisterOptions<any>]

export interface FastifyDriverOptions {
  bindRouter: (app: FastifyInstance) => PromiseOrValue<void>
  createApp?: () => FastifyInstance
  mountPublicAssets?: (app: FastifyInstance, publicPath: string) => PromiseOrValue<void>
  errorHandler?: FastifyErrorHandler
  plugins?: FastifyPluginEntry[]
}

/**
 * A file read from a multipart request, shaped like a multer file.
 */
export interface UploadedFile {
  buffer: Buffer
  encoding: string
  fieldname: string
  mimetype: string
  originalname: string
  size: number
}
