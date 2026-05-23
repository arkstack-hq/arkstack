import { CoreRouter } from 'clear-router/core'
import { clearRouterViewPlugin } from './plugins'

void CoreRouter.use(clearRouterViewPlugin)

export { clearRouterViewPlugin }
