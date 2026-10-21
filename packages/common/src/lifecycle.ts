import { Hook } from '@arkstack/foundry'

export const bindGracefulShutdown = (shutdown: () => Promise<void> | void, defer?: boolean) => {
  if (defer) return

  ;['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
      await Hook.emit('shutdown', 'before', {})
      await shutdown()
    })
  })
}
