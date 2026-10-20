import type { DatabaseConnectionConfig, DatabaseFacade, JobPayload, JobRow, Query, Queueable } from '../types'

import { Job } from '../Job'
import { QueueContract } from '../Contracts/QueueContract'
import { serializeJob } from '../serialization'

const now = (): number => Math.floor(Date.now() / 1000)

/**
 * A queue connection backed by a relational table via `@arkstack/database`.
 *
 * Expected columns: `id` (auto increment), `queue` (string), `payload` (text),
 * `attempts` (int), `reserved_at` (nullable int), `available_at` (int),
 * `created_at` (int). Reservation marks `reserved_at` and bumps `attempts`;
 * completion deletes the row; release clears `reserved_at` and reschedules
 * `available_at`. Run `ark publish --tag queue-migrations` to add the migration
 * that creates this table.
 */
export class DatabaseQueue extends QueueContract {
  private db?: DatabaseFacade

  constructor(private readonly options: DatabaseConnectionConfig) {
    super()
  }

  private get defaultQueue(): string {
    return this.getDefaultQueue()
  }

  /** The configured queue this connection works when none is named. */
  getDefaultQueue(): string {
    return this.options.queue ?? 'default'
  }

  private async database(): Promise<DatabaseFacade> {
    if (this.db) {
      return this.db
    }

    try {
      const { DB } = await import('@arkstack/database' as string)
      this.db = DB as unknown as DatabaseFacade
    } catch {
      throw new Error('The database queue connection requires the "@arkstack/database" package.')
    }

    return this.db
  }

  async push(job: Queueable, queue?: string): Promise<string> {
    return this.pushRaw(serializeJob(job), queue ?? job.queue)
  }

  async pushRaw(payload: JobPayload, queue?: string, availableAt: number = now()): Promise<string> {
    const db = await this.database()

    await db.table(this.options.table).insert({
      queue: queue ?? this.defaultQueue,
      payload: JSON.stringify(payload),
      attempts: payload.attempts,
      reserved_at: null,
      available_at: availableAt,
      created_at: now(),
    })

    return payload.id
  }

  async later(delay: number | Date, job: Queueable, queue?: string): Promise<string> {
    const availableAt = delay instanceof Date ? Math.floor(delay.getTime() / 1000) : now() + delay

    return this.pushRaw(serializeJob(job), queue ?? job.queue, availableAt)
  }

  async pop(queue?: string): Promise<Job | null> {
    const db = await this.database()

    // Next available, unreserved (or expired-reservation) job in id order.
    const row = await this.availableQuery(db, queue ?? this.defaultQueue)
      .orderBy({ id: 'asc' })
      .first()

    return row ? this.reserve(db, row) : null
  }

  /**
   * The oldest due job on any queue. Ordering by id across queues is FIFO by
   * arrival, so a busy queue can't starve a quiet one.
   */
  async popAny(): Promise<Job | null> {
    const db = await this.database()
    const row = await this.availableQuery(db).orderBy({ id: 'asc' }).first()

    return row ? this.reserve(db, row) : null
  }

  /**
   * Reserve a fetched row and wrap it as a {@link Job}.
   *
   * @param db
   * @param row
   */
  private async reserve(db: DatabaseFacade, row: JobRow): Promise<Job> {
    const attempts = row.attempts + 1

    await db.table(this.options.table).where({ id: row.id }).update({ reserved_at: now(), attempts })

    const payload = { ...(JSON.parse(row.payload) as JobPayload), attempts }

    return new Job(payload, row.queue, {
      delete: async () => {
        await db.table(this.options.table).where({ id: row.id }).delete()
      },
      release: async (delay: number) => {
        await db
          .table(this.options.table)
          .where({ id: row.id })
          .update({
            reserved_at: null,
            available_at: now() + delay,
          })
      },
    })
  }

  async size(queue?: string): Promise<number> {
    const db = await this.database()

    return db
      .table(this.options.table)
      .where({ queue: queue ?? this.defaultQueue })
      .count()
  }

  async clear(queue?: string): Promise<number> {
    const db = await this.database()
    const name = queue ?? this.defaultQueue
    const count = await this.size(name)

    await db.table(this.options.table).where({ queue: name }).delete()

    return count
  }

  /**
   * Due, unreserved jobs, oldest first: on one queue, or on every queue when
   * `queue` is omitted. Released jobs become unreserved with a future
   * `available_at`, so they naturally wait their turn.
   *
   * @param db
   * @param queue
   * @returns
   */
  private availableQuery(db: DatabaseFacade, queue?: string): Query {
    const table = db.table(this.options.table)
    const scoped = queue === undefined ? table : table.where({ queue })

    return scoped.whereNull('reserved_at').whereRaw('available_at <= ' + now())
  }
}
