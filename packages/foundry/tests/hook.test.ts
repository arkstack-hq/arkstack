import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  describe('emit', () => {
    it('calls the position with its arguments and returns the result', () => {
      Hook.on('test:hook', { after: (a: number, b: number) => a + b })

      expect(Hook.emit('test:hook', 'after', 2, 3)).toBe(5)
    })

    it('calls a zero-argument hook (which get() could never trigger)', () => {
      const after = vi.fn()
      Hook.on('test:hook', { after })

      Hook.emit('test:hook', 'after')

      expect(after).toHaveBeenCalledTimes(1)
      // get() without arguments still only retrieves it.
      expect(Hook.get('test:hook', 'after')).toBe(after)
      expect(after).toHaveBeenCalledTimes(1)
    })

    it('returns the promise of an async hook so callers can await it', async () => {
      const order: string[] = []
      Hook.on('test:hook', {
        after: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          order.push('hook')
        },
      })

      await Hook.emit('test:hook', 'after')
      order.push('caller')

      expect(order).toEqual(['hook', 'caller'])
    })

    it('is a no-op returning undefined when the hook or position is missing', () => {
      expect(Hook.emit('test:missing', 'after')).toBeUndefined()

      Hook.on('test:hook', { before: vi.fn() })
      expect(Hook.emit('test:hook', 'after')).toBeUndefined()
    })
  })

  describe('compatibility aliases', () => {
    it('set() registers like on()', () => {
      const before = vi.fn()
      Hook.set('test:hook', { before })

      expect(Hook.get('test:hook', 'before')).toBe(before)
    })

    it('get() with arguments still calls the hook (deprecated)', () => {
      const after = vi.fn()
      Hook.on('test:hook', { after })

      Hook.get('test:hook', 'after', 'value')

      expect(after).toHaveBeenCalledWith('value')
    })

    it('getAll() and unset() mirror all() and off()', () => {
      Hook.on('test:hook', { before: vi.fn() })
      expect(Object.keys(Hook.getAll())).toEqual(['test:hook'])

      Hook.unset('test:hook')
      expect(Hook.has('test:hook')).toBe(false)
    })
  })

  describe('off', () => {
    it('removes one position and drops the hook once it is empty', () => {
      Hook.on('test:hook', { before: vi.fn(), after: vi.fn() })

      Hook.off('test:hook', 'before')
      expect(Hook.has('test:hook', 'before')).toBe(false)
      expect(Hook.has('test:hook', 'after')).toBe(true)

      Hook.off('test:hook', 'after')
      expect(Hook.has('test:hook')).toBe(false)
    })

    it('leaves other hooks alone when the named hook is not registered', () => {
      Hook.on('test:keep', { after: vi.fn() })

      Hook.off('test:missing')

      expect(Hook.has('test:keep')).toBe(true)
    })

    it('clears every hook when called with no name', () => {
      Hook.on('test:a', { after: vi.fn() })
      Hook.on('test:b', { after: vi.fn() })

      Hook.off()

      expect(Object.keys(Hook.all())).toEqual([])
    })
  })
})
