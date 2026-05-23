import type { RequestHelper, SessionHelper } from './types/Http'
import { clearRouterSessionPlugin, kanunSessionPlugin } from './session'

import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import { Response } from './Response'
import { Validator } from 'kanun'

declare global {
    var session: SessionHelper
    var request: RequestHelper
    var response: () => Response
}

CoreRouter.setRequestProvider(Request)
CoreRouter.setResponseProvider(Response)
Validator.use(kanunSessionPlugin)
void CoreRouter.use(clearRouterSessionPlugin as never)
