import type { DatabaseFacade, JobRow, Query, RedisClient } from '../src'
import { DatabaseQueue, Queue, RedisQueue, Worker, resetSerialization, serializeJob } from '../src'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MemoryQueue } from './MemoryQueue'

/** A job that records which queue's work ran, in order. */
class TaggedJob {
  static log: string[] = []

  constructor(
    public tag: string,
    public queue?: string,
  ) {}

  handle() {
    TaggedJob.log.push(this.tag)
  }

  serialize() {
    return { tag: this.tag }
  }
}

const job = (tag: string, queue?: string) => new TaggedJob(tag, queue) as never

describe('Multi-queue workers', () => {
  beforeEach(() => {
    Queue.resolveJobsUsing((payload) => new TaggedJob(payload.data.tag as string))
  })

  afterEach(() => {
    resetSerialization()
    TaggedJob.log = []
  })

  describe('priority list', () => {
    it('takes the first job walking the list, whatever order jobs arrived in', async () => {
      const queue = new MemoryQueue()
      await queue.push(job('low-1', 'low'))
      await queue.push(job('high-1', 'high'))
      await queue.push(job('low-2', 'low'))
      await queue.push(job('high-2', 'high'))

      await new Worker(queue).daemon({ queue: ['high', 'low'], sleep: 0, stopWhenEmpty: true })

      expect(TaggedJob.log).toEqual(['high-1', 'high-2', 'low-1', 'low-2'])
    })

    it('skips empty queues and reports empty only when every listed queue is', async () => {
      const queue = new MemoryQueue()
      await queue.push(job('second', 'b'))
      const worker = new Worker(queue)

      expect(await worker.runNextJob(['a', 'b'])).toBe(true)
      expect(await worker.runNextJob(['a', 'b'])).toBe(false)
      expect(TaggedJob.log).toEqual(['second'])
    })

    it('never touches a queue that is not listed', async () => {
      const queue = new MemoryQueue()
      await queue.push(job('elsewhere', 'other'))

      expect(await new Worker(queue).runNextJob(['a', 'b'])).toBe(false)
      expect(await queue.size('other')).toBe(1)
    })
  })

  describe('* wildcard', () => {
    it('drains every queue, oldest job first', async () => {
      const queue = new MemoryQueue()
      await queue.push(job('ocr-1', 'ocr'))
      await queue.push(job('webhook-1', 'webhook'))
      await queue.push(job('default-1'))
      await queue.push(job('ocr-2', 'ocr'))

      await new Worker(queue).daemon({ queue: ['*'], sleep: 0, stopWhenEmpty: true })

      expect(TaggedJob.log).toEqual(['ocr-1', 'webhook-1', 'default-1', 'ocr-2'])
      expect(await queue.size()).toBe(0)
    })

    it('combines with named queues: listed queues first, then anything', async () => {
      const queue = new MemoryQueue()
      await queue.push(job('ocr', 'ocr'))
      await queue.push(job('webhook', 'webhook'))

      await new Worker(queue).daemon({ queue: ['webhook', '*'], sleep: 0, stopWhenEmpty: true })

      expect(TaggedJob.log).toEqual(['webhook', 'ocr'])
    })
  })

  describe('DatabaseQueue.popAny', () => {
    /** A fake table that applies the where/whereNull filters `availableQuery` builds. */
    const fakeDatabase = (rows: JobRow[]) => {
      const queries: Array<Record<string, unknown>> = []

      const query = (filters: Record<string, unknown>, matching: () => JobRow[]): Query =>
        ({
          where: (where: Record<string, unknown>) => {
            const next = { ...filters, ...where }

            return query(next, () =>
              matching().filter((row) =>
                Object.entries(where).every(([key, value]) => row[key as keyof JobRow] === value),
              ),
            )
          },
          whereNull: (column: string) =>
            query(filters, () => matching().filter((row) => row[column as keyof JobRow] === null)),
          whereRaw: () => query(filters, matching),
          orderBy: () => query(filters, () => [...matching()].sort((a, b) => Number(a.id) - Number(b.id))),
          first: async () => {
            queries.push(filters)

            return matching()[0] ?? null
          },
          update: async (values: Record<string, unknown>) => {
            for (const row of matching()) Object.assign(row, values)
          },
          delete: async () => {},
          count: async () => matching().length,
        }) as Query

      const db = { table: () => query({}, () => rows) } as unknown as DatabaseFacade

      return { db, queries }
    }

    const row = (id: number, queue: string, tag: string): JobRow => ({
      id,
      queue,
      payload: JSON.stringify(serializeJob(job(tag))),
      attempts: 0,
      reserved_at: null,
      available_at: 0,
      created_at: 0,
    })

    it('reserves the oldest due job on any queue, tagged with its own queue', async () => {
      const { db, queries } = fakeDatabase([row(2, 'webhook', 'b'), row(1, 'ocr', 'a')])
      const queue = new DatabaseQueue({ driver: 'database', table: 'jobs' })
      ;(queue as unknown as { db: DatabaseFacade }).db = db

      const reserved = await queue.popAny()

      expect(reserved?.queue).toBe('ocr')
      expect(reserved?.payload.data.tag).toBe('a')
      // No queue filter: the wildcard spans every queue.
      expect(queries.at(-1)).not.toHaveProperty('queue')
    })

    it('still scopes a named pop to its queue', async () => {
      const { db } = fakeDatabase([row(1, 'ocr', 'a'), row(2, 'webhook', 'b')])
      const queue = new DatabaseQueue({ driver: 'database', table: 'jobs' })
      ;(queue as unknown as { db: DatabaseFacade }).db = db

      expect((await queue.pop('webhook'))?.payload.data.tag).toBe('b')
      expect(await queue.pop('missing')).toBeNull()
    })
  })

  describe('RedisQueue.popAny', () => {
    /** Just enough of ioredis (lists, sorted sets, SCAN) for the queue driver. */
    const fakeRedis = () => {
      const lists = new Map<string, string[]>()
      const zsets = new Map<string, Map<string, number>>()
      const scans: string[] = []

      const client: RedisClient = {
        rpush: async (key, ...values) => {
          const list = lists.get(key) ?? []
          list.push(...values)
          lists.set(key, list)

          return list.length
        },
        lpop: async (key) => lists.get(key)?.shift() ?? null,
        llen: async (key) => lists.get(key)?.length ?? 0,
        del: async (...keys) => keys.filter((key) => lists.delete(key) || zsets.delete(key)).length,
        zadd: async (key, score, member) => {
          const set = zsets.get(key) ?? new Map<string, number>()
          set.set(member, score)
          zsets.set(key, set)

          return 1
        },
        zrem: async (key, member) => Number(zsets.get(key)?.delete(member) ?? false),
        zcard: async (key) => zsets.get(key)?.size ?? 0,
        zrangebyscore: async (key, _min, max) => {
          const top = max === '+inf' ? Infinity : Number(max)

          return [...(zsets.get(key) ?? [])].filter(([, score]) => score <= top).map(([member]) => member)
        },
        // Returns the matching keys over two pages, to exercise the cursor loop.
        scan: async (cursor, ..._args) => {
          scans.push(String(cursor))
          const keys = [...lists.keys(), ...zsets.keys()].filter(
            (key) => (lists.get(key)?.length ?? 0) > 0 || (zsets.get(key)?.size ?? 0) > 0,
          )
          const half = Math.ceil(keys.length / 2)

          return cursor === '0' ? ['1', keys.slice(0, half)] : ['0', keys.slice(half)]
        },
        quit: async () => 'OK',
      }

      return { client, scans }
    }

    const redisQueue = (client: RedisClient) => {
      const queue = new RedisQueue({ driver: 'redis' })
      ;(queue as unknown as { client: RedisClient }).client = client

      return queue
    }

    it('discovers queues with SCAN and works them round-robin', async () => {
      const { client, scans } = fakeRedis()
      const queue = redisQueue(client)
      await queue.push(job('a1', 'alpha'))
      await queue.push(job('a2', 'alpha'))
      await queue.push(job('b1', 'beta'))
      await queue.push(job('b2', 'beta'))

      const order: string[] = []
      for (let i = 0; i < 4; i++) {
        const reserved = await queue.popAny()
        order.push(`${reserved?.queue}:${reserved?.payload.data.tag}`)
        await reserved?.delete()
      }

      // Alternates rather than draining `alpha` before `beta` gets a turn.
      expect(order).toEqual(['alpha:a1', 'beta:b1', 'alpha:a2', 'beta:b2'])
      expect(await queue.popAny()).toBeNull()
      expect(scans).toContain('1')
    })

    it('finds a queue that only has delayed jobs once they are due', async () => {
      const { client } = fakeRedis()
      const queue = redisQueue(client)
      await queue.pushRaw(serializeJob(job('later')), 'scheduled', Math.floor(Date.now() / 1000) + 3600)

      expect(await queue.popAny()).toBeNull()

      // Make it due, as time passing would.
      await client.zadd(
        'queues:scheduled:delayed',
        0,
        (await client.zrangebyscore('queues:scheduled:delayed', '-inf', '+inf'))[0],
      )
      const reserved = await queue.popAny()

      expect(reserved?.queue).toBe('scheduled')
      expect(reserved?.payload.data.tag).toBe('later')
    })
  })
})
