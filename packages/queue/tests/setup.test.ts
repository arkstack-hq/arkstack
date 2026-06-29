import { describe, expect, test } from 'vitest'

import { Publisher } from '@arkstack/common'
import { existsSync } from 'node:fs'

describe('@arkstack/queue setup', () => {
    test('registers the jobs table migration as publishable', async () => {
        await import('../src/setup')

        const groups = Publisher.publishables({ package: '@arkstack/queue' })

        const migrations = groups.find((g) => g.tag === 'queue-migrations')!
        const entry = migrations.entries[0]

        expect(entry.to).toBe('src/database/migrations/20260601000001_create_jobs_table.ts')
        // The shipped stub the entry points to must actually exist.
        expect(existsSync(entry.from)).toBe(true)

        // The queue config is publishable too, from a stub that exists.
        const config = groups.find((g) => g.tag === 'queue-config')!
        expect(config.entries[0].to).toBe('src/config/queue.ts')
        expect(existsSync(config.entries[0].from)).toBe(true)
    })
})
