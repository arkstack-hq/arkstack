import { describe, expect, test } from 'vitest'

import { stripStubSuffix } from '../src/commands/PublishCommand'

describe('stripStubSuffix', () => {
    test('strips a trailing .stub marker, restoring the real extension', () => {
        expect(stripStubSuffix('src/app/models/UserTwoFactor.ts.stub'))
            .toBe('src/app/models/UserTwoFactor.ts')
    })

    test('leaves paths without a .stub marker untouched', () => {
        expect(stripStubSuffix('src/database/migrations/create_cache_table.ts'))
            .toBe('src/database/migrations/create_cache_table.ts')
    })

    test('only strips the final .stub, not other segments', () => {
        expect(stripStubSuffix('controller.api.resource.stub'))
            .toBe('controller.api.resource')
    })
})
