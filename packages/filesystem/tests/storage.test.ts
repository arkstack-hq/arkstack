import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { Driver } from '../src/Driver'
import { Storage } from '../src'
import { config } from '@arkstack/common'
import dotenv from 'dotenv'
import { driver } from './helpers'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('Filesystem Storage', () => {
    beforeAll(async () => {
        dotenv.populate(process.env, { CONFIG_PATH: resolve(__dirname, './config') })
        Arkstack.setRootDir(resolve(__dirname, './'))
    })

    afterAll(() => {
        dotenv.populate(process.env, { CONFIG_PATH: undefined })
    })

    describe('Storage System', () => {
        it('should set the configured disk and driver', () => {
            const file = Storage.disk('public')

            expect(file.getDiskName()).toBe('public')
            expect(file.getDriverName()).toBe('local')
        })
    })

    describe('Custom Driver', () => {
        it('should resolve a registered custom disk driver', () => {

            Driver.registerDriver('memory', driver)

            expect(Driver.make({ driver: 'memory' } as never)).toBe(driver)

            Driver.removeDriver('memory')
        })

        it('should resolve a configured custom disk driver', async () => {
            config({
                'filesystem.default': 'memory',
                'filesystem.custom_drivers.memory': driver,
                'filesystem.disks.memory': { driver: 'memory' },
            } as never)

            expect(await new Storage().get('demo.jpg')).toBe('custom driver contentdemo.jpg')
        })
    })
})
