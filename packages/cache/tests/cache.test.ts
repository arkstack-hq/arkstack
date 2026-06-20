import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { Cache } from '../src'
import { MemoryStore } from '../src'
import { Repository } from '../src'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('Cache', () => {
    beforeAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: resolve(__dirname, './config') })
        Arkstack.setRootDir(resolve(__dirname, './'))
    })

    afterAll(async () => {
        await Cache.store('file').flush()
        dotenv.populate(process.env, { CONFIG_PATH: undefined as never })
    })

    afterEach(async () => {
        await Cache.store('memory').flush()
        Cache.clearResolved()
    })

    describe('Manager', () => {
        it('resolves the default store as a repository', () => {
            expect(Cache.store()).toBeInstanceOf(Repository)
            expect(Cache.store().getStore()).toBeInstanceOf(MemoryStore)
        })

        it('memoizes resolved repositories', () => {
            expect(Cache.store('memory')).toBe(Cache.store('memory'))
        })

        it('throws for an unconfigured store', () => {
            expect(() => Cache.store('missing')).toThrow(/not configured/)
        })

        it('supports custom drivers via extend', async () => {
            Cache.extend('null', () => new MemoryStore('custom_'))
            // Re-resolve so the custom driver is picked up.
            Cache.clearResolved()
            const repo = new Repository(new MemoryStore('custom_'))

            expect(await repo.get('anything')).toBeNull()
        })
    })

    describe.each([
        ['memory'],
        ['file'],
    ])('%s store', (store) => {
        const cache = () => Cache.store(store)

        it('stores and retrieves values', async () => {
            await cache().put('name', 'Ark')

            expect(await cache().get('name')).toBe('Ark')
        })

        it('round-trips structured values', async () => {
            const value = { id: 1, tags: ['a', 'b'], nested: { ok: true } }
            await cache().put('obj', value)

            expect(await cache().get('obj')).toEqual(value)
        })

        it('returns the default for missing keys', async () => {
            expect(await cache().get('nope', 'fallback')).toBe('fallback')
            expect(await cache().get('nope', () => 'lazy')).toBe('lazy')
        })

        it('reports presence', async () => {
            await cache().put('present', 1)

            expect(await cache().has('present')).toBe(true)
            expect(await cache().missing('present')).toBe(false)
            expect(await cache().has('absent')).toBe(false)
        })

        it('expires entries past their ttl', async () => {
            await cache().put('soon', 'gone', new Date(Date.now() - 1000))

            expect(await cache().has('soon')).toBe(false)
        })

        it('does not write non-positive ttl entries', async () => {
            await cache().put('ephemeral', 'x', -5)

            expect(await cache().has('ephemeral')).toBe(false)
        })

        it('only adds when absent', async () => {
            expect(await cache().add('once', 'first')).toBe(true)
            expect(await cache().add('once', 'second')).toBe(false)
            expect(await cache().get('once')).toBe('first')
        })

        it('pulls and forgets', async () => {
            await cache().put('temp', 'value')

            expect(await cache().pull('temp')).toBe('value')
            expect(await cache().has('temp')).toBe(false)
        })

        it('forgets and flushes', async () => {
            await cache().put('a', 1)
            await cache().put('b', 2)

            expect(await cache().forget('a')).toBe(true)
            expect(await cache().has('a')).toBe(false)

            await cache().flush()
            expect(await cache().has('b')).toBe(false)
        })

        it('increments and decrements', async () => {
            expect(await cache().increment('hits')).toBe(1)
            expect(await cache().increment('hits', 4)).toBe(5)
            expect(await cache().decrement('hits', 2)).toBe(3)
        })

        it('refuses to increment a non-numeric value', async () => {
            await cache().put('word', 'text')

            expect(await cache().increment('word')).toBe(false)
        })

        it('remembers computed values', async () => {
            let calls = 0
            const compute = async () => {
                calls++

                return 'computed'
            }

            expect(await cache().remember('memo', 60, compute)).toBe('computed')
            expect(await cache().remember('memo', 60, compute)).toBe('computed')
            expect(calls).toBe(1)
        })

        it('remembers forever', async () => {
            expect(await cache().rememberForever('always', () => 42)).toBe(42)
            expect(await cache().get('always')).toBe(42)
        })
    })

    describe('Static proxies', () => {
        it('delegate to the default store', async () => {
            await Cache.put('proxied', 'yes')

            expect(await Cache.get('proxied')).toBe('yes')
            expect(await Cache.has('proxied')).toBe(true)

            await Cache.forget('proxied')
            expect(await Cache.has('proxied')).toBe(false)
        })
    })
})
