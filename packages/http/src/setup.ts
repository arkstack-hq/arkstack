import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import { Response } from './Response'

CoreRouter.setRequestProvider(Request as never)
CoreRouter.setResponseProvider(Response)