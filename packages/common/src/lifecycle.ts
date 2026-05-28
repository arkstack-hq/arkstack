import { Hook } from '@arkstack/foundry'

export const bindGracefulShutdown = (shutdown: () => Promise<void> | void, defer?: boolean) => {
  if (defer) return

  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
      if (Hook.has('shutdown', 'before')) Hook.get('shutdown', 'after', {})
      await shutdown()
    })
  })
}
