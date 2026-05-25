import type { SessionDriverResult, SessionErrorRecord, SessionErrorValue, SessionInitialState, SessionPayload } from './types'

import { ErrorBag } from './ErrorBag'

export class Session {
    public readonly errors: ErrorBag
    readonly id?: string
    private data: Record<string, any>
    private persistent?: SessionDriverResult

    constructor(initial?: SessionInitialState | Record<string, any>, persistent?: SessionDriverResult) {
        const state = initial && ('data' in initial || 'errors' in initial)
            ? initial as SessionInitialState
            : { data: initial as Record<string, any> | undefined }

        this.id = persistent?.id
        this.persistent = persistent
        this.data = { ...(state.data || {}) }
        this.errors = state.errors instanceof ErrorBag
            ? state.errors
            : new ErrorBag(state.errors)

        globalThis.session = (key?: string) => key ? this.get(key) : this
    }

    private snapshot (): SessionPayload {
        return {
            data: this.all(),
            errors: this.errors.toJSON(),
        }
    }

    private queuePersist () {
        void this.save()
    }

    async save () {
        await this.persistent?.save(this.snapshot())

        return this
    }

    async destroy () {
        this.data = {}
        this.errors.clear()
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
        }
    }
}