import type { H3Event } from 'h3'

// Typed hook names are declared on @arkstack/foundry, which owns `Hook`.
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
