import type { FastifyPluginEntry } from '@arkstack/driver-fastify/types'
import corsConfig from './cors'
import fastifyCors from '@fastify/cors'

/**
 * Fastify plugins registered when the app is created.
 */
export default (): FastifyPluginEntry[] => {
  const cConf = corsConfig()

  return [
    [
      fastifyCors,
      {
        origin: cConf.allowed_origins.length > 0 ? cConf.allowed_origins : true,
        credentials: true,
      },
    ],
  ]
}
