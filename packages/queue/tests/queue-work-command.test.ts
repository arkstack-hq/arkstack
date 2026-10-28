import { describe, expect, it } from 'vitest'

import { QueueWorkCommand } from '../src/commands/QueueWorkCommand'
import { Signature } from '@h3ravel/musket'

/**
 * musket reads `[a, b]` or a trailing `: a, b` in an option's description as its
 * allowed choices and rejects any other value. A description that tripped this
 * made `--queue` refuse every queue name, so pin that the worker's options stay
 * free-form.
 */
describe('queue:work signature', () => {
  const options = () => {
    const signature = (
      new QueueWorkCommand(undefined as never, undefined as never) as unknown as {
        signature: string
      }
    ).signature

    return Signature.parseOptions(signature) as Array<{ name: string; flags?: string[]; choices: string[] }>
  }

  it('accepts any --queue value (no choices list)', () => {
    const queue = options().find((option) => option.flags?.includes('--queue'))

    expect(queue).toBeDefined()
    expect(queue?.choices).toEqual([])
  })

  it('declares no choices on any option', () => {
    for (const option of options()) {
      expect(option.choices, option.name).toEqual([])
    }
  })
})

/**
 * musket hands an omitted `--queue=` over as an empty string, not undefined.
 * 0.18.x fell back with `??`, so a bare `queue:work` polled a queue named ""
 * and never saw a job dispatched to the default queue.
 */
describe('queue:work --queue resolution', () => {
  const resolve = (value: unknown, fallback = 'default'): string[] => {
    const command = new QueueWorkCommand(undefined as never, undefined as never) as unknown as {
      option: (name: string) => unknown
      queues: (fallback: string) => string[]
    }
    command.option = (name) => (name === 'queue' ? value : undefined)

    return command.queues(fallback)
  }

  it('falls back to the default queue when the flag is omitted', () => {
    expect(resolve(undefined)).toEqual(['default'])
    expect(resolve(null)).toEqual(['default'])
  })

  it('falls back to the default queue when the flag is empty', () => {
    expect(resolve('')).toEqual(['default'])
    expect(resolve(' , ')).toEqual(['default'])
  })

  it('keeps named queues in priority order, without duplicates', () => {
    expect(resolve('webhook, ocr,webhook')).toEqual(['webhook', 'ocr'])
  })

  it('passes the * wildcard through', () => {
    expect(resolve('*')).toEqual(['*'])
  })
})
