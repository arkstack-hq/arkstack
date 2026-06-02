import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'

import { config } from '../src'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
//
describe('Hook', () => {
    beforeAll(async () => {
        dotenv.populate(process.env, { CONFIG_PATH: resolve(__dirname, './config') })
    })

    afterAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: undefined })
    })

    it('can set/replace config values', () => {
        expect(config('app.key')).toBe('change-me')
        expect(config('cors.allowed_origins')).toMatchObject(['https://link1', 'https://link2'])

        config({
            'app.key': 'new-me',
            cors: { allowed_origins: ['https://new.link1', 'https://new.link2'] }
        } as any)

        expect(config('app.key')).toBe('new-me')
        expect(config('cors.allowed_origins')).toMatchObject(['https://new.link1', 'https://new.link2'])
    })
})
