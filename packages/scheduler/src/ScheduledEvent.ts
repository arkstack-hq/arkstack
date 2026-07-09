import type { EventType, FilterCallback, HookCallback, RunResult, TaskCallback } from './types'
import { acquireLock, releaseLock } from './locks'
import { isDue, nextRun } from './cron'

import { Arkstack } from '@arkstack/contract'
import { createHash } from 'node:crypto'
import { env } from '@arkstack/common'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

/** A window of the day expressed in minutes-from-midnight, evaluated in the event's tz. */
interface TimeWindow {
    start: number
    end: number
    /** `true` for `unlessBetween` (run outside the window). */
    negate: boolean
}

const DAYS = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }

/** Parse `HH:MM` into `[hour, minute]`. */
const parseTime = (time: string): [number, number] => {
    const [h, m] = time.split(':')

    return [Number(h ?? 0), Number(m ?? 0)]
}

/** Minutes-from-midnight for `date`, in the given timezone. */
const minutesOfDay = (date: Date, timezone?: string): number => {
    const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
    }).formatToParts(date)

    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)

    return hour * 60 + minute
}

/**
 * A single scheduled task with a fluent builder for its frequency, constraints,
 * overlap behaviour and lifecycle hooks. Created via the {@link Schedule} facade
 * (`command`/`call`/`job`/`exec`) and evaluated once a minute by `schedule:run`.
 */
export class ScheduledEvent {
    private segments = ['*', '*', '*', '*', '*']
    private timezoneValue?: string
    descriptionValue: string

    private readonly filters: FilterCallback[] = []
    private readonly rejects: FilterCallback[] = []
    private environmentsValue?: string[]
    private readonly windows: TimeWindow[] = []

    private readonly beforeHooks: HookCallback[] = []
    private readonly afterHooks: HookCallback[] = []
    private readonly successHooks: HookCallback[] = []
    private readonly failureHooks: HookCallback[] = []

    private withoutOverlappingValue = false
    private overlapExpiresMinutes = 1440
    private onOneServerValue = false
    private runInBackgroundValue = false
    private mutexNameValue?: string

    // Task payloads by type.
    private callTask?: TaskCallback
    private jobPayload?: unknown
    private processCommand?: string
    private processArgs: string[] = []

    constructor(readonly type: EventType, target: string) {
        this.descriptionValue = target
    }

    setCall(task: TaskCallback): this {
        this.callTask = task

        return this
    }

    setJob(job: unknown): this {
        this.jobPayload = job

        return this
    }

    setProcess(command: string, args: string[] = []): this {
        this.processCommand = command
        this.processArgs = args

        return this
    }

    /** The 5-field cron expression this event resolves to. */
    get expression(): string {
        return this.segments.join(' ')
    }

    private splice(position: number, value: string | number): this {
        this.segments[position - 1] = String(value)

        return this
    }

    cron(expression: string): this {
        this.segments = expression.trim().split(/\s+/).slice(0, 5)

        while (this.segments.length < 5) this.segments.push('*')

        return this
    }

    everyMinute(): this {
        return this.splice(1, '*')
    }
    everyTwoMinutes(): this {
        return this.splice(1, '*/2')
    }
    everyThreeMinutes(): this {
        return this.splice(1, '*/3')
    }
    everyFourMinutes(): this {
        return this.splice(1, '*/4')
    }
    everyFiveMinutes(): this {
        return this.splice(1, '*/5')
    }
    everyTenMinutes(): this {
        return this.splice(1, '*/10')
    }
    everyFifteenMinutes(): this {
        return this.splice(1, '*/15')
    }
    everyThirtyMinutes(): this {
        return this.splice(1, '0,30')
    }

    hourly(): this {
        return this.splice(1, 0)
    }
    hourlyAt(minute: number | number[]): this {
        return this.splice(1, Array.isArray(minute) ? minute.join(',') : minute)
    }
    everyTwoHours(minute = 0): this {
        return this.splice(1, minute).splice(2, '*/2')
    }
    everyOddHour(minute = 0): this {
        return this.splice(1, minute).splice(2, '1-23/2')
    }

    daily(): this {
        return this.splice(1, 0).splice(2, 0)
    }
    at(time: string): this {
        return this.dailyAt(time)
    }
    dailyAt(time: string): this {
        const [hour, minute] = parseTime(time)

        return this.splice(1, minute).splice(2, hour)
    }
    twiceDaily(first = 1, second = 13, minute = 0): this {
        return this.splice(1, minute).splice(2, `${first},${second}`)
    }

    weekly(): this {
        return this.splice(1, 0).splice(2, 0).splice(5, 0)
    }
    weeklyOn(day: number | number[], time = '0:0'): this {
        this.dailyAt(time)

        return this.splice(5, Array.isArray(day) ? day.join(',') : day)
    }

    monthly(): this {
        return this.splice(1, 0).splice(2, 0).splice(3, 1)
    }
    monthlyOn(day = 1, time = '0:0'): this {
        this.dailyAt(time)

        return this.splice(3, day)
    }
    quarterly(): this {
        return this.splice(1, 0).splice(2, 0).splice(3, 1).splice(4, '1-12/3')
    }
    yearly(): this {
        return this.splice(1, 0).splice(2, 0).splice(3, 1).splice(4, 1)
    }

    days(day: number | number[]): this {
        return this.splice(5, Array.isArray(day) ? day.join(',') : day)
    }
    weekdays(): this {
        return this.splice(5, '1-5')
    }
    weekends(): this {
        return this.splice(5, '0,6')
    }
    sundays(): this {
        return this.splice(5, DAYS.sunday)
    }
    mondays(): this {
        return this.splice(5, DAYS.monday)
    }
    tuesdays(): this {
        return this.splice(5, DAYS.tuesday)
    }
    wednesdays(): this {
        return this.splice(5, DAYS.wednesday)
    }
    thursdays(): this {
        return this.splice(5, DAYS.thursday)
    }
    fridays(): this {
        return this.splice(5, DAYS.friday)
    }
    saturdays(): this {
        return this.splice(5, DAYS.saturday)
    }

    timezone(timezone: string): this {
        this.timezoneValue = timezone

        return this
    }

    /** 
     * Only run when every registered `when` predicate is truthy.
     * 
     * @param callback 
     * @returns 
     */
    when(callback: FilterCallback): this {
        this.filters.push(callback)

        return this
    }

    /** 
     * Skip when any registered `skip` predicate is truthy.
     * 
     * @param callback 
     * @returns 
     */
    skip(callback: FilterCallback): this {
        this.rejects.push(callback)

        return this
    }

    /** 
     * Only run in these `APP_ENV` environments.
     * 
     * @param callback 
     * @returns 
     */
    environments(...environments: (string | string[])[]): this {
        this.environmentsValue = environments.flat()

        return this
    }

    /** 
     * Only run when the current time is within `[start, end]` (HH:MM, event tz). 
     * 
     * @param start 
     * @param end 
     * @returns 
     */
    between(start: string, end: string): this {
        this.windows.push({ start: this.toMinutes(start), end: this.toMinutes(end), negate: false })

        return this
    }

    /** 
     * Only run when the current time is outside `[start, end]`.
     * 
     * @param callback 
     * @returns 
     */
    unlessBetween(start: string, end: string): this {
        this.windows.push({ start: this.toMinutes(start), end: this.toMinutes(end), negate: true })

        return this
    }

    private toMinutes(time: string): number {
        const [h, m] = parseTime(time)

        return h * 60 + m
    }

    /** 
     * Prevent the task from overlapping itself; the lock expires after `expiresMinutes`. 
     * 
     * @param expiresMinutes 
     * @returns 
     */
    withoutOverlapping(expiresMinutes = 1440): this {
        this.withoutOverlappingValue = true
        this.overlapExpiresMinutes = expiresMinutes

        return this
    }

    /** 
     * Run on only one server per due minute (requires a shared cache store).
     * 
     * @param callback 
     * @returns 
     */
    onOneServer(): this {
        this.onOneServerValue = true

        return this
    }

    /** 
     * Run the task in a detached background process (command/exec only).
     * 
     * @param callback 
     * @returns 
     */
    runInBackground(): this {
        this.runInBackgroundValue = true

        return this
    }

    /** 
     * A human description shown by `schedule:list`.
     * 
     * @param callback 
     * @returns 
     */
    description(description: string): this {
        this.descriptionValue = description

        return this
    }

    /** 
     * An explicit mutex name (otherwise derived from the expression + description).  
     * 
     * @param name 
     * @returns 
     */
    name(name: string): this {
        this.mutexNameValue = name

        return this
    }

    before(hook: HookCallback): this {
        this.beforeHooks.push(hook)

        return this
    }
    after(hook: HookCallback): this {
        this.afterHooks.push(hook)

        return this
    }
    onSuccess(hook: HookCallback): this {
        this.successHooks.push(hook)

        return this
    }
    onFailure(hook: HookCallback): this {
        this.failureHooks.push(hook)

        return this
    }

    /** 
     * Whether the cron expression is due at `date`. 
     * 
     * @param date 
     * @returns 
     */
    isDue(date: Date = new Date()): boolean {
        return isDue(this.expression, date, this.timezoneValue)
    }

    /** 
     * The next time this event will run after `from`. 
     * 
     * @param date 
     * @returns 
     */
    nextRunAt(from: Date = new Date()): Date | null {
        return nextRun(this.expression, from, this.timezoneValue)
    }

    /** 
     * Whether environment, time-window, `when` and `skip` constraints all pass. 
     * 
     * @param date 
     * @returns 
     */
    async filtersPass(date: Date = new Date()): Promise<boolean> {
        if (this.environmentsValue) {
            const current = String(env('APP_ENV', '') || '')

            if (!this.environmentsValue.includes(current)) {
                return false
            }
        }

        for (const window of this.windows) {
            const now = minutesOfDay(date, this.timezoneValue)
            const inside = window.start <= window.end
                ? now >= window.start && now <= window.end
                : now >= window.start || now <= window.end // overnight window

            if (inside === window.negate) {
                return false
            }
        }

        for (const filter of this.filters) {
            if (!(await filter())) return false
        }

        for (const reject of this.rejects) {
            if (await reject()) return false
        }

        return true
    }

    /** 
     * A stable mutex key derived from the expression + description (or an explicit name).  
     * 
     * @returns 
     */
    mutexName(): string {
        if (this.mutexNameValue) {
            return `arkstack-schedule-${this.mutexNameValue}`
        }

        const hash = createHash('sha1').update(`${this.type}:${this.expression}:${this.descriptionValue}`).digest('hex')

        return `arkstack-schedule-${hash}`
    }

    /**
     * Run the task now, honouring overlap/one-server locks and lifecycle hooks.
     * Assumes the event is already due and its filters pass.
     *
     * @param date  The reference moment (used for the one-server per-minute key).
     */
    async run(date: Date = new Date()): Promise<RunResult> {
        const base = { description: this.descriptionValue, expression: this.expression }

        if (this.onOneServerValue) {
            const minute = Math.floor(date.getTime() / 60_000)
            const key = `${this.mutexName()}-server-${minute}`

            if (!(await acquireLock(key, 60))) {
                return { ...base, ran: false, skipped: 'one-server' }
            }
        }

        let overlapKey: string | undefined

        if (this.withoutOverlappingValue) {
            overlapKey = this.mutexName()

            if (!(await acquireLock(overlapKey, this.overlapExpiresMinutes * 60))) {
                return { ...base, ran: false, skipped: 'overlapping' }
            }
        }

        let error: unknown

        try {
            await this.callHooks(this.beforeHooks)
            await this.executeTask()
            await this.callHooks(this.successHooks)
        } catch (caught) {
            error = caught
            await this.callHooks(this.failureHooks, caught)
        } finally {
            await this.callHooks(this.afterHooks, error)

            // A background task releases its own overlap lock when it finishes;
            // here we release it once the (awaited) task completes.
            if (overlapKey && !this.runInBackgroundValue) {
                await releaseLock(overlapKey)
            }
        }

        return { ...base, ran: !error, error }
    }

    private async callHooks(hooks: HookCallback[], error?: unknown): Promise<void> {
        for (const hook of hooks) {
            await hook(error)
        }
    }

    private async executeTask(): Promise<void> {
        switch (this.type) {
            case 'call':
                await this.callTask?.()

                return
            case 'job': {
                const specifier = '@arkstack/jobs'
                const { dispatch } = await import(specifier)
                await dispatch(this.jobPayload as never)

                return
            }
            case 'command': {
                const consoleEntry = join(Arkstack.rootDir(), 'node_modules', '@arkstack', 'console', 'dist', 'index.js')
                await this.spawnProcess(process.execPath, [consoleEntry, ...(this.processCommand ? [this.processCommand] : []), ...this.processArgs])

                return
            }
            case 'exec':
                await this.spawnProcess(this.processCommand ?? '', this.processArgs, true)

                return
        }
    }

    private spawnProcess(command: string, args: string[], shell = false): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd: Arkstack.rootDir(),
                shell,
                detached: this.runInBackgroundValue,
                stdio: this.runInBackgroundValue ? 'ignore' : 'inherit',
            })

            if (this.runInBackgroundValue) {
                child.unref()
                resolve()

                return
            }

            child.on('error', reject)
            child.on('exit', (code) => code === 0
                ? resolve()
                : reject(new Error(`Scheduled process exited with code ${code}`)))
        })
    }
}
