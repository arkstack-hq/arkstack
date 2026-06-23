import type { H3Event } from 'h3'

declare module '@arkstack/common' {
    interface HookRegistry {
        'middleware:auth': {
            before: (event: H3Event) => void
            after: (event: H3Event) => void
            error: (error: unknown, event: H3Event) => void
        }
    }
}

declare module '@arkstack/foundry' {
    interface HookRegistry {
        'middleware:auth': {
            before: (event: H3Event) => void
            after: (event: H3Event) => void
            error: (error: unknown, event: H3Event) => void
        }
    }
}

declare global {
    var tunnelUrl: () => string
}