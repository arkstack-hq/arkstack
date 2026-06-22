import { describe, expect, test } from 'vitest'

import { Publisher } from '@arkstack/common'
import { existsSync } from 'node:fs'

describe('@arkstack/cache setup', () => {
    test('registers the cache table migration as publishable', async () => {
        await import('../src/setup')

        const groups = Publisher.publishables({ package: '@arkstack/cache' })

        expect(groups).toHaveLength(1)
        expect(groups[0].tag).toBe('cache-migrations')

        const entry = groups[0].entries[0]

        expect(entry.to).toBe('src/database/migrations/20260601000000_create_cache_table.ts')
        // The shipped stub the entry points to must actually exist.
        expect(existsSync(entry.from)).toBe(true)
    })
})
