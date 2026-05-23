import type { RequestHelper, SessionHelper } from './types/Http'

import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import { Response } from './Response'
import { clearRouterSessionPlugin } from './session'

declare global {
    var session: SessionHelper
    var request: RequestHelper
    var response: () => Response
}

CoreRouter.setRequestProvider(Request)
CoreRouter.setResponseProvider(Response)
void CoreRouter.use(clearRouterSessionPlugin as never)
