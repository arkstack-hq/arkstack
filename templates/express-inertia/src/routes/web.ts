import { Router } from '@arkstack/driver-express'
import { inertia } from '@arkstack/inertia'

Router.get('/', async () => {
  return await inertia('Index', {
    title: 'Welcome to Arkstack',
    message: 'Server running — ready for requests',
  })
}) 
