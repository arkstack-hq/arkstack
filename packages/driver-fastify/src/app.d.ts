import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UploadedFile } from './types'

// Typed hook names are declared on @arkstack/foundry, which owns `Hook`.
declare module '@arkstack/foundry' {
  interface HookRegistry {
    'middleware:auth': {
      before: (ctx: { req: FastifyRequest; reply: FastifyReply }) => Promise<void>
      after: (ctx: { req: FastifyRequest; reply: FastifyReply }) => Promise<void>
      error: (error: unknown, ctx: { req: FastifyRequest; reply: FastifyReply }) => Promise<void>
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: any
    auth?: any
    authUser?: any
    authToken?: string | undefined
    session?: any
    rawBody?: Buffer
    uploads?: UploadedFile[]
  }
}

declare global {
  var tunnelUrl: () => string
}
