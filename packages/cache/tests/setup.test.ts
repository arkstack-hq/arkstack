import { describe, expect, test } from 'vitest'

import { Publisher } from '@arkstack/common'
import { existsSync } from 'node:fs'

describe('@arkstack/cache setup', () => {
    test('registers the cache table migration as publishable', async () => {
        await import('../src/setup')

        const groups = Publisher.publishables({ package: '@arkstack/cache' })

        const migrations = groups.find((g) => g.tag === 'cache-migrations')!
        const entry = migrations.entries[0]

        expect(entry.to).toBe('src/database/migrations/20260601000000_create_cache_table.ts')
        // The shipped stub the entry points to must actually exist.
        expect(existsSync(entry.from)).toBe(true)

        // The cache config is publishable too, from a stub that exists.
        const config = groups.find((g) => g.tag === 'cache-config')!
        expect(config.entries[0].to).toBe('src/config/cache.ts')
        expect(existsSync(config.entries[0].from)).toBe(true)
    })
})
