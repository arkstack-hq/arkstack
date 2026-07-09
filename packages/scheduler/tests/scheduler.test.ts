import { Schedule, acquireLock, isDue, nextRun, releaseLock, runDueEvents } from '../src'
import { beforeEach, describe, expect, it } from 'vitest'

const at = (h: number, m: number) => new Date(Date.UTC(2026, 0, 5, h, m, 0)) // 2026-01-05 is a Monday

beforeEach(() => Schedule.clear())

describe('cron matching', () => {
    it('isDue matches minute-resolution expressions', () => {
        expect(isDue('*/5 * * * *', at(10, 10), 'UTC')).toBe(true)
        expect(isDue('*/5 * * * *', at(10, 12), 'UTC')).toBe(false)
        expect(isDue('30 13 * * *', at(13, 30), 'UTC')).toBe(true)
        expect(isDue('30 13 * * *', at(13, 31), 'UTC')).toBe(false)
    })

    it('nextRun returns the following occurrence', () => {
        const next = nextRun('0 0 * * *', at(13, 0), 'UTC')

        expect(next?.toISOString()).toBe('2026-01-06T00:00:00.000Z')
    })
})

describe('frequency builders', () => {
    it('build the expected cron expressions', () => {
        expect(Schedule.call(() => { }).everyFiveMinutes().expression).toBe('*/5 * * * *')
        expect(Schedule.call(() => { }).dailyAt('13:30').expression).toBe('30 13 * * *')
        expect(Schedule.call(() => { }).weeklyOn(1, '8:00').expression).toBe('0 8 * * 1')
        expect(Schedule.call(() => { }).monthly().expression).toBe('0 0 1 * *')
        expect(Schedule.call(() => { }).weekdays().hourly().expression).toBe('0 * * * 1-5')
        expect(Schedule.call(() => { }).cron('15 3 * * 2').expression).toBe('15 3 * * 2')
    })
})

describe('Schedule facade', () => {
    it('registers events by type and finds the due ones', () => {
        Schedule.command('cache:prune').everyMinute().timezone('UTC')
        Schedule.call(() => { }).dailyAt('03:00').timezone('UTC')

        expect(Schedule.events()).toHaveLength(2)
        expect(Schedule.events()[0].type).toBe('command')

        const due = Schedule.dueEvents(at(10, 0))

        expect(due).toHaveLength(1)
        expect(due[0].expression).toBe('* * * * *')
    })
})

describe('constraints (filtersPass)', () => {
    it('honours when / skip predicates', async () => {
        expect(await Schedule.call(() => { }).when(() => false).filtersPass()).toBe(false)
        expect(await Schedule.call(() => { }).skip(() => true).filtersPass()).toBe(false)
        expect(await Schedule.call(() => { }).when(() => true).skip(() => false).filtersPass()).toBe(true)
    })

    it('honours time windows in the event timezone', async () => {
        const event = Schedule.call(() => { }).timezone('UTC').between('09:00', '17:00')

        expect(await event.filtersPass(at(13, 0))).toBe(true)
        expect(await event.filtersPass(at(20, 0))).toBe(false)
    })

    it('honours environments against APP_ENV', async () => {
        const previous = process.env.APP_ENV
        process.env.APP_ENV = 'production'

        expect(await Schedule.call(() => { }).environments('production').filtersPass()).toBe(true)
        expect(await Schedule.call(() => { }).environments('staging').filtersPass()).toBe(false)

        process.env.APP_ENV = previous
    })
})

describe('running events', () => {
    it('runs a call task with before/success/after hooks in order', async () => {
        const order: string[] = []
        const event = Schedule.call(() => {
 order.push('task') 
})
            .everyMinute()
            .before(() => {
 order.push('before') 
})
            .onSuccess(() => {
 order.push('success') 
})
            .after(() => {
 order.push('after') 
})

        const result = await event.run()

        expect(result.ran).toBe(true)
        expect(order).toEqual(['before', 'task', 'success', 'after'])
    })

    it('captures failures and runs the onFailure hook', async () => {
        let failed = false
        const event = Schedule.call(() => {
 throw new Error('boom') 
})
            .everyMinute()
            .onFailure(() => {
 failed = true 
})

        const result = await event.run()

        expect(result.ran).toBe(false)
        expect(result.error).toBeInstanceOf(Error)
        expect(failed).toBe(true)
    })

    it('skips when its overlap lock is already held', async () => {
        let ran = false
        const event = Schedule.call(() => {
 ran = true 
}).everyMinute().withoutOverlapping().name('overlap-test')

        // Pre-hold the mutex to simulate a still-running instance.
        await acquireLock(event.mutexName(), 60)

        const result = await event.run()

        expect(result.ran).toBe(false)
        expect(result.skipped).toBe('overlapping')
        expect(ran).toBe(false)

        await releaseLock(event.mutexName())
    })
})

describe('locks', () => {
    it('acquire is exclusive until released', async () => {
        expect(await acquireLock('k', 60)).toBe(true)
        expect(await acquireLock('k', 60)).toBe(false)

        await releaseLock('k')

        expect(await acquireLock('k', 60)).toBe(true)
        await releaseLock('k')
    })
})

describe('runDueEvents', () => {
    it('runs due events and reports filtered ones', async () => {
        let ran = false
        Schedule.call(() => {
 ran = true 
}).everyMinute().timezone('UTC')
        Schedule.call(() => { }).everyMinute().timezone('UTC').when(() => false)
        Schedule.call(() => {
 throw new Error('nope') 
}).dailyAt('03:00').timezone('UTC') // not due at 10:00

        const results = await runDueEvents(at(10, 0))

        expect(ran).toBe(true)
        expect(results).toHaveLength(2) // the two everyMinute events (due); the 03:00 one is not due
        expect(results.filter((r) => r.ran)).toHaveLength(1)
        expect(results.find((r) => r.skipped === 'filtered')).toBeDefined()
    })
})
