import type { JitiOptions, JitiResolveOptions } from 'jiti'

import type { ChalkInstance } from 'chalk'
import type { Logger } from './Logger'
import type { locales } from './locales'

export interface ConfigRegistry { }

/**
 * Map of known environment variables to their (coerced) value types.
 *
 * Used to give {@link GlobalEnv | env()} precise return types. Unknown keys fall
 * back to `string`. Augment this interface (declaration merging) to register
 * application-specific variables:
 *
 * ```ts
 * declare module '@arkstack/common' {
 *   interface EnvRegistry { MY_FLAG: boolean }
 * }
 * ```
 */
export interface EnvRegistry {
    // Application
    APP_NAME: string
    APP_ENV: 'development' | 'production' | 'staging' | 'local'
    APP_KEY: string
    APP_URL: string
    APP_HOST: string
    APP_PORT: number
    APP_DEBUG: boolean
    APP_TIMEZONE: string
    APP_LOCALE: string
    APP_FALLBACK_LOCALE: string
    APP_FAKER_LOCALE: string
    NODE_ENV: 'development' | 'production' | 'test'
    PORT: number
    HOST: string
    FRONTEND_URL: string

    // Build / runtime
    OUTPUT_DIR: string
    OUTPUT_DIR_DEV: string
    CONFIG_PATH: string
    TUNNEL: boolean

    // Filesystem
    FILESYSTEM_DISK: string

    // Cache
    CACHE_STORE: string
    CACHE_PREFIX: string
    CACHE_TABLE: string

    // Queue
    QUEUE_CONNECTION: string
    QUEUE_TABLE: string
    QUEUE_NAME: string
    QUEUE_RETRY_AFTER: number

    // Redis
    REDIS_HOST: string
    REDIS_PORT: number
    REDIS_PASSWORD: string
    REDIS_CACHE_DB: number
    REDIS_QUEUE_DB: number

    // Auth / session
    JWT_EXPIRES_IN: string
    SESSION_LIFETIME: number
    TWO_FACTOR_SMS_TTL_MINUTES: number

    // Database
    DATABASE_URL: string
    DB_CONNECTION: string
    DB_HOST: string
    DB_PORT: number
    DB_DATABASE: string
    DB_USERNAME: string
    DB_PASSWORD: string

    // Mail
    MAIL_HOST: string
    MAIL_PORT: number
    MAIL_SECURE: boolean
    MAIL_USERNAME: string
    MAIL_PASSWORD: string
    MAIL_FROM_ADDRESS: string
    MAIL_TEST_ADDRESS: string

    // AWS / S3
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    AWS_DEFAULT_REGION: string
    AWS_BUCKET: string
    AWS_URL: string
    AWS_ENDPOINT: string
}

/**
 * App Confifuration
 */
export interface AppConfig {
    env: string
    key: string
    url: string
    host: string
    name: string
    frontend_url: string
    debug: boolean
    timezone: string
    locale: typeof locales
    fallback_locale: string
    faker_locale: string
}

/** 
 * Known environment variable names. 
 */
export type EnvKey = keyof EnvRegistry & string

/** The registered type for a known key, or `string` for an unknown one. */
export type EnvLookup<K extends string> = [K] extends [EnvKey] ? EnvRegistry[K] : string
export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never

export type MergedConfig<X> = UnionToIntersection<X>
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type Primitive = string | number | boolean | null | undefined | Function
export type LoggerChalk = keyof ChalkInstance | ChalkInstance | (keyof ChalkInstance)[]
export type LoggerParseSignature = [string, LoggerChalk][]
export type DotPathValue<T, P extends string> =
    P extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
    ? DotPathValue<T[Head], Tail>
    : never
    : P extends keyof T
    ? T[P]
    : never

export type DotPath<T> = T extends Primitive
    ? never
    : T extends any[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends Primitive
        ? `${K}`
        : T[K] extends any[]
        ? `${K}`
        : `${K}` | `${K}.${DotPath<T[K]>}`
    }[keyof T & string]

/**
 * Ouput formater object or format the output
 * 
 * @param config 
 * @param joiner 
 * @param log If set to false, string output will be returned and not logged 
 * @param sc color to use ue on split text if : is found 
 * 
 * @returns 
 */
export interface LoggerLog {
    (): typeof Logger
    <L extends boolean>(
        config: string,
        joiner: LoggerChalk,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string
    <L extends boolean>(
        config: LoggerParseSignature,
        joiner?: string,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string
    <L extends boolean>(
        config?: LoggerParseSignature,
        joiner?: string,
        log?: L,
        sc?: LoggerChalk
    ): L extends true ? void : string | Logger
}


/**
 * Return type of {@link GlobalEnv | env()}.
 *
 * When an explicit value type `X` is given it wins (backward compatible with
 * `env<boolean>('FLAG')`). Otherwise the type registered for the key `K` is used
 * — falling back to `string` for unknown keys. A provided default `D` is unioned
 * into the result.
 */
export type EnvReturn<X, K extends string, D> =
    [X] extends [never]
    ? [D] extends [undefined] ? EnvLookup<K> : EnvLookup<K> | D
    : [D] extends [undefined] ? X : X | D

export interface GlobalEnv {
    <X = never, D = undefined, K extends string = string>(
        env: K,
        defaultValue?: D,
    ): EnvReturn<X, K, D>
}

export type ConfigShape = keyof ConfigRegistry extends never
    ? Record<string, any>
    : ConfigRegistry

export interface GlobalConfig {
    <X extends ConfigShape>(): X
    <X extends ConfigShape, P extends DotPath<X>>(
        key: P,
    ): DotPathValue<X, P>
    <X extends ConfigShape, P extends DotPath<X>>(key: Record<P, Partial<DotPathValue<X, P>>>): void;
    <X extends ConfigShape, P extends DotPath<X>, D>(
        key: P,
        defaultValue: D,
    ): DotPathValue<X, P> | D
}

export interface FileImporter {
    <T = unknown>(filePath: string): Promise<T>
    <T = unknown>(filePath: string, userOptions?: JitiOptions | undefined): Promise<T>
    <T = unknown>(filePath: string, userOptions?: JitiOptions | undefined, resolveOptions?: (JitiResolveOptions & { default?: true })): Promise<T>
}

export type ArkstackErrorShape = Error & {
    cause?: unknown;
    code?: number | string;
    errors?: unknown;
    getModelName?: () => string;
    status?: number;
    statusCode?: number;
}

export interface ArkstackErrorPayload {
    status: 'error';
    code: number;
    message: string;
    errors?: unknown;
    stack?: string;
}

// Augmentable Hooks Registry 
export interface HookRegistry { }

type Position = 'before' | 'after' | (string & {})

export type IHook = {
    [P in Position]?: (...args: any[]) => void
}

// Derive available hook names
export type HookName = keyof HookRegistry extends never ? string : keyof HookRegistry | (string & {})

// Derive the IHook type for a given name
export type HookFor<N extends string> = N extends keyof HookRegistry
    ? HookRegistry[N]
    : IHook

export type HookPos<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P]
    : (...args: any[]) => void
    : (...args: any[]) => void

export type HookPositions<N extends string> = N extends keyof HookRegistry
    ? keyof HookRegistry[N]
    : Position

export type HookArgs<N extends string, P extends string> = N extends keyof HookRegistry
    ? P extends keyof HookRegistry[N]
    ? HookRegistry[N][P] extends (...args: infer A) => any
    ? A
    : any[]
    : any[]
    : any[]

/**
* A single source → destination mapping a package wants to publish into the
* consuming application.
*/
export interface PublishEntry {
    /** Absolute path to the file or directory shipped by the package. */
    from: string
    /**
     * Destination path, relative to the application root, where the artifact is
     * written when published.
     */
    to: string
}

/**
 * A group of publishable artifacts registered by a package.
 */
export interface PublishGroup {
    /** The package registering the artifacts, e.g. `@arkstack/cache`. */
    package: string
    /**
     * Optional tag for selective publishing (`ark publish --tag <tag>`). A
     * package may register several groups under different tags.
     */
    tag?: string
    /** The files/directories to publish. */
    entries: PublishEntry[]
}

/** Optional filter applied when reading the registry. */
export interface PublishFilter {
    package?: string
    tag?: string
}