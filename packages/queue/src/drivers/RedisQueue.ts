import type { JobPayload, Queueable, RedisClient, RedisConnectionConfig } from '../types'

import { Job } from '../Job'
import { QueueContract } from '../Contracts/QueueContract'
import { serializeJob } from '../serialization'

const now = (): number => Math.floor(Date.now() / 1000)

/**
 * A Redis backed queue connection using an ioredis compatible client.
 *
 * Per queue it maintains three structures: a `waiting` list (FIFO), a `delayed`
 * sorted set (scored by availability time), and a `reserved` sorted set (scored
 * by retry-visibility time). On `pop` it first migrates due delayed and expired
 * reserved jobs back to the waiting list, then reserves the head of the list.
 */
export class RedisQueue extends QueueContract {
    private client?: RedisClient

    constructor(private readonly options: RedisConnectionConfig) {
        super()
    }

    private get defaultQueue (): string {
        return this.options.queue ?? 'default'
    }

    private get retryAfter (): number {
        return this.options.retryAfter ?? 90
    }

    private key (queue: string, suffix = ''): string {
        return `${this.options.prefix ?? 'queues:'}${queue}${suffix}`
    }

    private async connection (): Promise<RedisClient> {
        if (this.client) {
            return this.client
        }

        let Redis: new (...args: any[]) => RedisClient

        try {
            Redis = (await import('ioredis' as string)).default as never
        } catch {
            throw new Error('The redis queue connection requires the "ioredis" package.')
        }

        this.client = this.options.url
            ? new Redis(this.options.url)
            : new Redis({
                host: this.options.host ?? '127.0.0.1',
                port: this.options.port ?? 6379,
                password: this.options.password,
                db: this.options.db ?? 0,
            })

        return this.client
    }

    /** Disconnect the underlying client. Useful for tests and shutdown. */
    async disconnect (): Promise<void> {
        await this.client?.quit()
        this.client = undefined
    }

    async push (job: Queueable, queue?: string): Promise<string> {
        return this.pushRaw(serializeJob(job), queue ?? job.queue)
    }

    async pushRaw (payload: JobPayload, queue?: string, availableAt?: number): Promise<string> {
        const client = await this.connection()
        const name = queue ?? this.defaultQueue

        if (availableAt && availableAt > now()) {
            await client.zadd(this.key(name, ':delayed'), availableAt, JSON.stringify(payload))
        } else {
            await client.rpush(this.key(name), JSON.stringify(payload))
        }

        return payload.id
    }

    async later (delay: number | Date, job: Queueable, queue?: string): Promise<string> {
        const availableAt = delay instanceof Date
            ? Math.floor(delay.getTime() / 1000)
            : now() + delay

        return this.pushRaw(serializeJob(job), queue ?? job.queue, availableAt)
    }

    async pop (queue?: string): Promise<Job | null> {
        const client = await this.connection()
        const name = queue ?? this.defaultQueue

        await this.migrate(client, name)

        const raw = await client.lpop(this.key(name))

        if (raw === null) {
            return null
        }

        const payload = { ...(JSON.parse(raw) as JobPayload) }
        payload.attempts += 1

        const reserved = JSON.stringify(payload)
        await client.zadd(this.key(name, ':reserved'), now() + this.retryAfter, reserved)

        return new Job(payload, name, {
            delete: async () => {
                await client.zrem(this.key(name, ':reserved'), reserved)
            },
            release: async (delay: number) => {
                await client.zrem(this.key(name, ':reserved'), reserved)

                if (delay > 0) {
                    await client.zadd(this.key(name, ':delayed'), now() + delay, JSON.stringify(payload))
                } else {
                    await client.rpush(this.key(name), JSON.stringify(payload))
                }
            },
        })
    }

    async size (queue?: string): Promise<number> {
        const client = await this.connection()
        const name = queue ?? this.defaultQueue

        const [waiting, delayed, reserved] = await Promise.all([
            client.llen(this.key(name)),
            client.zcard(this.key(name, ':delayed')),
            client.zcard(this.key(name, ':reserved')),
        ])

        return waiting + delayed + reserved
    }

    async clear (queue?: string): Promise<number> {
        const client = await this.connection()
        const name = queue ?? this.defaultQueue
        const count = await this.size(name)

        await client.del(this.key(name), this.key(name, ':delayed'), this.key(name, ':reserved'))

        return count
    }

    /**
     * Move due delayed jobs and expired reservations back onto the waiting list.
     */
    private async migrate (client: RedisClient, queue: string): Promise<void> {
        for (const suffix of [':delayed', ':reserved']) {
            const key = this.key(queue, suffix)
            const due = await client.zrangebyscore(key, '-inf', now())

            for (const member of due) {
                await client.zrem(key, member)
                await client.rpush(this.key(queue), member)
            }
        }
    }
}
