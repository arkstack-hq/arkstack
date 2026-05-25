export class FlashBag<T = unknown> {
    protected bag: Record<string, T> = {}
    private sweepKeys = new Set<string>()

    constructor(items?: Record<string, T>) {
        this.bag = { ...(items || {}) }
        this.sweepKeys = new Set(Object.keys(this.bag))
    }

    put (key: string, value: T) {
        this.bag[key] = value
        this.sweepKeys.delete(key)

        return this
    }

    set (key: string, value: T) {
        return this.put(key, value)
    }

    get (key: string, defaultValue?: T): T {
        return (key in this.bag ? this.bag[key] : defaultValue) as T
    }

    has (key?: string | string[] | null): boolean {
        if (Array.isArray(key)) {
            return key.every(item => this.has(item))
        }

        if (key) {
            return key in this.bag
        }

        return this.any()
    }

    any () {
        return Object.keys(this.bag).length > 0
    }

    isEmpty () {
        return !this.any()
    }

    isNotEmpty () {
        return this.any()
    }

    keys () {
        return Object.keys(this.bag)
    }

    all () {
        return { ...this.bag }
    }

    clear (key?: string | string[]) {
        if (Array.isArray(key)) {
            for (const item of key) {
                delete this.bag[item]
                this.sweepKeys.delete(item)
            }

            return this
        }

        if (key) {
            delete this.bag[key]
            this.sweepKeys.delete(key)

            return this
        }

        this.bag = {}
        this.sweepKeys.clear()

        return this
    }

    forget (key: string) {
        return this.clear(key)
    }

    markForSweep (keys: string[] = this.keys()) {
        this.sweepKeys = new Set(keys)

        return this
    }

    sweep () {
        for (const key of this.sweepKeys) {
            delete this.bag[key]
        }

        this.sweepKeys = new Set(Object.keys(this.bag))

        return this
    }

    toJSON () {
        return this.all()
    }
}
