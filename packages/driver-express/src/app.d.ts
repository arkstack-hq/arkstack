import type { Request, Response } from 'express'

// Typed hook names are declared on @arkstack/foundry, which owns `Hook`.
declare module '@arkstack/foundry' {
  interface HookRegistry {
    'middleware:auth': {
      before: (ctx: { req: Request; res: Response }) => Promise<void>
      after: (ctx: { req: Request; res: Response }) => Promise<void>
      error: (error: unknown, ctx: { req: Request; res: Response }) => Promise<void>
    }
  }
}

declare global {
  var tunnelUrl: () => string
}
