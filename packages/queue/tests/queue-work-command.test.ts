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
