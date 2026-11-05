import { Router } from '@arkstack/driver-fastify'
import UserController from 'src/app/http/controllers/UserController'

Router.get('/', () => {
  return { status: 'OK' }
})

Router.apiResource('/users', UserController)
