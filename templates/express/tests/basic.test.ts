import { describe, expect, it } from 'vitest'

import { Arkstack } from '@arkstack/contract'
import { app } from '../src/core/bootstrap'
import { existsSync } from 'node:fs'
import path from 'node:path'
import request from 'parasito'

/**
 * We use this test at the monorepo level,
 * this asertion allows us to scope the test to work with the monorepo setup
 * If you created your app with `create arkstack`, this can safely be removed.
 */
const rwd = path.join(process.cwd(), '/templates/express')
if (existsSync(rwd)) Arkstack.setRootDir(rwd)

describe('starter template', () => {
    it('runs a basic assertion', () => {
        expect(1 + 1).toBe(2)
    })

    it('can test a route', async () => {
        await request(app).get('/api').contains('{"status":"OK"}')
    })
})
