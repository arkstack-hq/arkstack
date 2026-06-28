import { beforeEach, describe, expect, test } from 'vitest'

import { Publisher } from '../src/Publisher'

describe('Publisher', () => {
    beforeEach(() => {
        Publisher.clear()
    })

    test('registers and reads publishable groups', () => {
        Publisher.publishes({
            package: '@arkstack/cache',
            tag: 'cache-migrations',
            entries: [{ from: '/abs/from.ts', to: 'src/database/migrations/from.ts' }],
        })

        const all = Publisher.publishables()

        expect(all).toHaveLength(1)
        expect(all[0].package).toBe('@arkstack/cache')
        expect(all[0].entries[0].to).toBe('src/database/migrations/from.ts')
    })

    test('filters by package and tag', () => {
        Publisher.publishes({ package: '@arkstack/cache', tag: 'cache-migrations', entries: [] })
        Publisher.publishes({ package: '@arkstack/queue', tag: 'queue-migrations', entries: [] })

        expect(Publisher.publishables({ package: '@arkstack/queue' })).toHaveLength(1)
        expect(Publisher.publishables({ tag: 'cache-migrations' })).toHaveLength(1)
        expect(Publisher.publishables({ package: '@arkstack/queue', tag: 'cache-migrations' })).toHaveLength(0)
        expect(Publisher.publishables()).toHaveLength(2)
    })

    test('clear empties the registry', () => {
        Publisher.publishes({ package: '@arkstack/cache', entries: [] })
        Publisher.clear()

        expect(Publisher.publishables()).toHaveLength(0)
    })
})

describe('Publisher confirmations', () => {
    beforeEach(() => {
        Publisher.clear()
    })

    test('registers a single confirmation and reads it back', () => {
        Publisher.confirm({
            package: '@arkstack/inertia',
            message: 'Which framework?',
            options: [{ name: 'Vue', value: 'inertia-vue' }],
        })

        const all = Publisher.confirmables(true)

        expect(all).toHaveLength(1)
        expect(all[0].message).toBe('Which framework?')
    })

    test('registers an array of confirmations', () => {
        Publisher.confirm([
            { package: '@arkstack/inertia', message: 'a', options: ['x'] },
            { package: '@arkstack/cache', message: 'b', options: ['y'] },
        ])

        expect(Publisher.confirmables(true)).toHaveLength(2)
    })

    test('filters confirmations by package', () => {
        Publisher.confirm([
            { package: '@arkstack/inertia', message: 'a', options: ['x'] },
            { package: '@arkstack/cache', message: 'b', options: ['y'] },
        ])

        expect(Publisher.confirmables('@arkstack/inertia')).toHaveLength(1)
        expect(Publisher.confirmables('@arkstack/inertia')[0].package).toBe('@arkstack/inertia')
        expect(Publisher.confirmables(true)).toHaveLength(2)
    })

    test('clear also empties confirmations', () => {
        Publisher.confirm({ package: '@arkstack/inertia', message: 'a', options: ['x'] })
        Publisher.clear()

        expect(Publisher.confirmables(true)).toHaveLength(0)
    })
})
