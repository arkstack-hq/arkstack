import type {
    SessionDriverResult,
    SessionErrorRecord,
    SessionErrorValue,
    SessionInitialState,
    SessionPayload,
} from './types'

import { ErrorBag } from './ErrorBag'
import { FlashBag } from './FlashBag'

export class Session {
    public readonly errors: ErrorBag
    public readonly flashBag: FlashBag
    readonly id?: string
    private data: Record<string, any>
    private persistent?: SessionDriverResult
    private saveQueue: Promise<void> = Promise.resolve()

    constructor(
        initial?: SessionInitialState | Record<string, any> | Session,
        persistent?: SessionDriverResult,
    ) {
        const current = initial instanceof Session ? initial : undefined
        const state = current
            ? current.snapshot()
            : initial &&
                ('data' in initial || 'errors' in initial || 'flash' in initial)
                ? (initial as SessionInitialState)
                : { data: initial as Record<string, any> | undefined }

        this.id = persistent?.id ?? current?.id
        this.persistent = persistent ?? current?.persistent
        this.saveQueue = current?.saveQueue ?? this.saveQueue
        this.data = current ? current.data : { ...(state.data || {}) }
        this.errors = current
            ? current.errors
            : state.errors instanceof ErrorBag
                ? state.errors
                : new ErrorBag(state.errors)
        this.flashBag = current
            ? current.flashBag
            : state.flash instanceof FlashBag
                ? state.flash
                : new FlashBag(state.flash as Record<string, any> | undefined)

        const helper = ((key?: string) =>
            key ? this.get(key) : this) as typeof globalThis.session &
            Partial<Session> &
            Record<string, any>

        Object.assign(helper, {
            get: this.get.bind(this),
            put: this.put.bind(this),
            set: this.set.bind(this),
            has: this.has.bind(this),
            forget: this.forget.bind(this),
            clear: this.clear.bind(this),
            all: this.all.bind(this),
            flash: this.flash.bind(this),
            getFlash: this.getFlash.bind(this),
            hasErrors: this.hasErrors.bind(this),
            clearErrors: this.clearErrors.bind(this),
            errors: this.errors,
            flashBag: this.flashBag,
        })

        globalThis.session = helper as typeof globalThis.session
    }

    private snapshot (): SessionPayload {
        return {
            data: this.all(),
            errors: this.errors.toJSON(),
            flash: this.flashBag.toJSON(),
        }
    }

    private queuePersist () {
        void this.save()
    }

    async save () {
        const payload = this.snapshot()

        const previous = this.saveQueue.catch(() => undefined)

        this.saveQueue = previous.then(async () => {
            await this.persistent?.save(payload)
        })

        await this.saveQueue

        return this
    }

    async destroy () {
        this.data = {}
        this.errors.clear()
        this.flashBag.clear()
        await this.persistent?.destroy?.()

        return this
    }

    /**
     * Get an item from the session bag
     *
     * @param key
     * @param defaultValue
     * @returns
     */
    get<T = any> (key: string, defaultValue?: T): T {
        return (key in this.data ? this.data[key] : defaultValue) as T
    }

    /**
     * Add an item to the session bag
     *
     * @param key
     * @param defaultValue
     * @returns
     */
    put<T = any> (key: string, value: T) {
        this.data[key] = value
        this.queuePersist()

        return this
    }

    /**
     * Add an item to the session bag
     *
     * @param key
     * @param defaultValue
     * @returns
     */
    set<T = any> (key: string, value: T) {
        return this.put(key, value)
    }

    /**
     * Check if an item exist in the session bag
     *
     * @param key
     * @returns
     */
    has (key: string) {
        return key in this.data
    }

    /**
     * Remove an item from the session bag
     *
     * @param key
     * @returns
     */
    forget (key: string) {
        delete this.data[key]
        this.queuePersist()

        return this
    }

    /**
     * Clear the session bag
     *
     * @returns
     */
    clear () {
        this.data = {}
        this.errors.clear()
        this.flashBag.clear()
        this.queuePersist()

        return this
    }

    /**
     * Get all items in the session bag
     *
     * @returns
     */
    all () {
        return { ...this.data }
    }

    /**
     * Add a flash item for the next request
     *
     * @param key
     * @param value
     * @returns
     */
    flash<T = any> (key: string, value: T) {
        this.flashBag.put(key, value)
        this.queuePersist()

        return this
    }

    /**
     * Get a flash item
     *
     * @param key
     * @param defaultValue
     * @returns
     */
    getFlash<T = any> (key: string, defaultValue?: T): T {
        return this.flashBag.get(key, defaultValue) as T
    }

    /**
     * Sweep flashed data that was loaded for this request
     *
     * @returns
     */
    async sweepFlash () {
        this.errors.sweep()
        this.flashBag.sweep()
        await this.save()

        return this
    }

    /**
     * Add an error to the session error bag
     *
     * @param field
     * @param message
     * @returns
     */
    addError (field: string, message: SessionErrorValue) {
        this.errors.add(field, message)
        this.queuePersist()

        return this
    }

    /**
     * Add multiple errors to the session error bag
     *
     * @param errors
     * @returns
     */
    addErrors (errors: SessionErrorRecord | ErrorBag) {
        this.errors.merge(errors)
        this.queuePersist()

        return this
    }

    /**
     * Add a validation error to the session error bag
     *
     * @param error
     * @returns
     */
    addValidationErrors (error: unknown) {
        this.errors.validation(error)
        this.queuePersist()

        return this
    }

    /**
     * Check if the session error bag has any errors
     *
     * @param field
     * @returns
     */
    hasErrors (field?: string) {
        return this.errors.has(field)
    }

    /**
     * Clear all errors in the session error bag
     *
     * @param field
     * @returns
     */
    clearErrors (field?: string) {
        this.errors.clear(field)
        this.queuePersist()

        return this
    }

    /**
     * Parse session for views
     *
     * @returns
     */
    forView () {
        return {
            ...this.all(),
            errors: this.errors,
            flash: this.flashBag,
        }
    }

    /**
     * Return session as json
     *
     * @returns
     */
    toJSON () {
        return {
            ...this.all(),
            errors: this.errors.toJSON(),
            flash: this.flashBag.toJSON(),
        }
    }
}
