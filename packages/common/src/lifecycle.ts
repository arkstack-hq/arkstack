import { Hook } from '@arkstack/foundry'

export const bindGracefulShutdown = (shutdown: () => Promise<void> | void) => {
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
      if (Hook.has('shutdown', 'before')) Hook.get('shutdown', 'after', {})
      await shutdown()
    })
  })
}
