import 'dotenv/config'
import 'clear-router/decorators/setup'
import type { OldHelper, RedirectHelper, RequestHelper, SessionHelper } from './types/Http'
import { arkstackHttpPlugin, kanunSessionPlugin } from './session'

import { CoreRouter } from 'clear-router'
import { Request } from './Request'
import { Response } from './Response'
import { old } from './old'
import { redirect } from './redirect'
import { Validator } from 'kanun'
import { User } from '@app/models/User'
import { Publisher } from '@arkstack/common'
import { dirname, join } from 'node:path'

import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
declare global {
    var session: SessionHelper
    var request: RequestHelper<User>
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

Publisher.publishes({
    package: '@arkstack/http',
    tag: 'http-config',
    entries: [
        {
            from: join(root, 'stubs/config/resources.ts.stub'),
            to: 'src/config/resources.ts',
        },
        {
            from: join(root, 'stubs/config/session.ts.stub'),
            to: 'src/config/session.ts',
        },
    ],
})
