import type {
    DatabaseConnectionConfig,
    JobResolver,
    JobSerializer,
    QueueConnectionConfig,
    QueueConnectionFactory,
    Queueable,
    RedisConnectionConfig,
} from './types'
import { setResolver, setSerializer } from './serialization'

import { DatabaseQueue } from './drivers/DatabaseQueue'
import { QueueContract } from './Contracts/QueueContract'
import { RedisQueue } from './drivers/RedisQueue'
import { SyncQueue } from './drivers/SyncQueue'
import { Worker } from './Worker'
import { configure } from './config'

/**
 * The queue manager and primary entry point of `@arkstack/queue`.
 *
 * Resolves named connections from configuration, memoizes them, and exposes
 * static convenience methods that proxy the default connection:
 *
 * ```ts
 * await Queue.push(new SendWelcomeEmail(user))
 * await Queue.connection('redis').later(60, new ChargeInvoice(id))
 * ```
 *
 * It also owns the job (de)serialization strategy, which `@arkstack/jobs`
 * configures so workers can reconstruct application job classes.
 */
export class Queue {
    private static connections: Record<string, QueueContract> = {}
    private static customDrivers: Record<string, QueueConnectionFactory> = {}

    /**
     * Resolve a queue connection by name (or the default when omitted).
     * 
     * @param name 
     * @returns 
     */
    static connection (name?: string): QueueContract {
        const key = name ?? (configure('default', 'sync') as string)

        if (!this.connections[key]) {
            this.connections[key] = this.resolve(key)
        }

        return this.connections[key]
    }

    /**
     * Register a custom connection driver factory.
     * 
     * @param name 
     * @returns 
     */
    static extend (driver: string, factory: QueueConnectionFactory): typeof Queue {
        this.customDrivers[driver] = factory

        return this
    }

    /**
     * Register how jobs are reconstructed from a payload (used by workers).
     * 
     * @param name 
     * @returns 
     */
    static resolveJobsUsing (resolver: JobResolver): typeof Queue {
        setResolver(resolver)

        return this
    }

    /**
     * Register how job instances are serialized for storage.
     * 
     * @param serializer 
     * @returns 
     */
    static serializeUsing (serializer: JobSerializer): typeof Queue {
        setSerializer(serializer)

        return this
    }

    /**
     * Clear memoized connections. Intended for tests or runtime reconfiguration.
     * 
     * @param serializer 
     * @returns 
     */
    static clearResolved (): void {
        this.connections = {}
    }

    /**
     * Create a worker bound to the given (or default) connection.
     * 
     * @param serializer 
     * @returns 
     */
    static worker (name?: string): Worker {
        return new Worker(this.connection(name))
    }

    private static resolve (name: string): QueueContract {
        const config = configure(`connections.${name}` as never, undefined) as QueueConnectionConfig | undefined

        if (!config) {
            throw new Error(`Queue connection "${name}" is not configured.`)
        }

        return this.createConnection(config, name).setConnectionName(name)
    }

    private static createConnection (config: QueueConnectionConfig, name: string): QueueContract {
        switch (config.driver) {
            case 'sync':
                return new SyncQueue()
            case 'database':
                return new DatabaseQueue(config as DatabaseConnectionConfig)
            case 'redis':
                return new RedisQueue(config as RedisConnectionConfig)
            default:
                if (this.customDrivers[config.driver]) {
                    return this.customDrivers[config.driver](config, name)
                }

                throw new Error(`Unsupported queue driver: ${config.driver}`)
        }
    }

    static push (job: Queueable, queue?: string): Promise<string> {
        return this.connection(job.connection).push(job, queue)
    }

    static later (delay: number | Date, job: Queueable, queue?: string): Promise<string> {
        return this.connection(job.connection).later(delay, job, queue)
    }

    static pop (queue?: string): ReturnType<QueueContract['pop']> {
        return this.connection().pop(queue)
    }

    static size (queue?: string): Promise<number> {
        return this.connection().size(queue)
    }

    static clear (queue?: string): Promise<number> {
        return this.connection().clear(queue)
    }
}
