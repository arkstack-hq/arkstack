import { describe, expect, test } from 'vitest'

import { Publisher } from '@arkstack/common'
import { existsSync } from 'node:fs'

describe('@arkstack/queue setup', () => {
    test('registers the jobs table migration as publishable', async () => {
        await import('../src/setup')

        const groups = Publisher.publishables({ package: '@arkstack/queue' })

        expect(groups).toHaveLength(1)
        expect(groups[0].tag).toBe('queue-migrations')

        const entry = groups[0].entries[0]

        expect(entry.to).toBe('src/database/migrations/20260601000001_create_jobs_table.ts')
        // The shipped stub the entry points to must actually exist.
        expect(existsSync(entry.from)).toBe(true)
    })
})
