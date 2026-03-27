import { Router } from 'src/core/router'
import UserController from 'src/app/http/controllers/UserController'

Router.get('/hello', ({ res }) => {
  return res.send('Hello World').status(200)
})

Router.apiResource('/users', UserController)
