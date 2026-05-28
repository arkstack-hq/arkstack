import type { Request, Response } from 'express'

declare module '@arkstack/common' {
    interface HookRegistry {
        'middleware:auth': {
            before: (ctx: { req: Request, res: Response }) => Promise<void>
            after: (ctx: { req: Request, res: Response }) => Promise<void>
            error: (error: unknown, ctx: { req: Request, res: Response }) => Promise<void>
        }
    }
}

declare module '@arkstack/foundry' {
    interface HookRegistry {
        'middleware:auth': {
            before: (ctx: { req: Request, res: Response }) => Promise<void>
            after: (ctx: { req: Request, res: Response }) => Promise<void>
            error: (error: unknown, ctx: { req: Request, res: Response }) => Promise<void>
        }
    }
}