import { Router } from '../../../../../src/index'

Router.get('/status', () => ({ status: 'OK' }))
