import { Job, type JobPayload, QueueContract, type Queueable, serializeJob } from '../src'

/**
 * A simple in-memory queue connection used to exercise the worker, reservation,
 * release and failure flows without needing Redis or a database. Jobs are kept
 * per named queue (unnamed pushes and pops use `default`), and a global
 * sequence gives {@link popAny} the same oldest-first order the database driver
 * has.
 */
export class MemoryQueue extends QueueContract {
  private queues = new Map<string, Array<{ seq: number; payload: JobPayload }>>()
  private reserved = new Map<string, JobPayload>()
  private seq = 0

  async push(job: Queueable, queue?: string): Promise<string> {
    return this.pushRaw(serializeJob(job), queue ?? job.queue)
  }

  async pushRaw(payload: JobPayload, queue?: string): Promise<string> {
    const name = queue ?? this.getDefaultQueue()
    const list = this.queues.get(name) ?? []

    list.push({ seq: this.seq++, payload })
    this.queues.set(name, list)

    return payload.id
  }

  async later(_delay: number | Date, job: Queueable, queue?: string): Promise<string> {
    return this.push(job, queue)
  }

  async pop(queue?: string): Promise<Job | null> {
    const name = queue ?? this.getDefaultQueue()
    const entry = this.queues.get(name)?.shift()

    return entry ? this.reserve(entry.payload, name) : null
  }

  async popAny(): Promise<Job | null> {
    let oldest: { name: string; seq: number } | null = null

    for (const [name, list] of this.queues) {
      if (list.length && (!oldest || list[0].seq < oldest.seq)) {
        oldest = { name, seq: list[0].seq }
      }
    }

    return oldest ? this.pop(oldest.name) : null
  }

  async size(queue?: string): Promise<number> {
    if (queue !== undefined) {
      return this.queues.get(queue)?.length ?? 0
    }

    const waiting = [...this.queues.values()].reduce((total, list) => total + list.length, 0)

    return waiting + this.reserved.size
  }

  async clear(): Promise<number> {
    const count = await this.size()
    this.queues.clear()
    this.reserved.clear()

    return count
  }

  private reserve(payload: JobPayload, queue: string): Job {
    payload.attempts += 1
    this.reserved.set(payload.id, payload)

    return new Job(payload, queue, {
      delete: async () => {
        this.reserved.delete(payload.id)
      },
      release: async () => {
        this.reserved.delete(payload.id)
        await this.pushRaw(payload, queue)
      },
    })
  }
}
