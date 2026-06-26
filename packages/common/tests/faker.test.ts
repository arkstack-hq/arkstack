import { describe, expect, it } from 'vitest'

import { faker } from '../src/faker'

describe('Hook', () => {
    it('images return pictwo instances', () => {
        expect(faker.image.avatar()).toMatch(
            /^https:\/\/pictwo\.toneflix\.net\/category\/avatar\/[^/]+\/[^/]+$/
        )
    })

    it('expects faker to be preserved', () => {
        expect(faker.person.sex()).oneOf(['male', 'female'])
    })
})
