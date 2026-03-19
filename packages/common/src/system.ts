import { DotPath, Obj } from '@h3ravel/support'

import { createRequire } from 'module'
import path from 'node:path'
import { readdirSync } from 'fs'

export interface GlobalEnv {
    <X = string, Y = undefined> (
        env: string,
        defaultValue?: Y,
    ): Y extends undefined ? X : Y
}

/**
 * Read the .env file
 *
 * @param env
 * @param def
 * @returns
 */
export const env: GlobalEnv = <X = string, Y = undefined> (
    env: string,
    defaultValue?: Y,
) => {
    let val: string | number | boolean | undefined | null = process.env[env] ?? ''

    if ([true, 'true', 'on', false, 'false', 'off'].includes(val)) {
        val = [true, 'true', 'on'].includes(val)
    }

    if (!isNaN(Number(val)) && typeof val !== 'boolean' && typeof val !== 'undefined' && val !== '') {
        val = Number(val)
    }

    if (val === '') {
        val = undefined
    }

    if (val === 'null') {
        val = null
    }

    val ??= defaultValue as typeof val

    return val as Y extends undefined ? X : Y
}

/**
 * Build the app url
 *
 * @param link
 * @returns
 */
export const appUrl = (link?: string): string => {
    const port = env('PORT') || '3000'
    const defaultUrl = `http://localhost:${port}`
    const appUrl = env('APP_URL') ?? defaultUrl

    try {
        const url = new URL(appUrl)
        // Append port only if APP_URL has a port or is localhost
        if (url.port || url.hostname === 'localhost') {
            url.port = port
        }
        // Remove trailing slash from base URL
        const baseUrl = url.toString().replace(/\/$/, '')
        // Append link with proper path separator
        if (link) {
            // Ensure link starts with '/' and remove duplicate slashes
            const normalizedLink = `/${link.replace(/^\/+/, '')}`

            return `${baseUrl}${normalizedLink}`
        }

        return baseUrl
    } catch {
        // Return default URL with link if provided
        return link ? `${defaultUrl}/${link.replace(/^\/+/, '')}` : defaultUrl
    }
}

export interface GlobalConfig {
    <X extends Record<string, any>, P extends DotPath<X> | undefined = undefined> (
        key?: P,
        defaultValue?: any
    ): P extends string ? any : X
}

/**
 * Gets the application configuration.
 * 
 * @param key             The configuration key to retrieve.
 * @param defaultValue    The default value to return if the key is not found.
 * @returns               The configuration value.
 */
export const config: GlobalConfig = <X extends Record<string, any>, P extends DotPath<X> | undefined = undefined> (
    key?: P,
    defaultValue?: any
) => {
    const require = createRequire(import.meta.url)

    const files = readdirSync(path.join(process.cwd(), 'dist/config'), { withFileTypes: true })
        .filter(file => {
            if (file.name.includes('middleware') && globalThis.arkctx.runtime === 'CLI') return false

            return file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.ts'))
        })

    const config = files.reduce((configs, file) => {
        const configName = path.basename(file.name, path.extname(file.name))

        configs[configName] = require(path.join(file.parentPath, file.name))
            .default((globalThis as any).app())

        return configs
    }, {} as Record<string, any>) as X


    if (key) {
        return Obj.get(config, key, defaultValue)
    }

    return config
}