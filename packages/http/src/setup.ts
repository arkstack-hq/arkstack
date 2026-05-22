import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import type { RequestHelper } from './types/Http'
import { Response } from './Response'

declare global {
    var request: RequestHelper
    var response: () => Response
}

CoreRouter.setRequestProvider(Request as never)
CoreRouter.setResponseProvider(Response)
