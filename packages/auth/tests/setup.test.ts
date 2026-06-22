import { describe, expect, test } from 'vitest'

import { Publisher } from '@arkstack/common'
import { existsSync } from 'node:fs'

describe('@arkstack/auth setup', () => {
    test('registers the UserTwoFactor model and migration as publishable', async () => {
        await import('../src/setup')

        const groups = Publisher.publishables({ package: '@arkstack/auth' })

        expect(groups).toHaveLength(1)
        expect(groups[0].tag).toBe('two-factor')

        const destinations = groups[0].entries.map((entry) => entry.to)

        expect(destinations).toContain('src/app/models/UserTwoFactor.ts')
        expect(destinations).toContain(
            'src/database/migrations/20260505110000_create_user_two_factors_table.ts',
        )

        // Every shipped stub the entries point to must actually exist.
        for (const entry of groups[0].entries) {
            expect(existsSync(entry.from)).toBe(true)
        }
    })
})
