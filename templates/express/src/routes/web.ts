import { Router } from '@arkstack/driver-express'
import { view } from '@arkstack/view'

Router.get('/', async () => {
  return await view('welcome', {
    title: 'Welcome to Arkstack',
    message: 'Server running — ready for requests',
  })
})
