import { ArkstackRouterAwareCore } from './index'

declare global {
  function app (): ArkstackRouterAwareCore<never, never>
  var arkctx: {
    runtime: 'CLI' | 'HTTP' | 'Worker'
    command?: string
  }
}