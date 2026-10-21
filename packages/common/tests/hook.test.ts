import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Hook as FoundryHook } from '@arkstack/foundry'
import { Hook } from '../src/Hook'

describe('Hook', () => {
  beforeEach(() => {
    Hook.clear()
  })

  it('preserves existing positions when registering multiple positions later', () => {
    const before = vi.fn()
    const after = vi.fn()
    const error = vi.fn()

    Hook.set('middleware:auth', { before })
    Hook.set('middleware:auth', { after, error })

    expect(Hook.get('middleware:auth', 'before')).toBe(before)
    expect(Hook.get('middleware:auth', 'after')).toBe(after)
    expect(Hook.get('middleware:auth', 'error')).toBe(error)
  })

  it('overwrites only the positions supplied by the new registration', () => {
    const before = vi.fn()
    const nextBefore = vi.fn()
    const after = vi.fn()

    Hook.set('middleware:auth', { before, after })
    Hook.set('middleware:auth', { before: nextBefore })

    expect(Hook.get('middleware:auth', 'before')).toBe(nextBefore)
    expect(Hook.get('middleware:auth', 'after')).toBe(after)
  })

  it('is the same registry as @arkstack/foundry (not a separate copy)', () => {
    const before = vi.fn()

    expect(Hook).toBe(FoundryHook)

    FoundryHook.on('middleware:auth', { before })
    expect(Hook.get('middleware:auth', 'before')).toBe(before)
  })
})
