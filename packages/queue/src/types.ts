/**
 * Anything that can be queued and executed by a worker.
 *
 * The only hard requirement is a `handle` method. Optional fields let a job
 * customize its routing and retry behaviour; the `@arkstack/jobs` package builds
 * a richer base class on top of this contract.
 */
export interface Queueable {
    /** Perform the work for this job. */
    handle (): unknown | Promise<unknown>
    /** Serialize the job's state for storage. Defaults to a shallow copy. */
    serialize?(): Record<string, unknown>
    /** Override the queue this job is pushed onto. */
    queue?: string
    /** Override the connection this job is pushed onto. */
    connection?: string
    /** Maximum number of attempts before the job is marked failed. */
    tries?: number
    /** Seconds to wait before a released job becomes available again. */
    backoff?: number
    /** Seconds to delay before the job first becomes available. */
    delay?: number
    /** Called when the job exhausts its attempts. */
    failed?(error: unknown): unknown | Promise<unknown>
}

/**
 * The serialized envelope stored on a backing queue and reconstructed by a
 * worker. `data` carries the job's own serialized state; `displayName` is the
 * key used to resolve the concrete job class.
 */
export interface JobPayload {
    id: string
    displayName: string
    attempts: number
    maxTries: number | null
    backoff: number
    data: Record<string, unknown>
}

export interface SyncConnectionConfig {
    driver: 'sync'
}

export interface DatabaseConnectionConfig {
    driver: 'database'
    /** The table jobs are stored in. */
    table: string
    /** Default queue name. */
    queue?: string
    /** Seconds after which a reserved-but-unfinished job may be retried. */
    retryAfter?: number
}

export interface RedisConnectionConfig {
    driver: 'redis'
    url?: string
    host?: string
    port?: number
    password?: string
    db?: number
    /** Default queue name. */
    queue?: string
    /** Seconds after which a reserved-but-unfinished job may be retried. */
    retryAfter?: number
    /** Key prefix for queue structures. */
    prefix?: string
}

/**
 * Apps may augment this registry to register custom connection driver configs.
 */
export interface CustomQueueConnectionRegistry { }

export type QueueConnectionConfig =
    | SyncConnectionConfig
    | DatabaseConnectionConfig
    | RedisConnectionConfig
    | ({ driver: string } & Record<string, unknown>)

export interface QueueConfig {
    /** The default connection used when none is requested. */
    default: string

    /** The configured queue connections, keyed by name. */
    connections: Record<string, QueueConnectionConfig> & CustomQueueConnectionRegistry
}

/** Turns a job instance into a storable payload. */
export type JobSerializer = (job: Queueable) => JobPayload

/** Reconstructs a runnable job instance from a payload. */
export type JobResolver = (payload: JobPayload) => Queueable | Promise<Queueable>

/** Factory for a custom queue connection driver. */
export type QueueConnectionFactory =
    (config: QueueConnectionConfig, name: string) => import('./Contracts/QueueContract').QueueContract

/**
 * Lifecycle callbacks a driver binds to a reserved job so the worker can
 * acknowledge or retry it without knowing the driver's internals.
 */
export interface JobHandlers {
    delete (): Promise<void>
    release (delay: number): Promise<void>
}


export interface JobRow {
    id: number | string
    queue: string
    payload: string
    attempts: number
    reserved_at: number | null
    available_at: number
    created_at: number
}

/**
 * Chainable query surface we rely on from `@arkstack/database`'s `DB`. Declared
 * locally so the queue package needn't depend on it at build time (it is an
 * optional peer dependency).
 */
export interface Query {
    where (where: Record<string, unknown>): Query
    where (column: string, operator: string, value: unknown): Query
    whereNull (column: string): Query
    orderBy (orderBy: Record<string, 'asc' | 'desc'>): Query
    first (): Promise<JobRow | null>
    update (values: Record<string, unknown>): Promise<unknown>
    delete (): Promise<unknown>
    count (): Promise<number>
}

export interface DatabaseFacade {
    table (table: string): Query & {
        insert (values: Record<string, unknown>): Promise<unknown>
    }
}

/**
 * Structural type for the slice of ioredis we use. Declared locally so the
 * package needn't depend on ioredis at build time (optional peer dependency).
 */
export interface RedisClient {
    rpush (key: string, ...values: string[]): Promise<number>
    lpop (key: string): Promise<string | null>
    llen (key: string): Promise<number>
    del (...keys: string[]): Promise<number>
    zadd (key: string, score: number, member: string): Promise<unknown>
    zrem (key: string, member: string): Promise<number>
    zcard (key: string): Promise<number>
    zrangebyscore (key: string, min: string | number, max: string | number): Promise<string[]>
    quit (): Promise<unknown>
}