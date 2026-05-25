import type { OldHelper, RedirectHelper, RequestHelper, SessionHelper } from './types/Http'
import { arkstackHttpPlugin, kanunSessionPlugin } from './session'

import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import { Response } from './Response'
import { old } from './old'
import { redirect } from './redirect'
import { Validator } from 'kanun'

declare global {
    var session: SessionHelper
    var request: RequestHelper
    var response: () => Response
    var redirect: RedirectHelper
    var old: OldHelper
}

CoreRouter.setRequestProvider(Request)
CoreRouter.setResponseProvider(Response)
Validator.use(kanunSessionPlugin)
void CoreRouter.use(arkstackHttpPlugin as never)

globalThis.redirect = redirect
globalThis.old = old
