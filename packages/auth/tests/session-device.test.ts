import { describe, expect, it } from 'vitest'

import { SessionDevice } from '../src'

const androidChrome =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

const deviceRequest = (headers: Record<string, string>) =>
  ({
    header: (name: string) => headers[name.toLowerCase()],
    ip: '127.0.0.1',
  }) as never

describe('SessionDevice', () => {
  it('tells apart two devices of the same kind by their installation ids', () => {
    const first = SessionDevice.fromRequest(
      deviceRequest({ 'user-agent': androidChrome, 'x-device-id': 'first-installation-0001' }),
    )
    const second = SessionDevice.fromRequest(
      deviceRequest({ 'user-agent': androidChrome, 'x-device-id': 'second-installation-0002' }),
    )

    expect(SessionDevice.matches(first, second)).toBe(false)
  })

  it('matches an installation to its own earlier session', () => {
    const headers = { 'user-agent': androidChrome, 'x-device-id': 'repeat-installation-0003' }

    expect(
      SessionDevice.matches(
        SessionDevice.fromRequest(deviceRequest(headers)),
        SessionDevice.fromRequest(deviceRequest(headers)),
      ),
    ).toBe(true)
  })

  it('never matches a device that sent no installation id', () => {
    const headers = { 'user-agent': androidChrome }

    expect(
      SessionDevice.matches(
        SessionDevice.fromRequest(deviceRequest(headers)),
        SessionDevice.fromRequest(deviceRequest(headers)),
      ),
    ).toBe(false)
  })

  it('stores a keyed hash rather than the installation id', () => {
    const device = SessionDevice.fromRequest(deviceRequest({ 'x-device-id': 'stored-installation-0004' }))

    expect(device.installKey).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(device)).not.toContain('stored-installation-0004')
  })

  it('ignores an installation id that is not opaque', () => {
    expect(SessionDevice.fromRequest(deviceRequest({ 'x-device-id': 'short' })).installKey).toBeNull()
    expect(SessionDevice.fromRequest(deviceRequest({ 'x-device-id': 'has spaces in it, sadly' })).installKey).toBeNull()
  })
})
