import { describe, expect, test } from 'vitest'

import { devTlsCredentials, localNetworkAddress } from '../src/tls'

describe('devTlsCredentials', () => {
    test('generates a PEM key and certificate', async () => {
        const credentials = await devTlsCredentials()

        expect(credentials.key).toContain('BEGIN')
        expect(credentials.key).toContain('PRIVATE KEY')
        expect(credentials.cert).toContain('BEGIN CERTIFICATE')
        expect(credentials.cert).toContain('END CERTIFICATE')
    })

    test('caches the generated certificate across calls', async () => {
        const first = await devTlsCredentials()
        const second = await devTlsCredentials()

        expect(second).toBe(first)
    })
})

describe('localNetworkAddress', () => {
    test('returns a non-internal IPv4 string or undefined', () => {
        const address = localNetworkAddress()

        if (address !== undefined) {
            expect(address).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
            expect(address).not.toBe('127.0.0.1')
        }
    })
})
