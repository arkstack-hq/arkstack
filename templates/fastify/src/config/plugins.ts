import type { FastifyPluginEntry } from '@arkstack/driver-fastify/types'
import corsConfig from './cors'
import fastifyCors from '@fastify/cors'

/**
 * Fastify plugins registered when the app is created. Options are given as
 * functions so the config is read when Fastify loads the plugin, after boot.
 */
export default (): FastifyPluginEntry[] => [
  [
    fastifyCors,
    () => {
      const { allowed_origins } = corsConfig()

      return {
        origin: allowed_origins.length > 0 ? allowed_origins : true,
        credentials: true,
      }
    },
  ],
]
