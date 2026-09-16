import { describe, expect, it } from 'vitest'

import type { RealtimeNotification } from '../src'
import { supersede } from '../src'

const notification = (
    overrides: Partial<RealtimeNotification> = {},
): RealtimeNotification => ({
    id: overrides.id ?? '1',
    type: null,
    title: 'Incoming call',
    description: 'Ada is calling',
    read_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
})

describe('supersede', () => {
    it('prepends an untagged notification, newest first', () => {
        const first = notification({ id: '1' })
        const second = notification({ id: '2' })

        expect(supersede([first], second)).toEqual([second, first])
    })

    it('never lets an untagged notification supersede anything', () => {
        const existing = notification({ id: '1', tag: 'call:42' })
        const incoming = notification({ id: '2' })

        expect(supersede([existing], incoming)).toEqual([incoming, existing])
    })

    it('replaces a tagged notification in place, holding its position', () => {
        const newest = notification({ id: '3' })
        const ring = notification({ id: '1', tag: 'call:42' })
        const missed = notification({ id: '2', tag: 'call:42', title: 'Missed call' })

        const result = supersede([newest, ring], missed)

        // Position is held so the list does not reshuffle under a reader.
        expect(result).toEqual([newest, missed])
        expect(result).toHaveLength(2)
    })

    it('prepends a tagged notification the list has not seen', () => {
        const existing = notification({ id: '1', tag: 'order:7' })
        const incoming = notification({ id: '2', tag: 'call:42' })

        expect(supersede([existing], incoming)).toEqual([incoming, existing])
    })

    it('removes what a retraction names and shows nothing of its own', () => {
        const other = notification({ id: '1', tag: 'order:7' })
        const ring = notification({ id: '2', tag: 'call:42' })

        const result = supersede([other, ring], notification({ id: '3', tag: 'call:42', retracted: true }))

        expect(result).toEqual([other])
    })

    it('ignores a retraction for something it never saw', () => {
        const existing = notification({ id: '1', tag: 'order:7' })

        const result = supersede([existing], notification({ id: '2', tag: 'call:42', retracted: true }))

        // Common whenever a client connects after the fact.
        expect(result).toEqual([existing])
    })

    it('drops a retraction that names nothing at all', () => {
        const existing = notification({ id: '1' })

        expect(supersede([existing], notification({ id: '2', retracted: true }))).toEqual([existing])
    })

    it('applies the limit when growing the list', () => {
        const existing = [notification({ id: '1' }), notification({ id: '2' })]

        expect(supersede(existing, notification({ id: '3' }), 2)).toEqual([
            notification({ id: '3' }), notification({ id: '1' }),
        ])
    })

    it('does not drop entries to the limit when replacing in place', () => {
        const existing = [notification({ id: '1', tag: 'a' }), notification({ id: '2', tag: 'b' })]
        const replacement = notification({ id: '3', tag: 'b', title: 'Updated' })

        // A replacement does not grow the list, so the limit has nothing to trim.
        expect(supersede(existing, replacement, 2)).toEqual([existing[0], replacement])
    })

    it('leaves the input list untouched', () => {
        const existing = [notification({ id: '1', tag: 'call:42' })]
        const snapshot = [...existing]

        supersede(existing, notification({ id: '2', tag: 'call:42' }))
        supersede(existing, notification({ id: '3', tag: 'call:42', retracted: true }))

        expect(existing).toEqual(snapshot)
    })
})
