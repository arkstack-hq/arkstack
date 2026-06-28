import { Router } from '@arkstack/driver-express'
import UserController from 'src/app/http/controllers/UserController'

Router.get('/', () => {
  return { status: 'OK' }
})

Router.apiResource('/users', UserController)
