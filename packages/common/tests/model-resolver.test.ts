import { describe, expect, it } from 'vitest'

import { getModel, getModelSync, setModelResolver } from '../src/utils/helpers'

describe('model resolver', () => {
    it('uses an injected resolver synchronously', () => {
        class User { }

        setModelResolver((name) => {
            expect(name).toBe('User')

            return User as never
        })

        expect(getModel<typeof User>('User')).toBe(User)
        expect(getModelSync<typeof User>('User')).toBe(User)
    })
})
