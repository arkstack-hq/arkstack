import type { QueueConfig } from '@arkstack/queue'

export default (): QueueConfig => {
    return {
        /**
         * Default Queue Connection
         *
         * The connection used when a job is dispatched without specifying one.
         * The `sync` connection runs jobs immediately (no worker required) and is
         * a sensible default for local development and tests.
         *
         * Supported drivers: sync, database, redis.
         */
        default: env('QUEUE_CONNECTION', 'sync'),

        /**
         * Queue Connections
         *
         * Configure a connection per backend. Run a worker with `ark queue:work`
         * to process jobs on the database and redis connections.
         */
        connections: {
            sync: {
                driver: 'sync',
            },
            database: {
                driver: 'database',
                table: env('QUEUE_TABLE', 'jobs'),
                queue: env('QUEUE_NAME', 'default'),
                retryAfter: env('QUEUE_RETRY_AFTER', 90),
            },
            redis: {
                driver: 'redis',
                host: env('REDIS_HOST', '127.0.0.1'),
                port: env('REDIS_PORT', 6379),
                password: env('REDIS_PASSWORD'),
                db: env('REDIS_QUEUE_DB', 0),
                queue: env('QUEUE_NAME', 'default'),
                retryAfter: env('QUEUE_RETRY_AFTER', 90),
            },
        },
    }
}
