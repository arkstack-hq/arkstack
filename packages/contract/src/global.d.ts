import { Arkstack } from '.'

declare global {
  function app (): Arkstack<never, never>
  var arkctx: {
    runtime: 'CLI' | 'HTTP' | 'Worker'
    command?: string
  }
}