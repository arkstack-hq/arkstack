import { Arkstack } from '.'

declare global {
  function app (): Arkstack<never, never>
  var arkctx: {
    runtime: 'CLI' | 'HTTP' | 'Worker'
    command?: string
  }
}

declare module '@arkstack/common' {
  interface HookRegistry {
    'set:root-dir': {
      after: (dir: string) => void
    }
  }
}

declare module '@arkstack/foundry' {
  interface HookRegistry {
    'set:root-dir': {
      after: (dir: string) => void
    }
  }
}