import { Arkstack, ENV } from '@arkstack/contract'

import { SessionConfig } from '@arkstack/http'
import { Str } from '@h3ravel/support'
import appConfig from './app'
import { join } from 'node:path'

export default (): SessionConfig => {
    const app = appConfig()

    return {
        secret: env('SESSION_SECRET', app.key),

        /**
         * Session Driver
         * 
         * The default session driver that is utilized for incoming requests.
         * 
         * Supported: "file", "cookie", "database", 
         * (WIP: "apc", "memcached", "redis", "dynamodb", "array")
         */
        driver: env('SESSION_DRIVER', 'file'),

        /**
         * Cookie Name
         * 
         * The name of the session cookie that is created by Arkstack.
         */
        cookie: env(
            'SESSION_COOKIE',
            Str.slug(env('APP_NAME', 'arkstack'), '_') + '_session'
        ),

        /**
         * Session Time To Live
         * 
         * The number of minutes that the session is allowed to remain idle before 
         * it expires.
         */
        ttl: env<number>('SESSION_LIFETIME', 60 * 60 * 24 * 7),

        /**
         * HTTP Only Access
         * 
         * Prevent JavaScript from accessing the value of the cookie making it 
         * only accessible through the HTTP protocol.
         */
        http_only: true,

        /**
         * HTTPS Only Access
         * 
         * This option ensures that cookies will only be sent back to the server 
         * if the browser has a HTTPS connection if set to "true".
         */
        secure: env<ENV>('NODE_ENV', 'development') === 'production',

        /**
         * Same-Site Cookies
         * 
         * Determines how cookies behave when cross-site requests take 
         * place, and can be used to mitigate CSRF attacks.
         * See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value
         * 
         * Supported: "Lax", "Strict", "None", undefined
         */
        same_site: 'Lax',

        /**
         * Session Cookie Path
         * 
         * Determines the path for which the cookie will be available. 
         */
        path: '/',
        /**
         * Datbase Table 
         * 
         * For the "database" session driver, this will determine the table to
         * be used to store sessions.
         */
        table: env('SESSION_TABLE', 'sessions'),

        /**
         * Session Directory
         * 
         * For the "file" session driver, the session files are placed in this directory.
         */
        directory: env('SESSION_FILE_PATH', join(Arkstack.rootDir(), './storage/framework/sessions')),
    }
}
