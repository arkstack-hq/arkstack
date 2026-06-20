/**
 * The low level contract every cache store driver must satisfy.
 *
 * Stores are intentionally thin: they only deal in raw key/value persistence
 * and expiration. The higher level convenience API (`remember`, `add`, `pull`,
 * default value resolution, etc.) lives in {@link Repository}, which wraps a
 * store. This keeps drivers simple and behaviour consistent across backends.
 */
export abstract class Store {
    /**
     * Retrieve the value for the given key, or `null` when the key is missing
     * or has expired.
     * 
     * @param key 
     */
    abstract get<T = unknown> (key: string): Promise<T | null>

    /**
     * Store a value for the given key.
     *
     * @param key       The cache key.
     * @param value     The value to store (will be serialized by the driver).
     * @param seconds   Lifetime in seconds, or `null` to store forever.
     * @returns         Whether the value was stored.
     */
    abstract put (key: string, value: unknown, seconds?: number | null): Promise<boolean>

    /**
     * Store a value that never expires.
     * 
     * @param key 
     * @param value 
     */
    abstract forever (key: string, value: unknown): Promise<boolean>

    /**
     * Increment a numeric value, creating it (starting at 0) when absent.
     *
     * @returns The new value, or `false` when the existing value is not numeric.
     * 
     * @param key 
     * @param value 
     */
    abstract increment (key: string, value?: number): Promise<number | false>

    /**
     * Decrement a numeric value, creating it (starting at 0) when absent.
     *
     * @returns The new value, or `false` when the existing value is not numeric.
     * 
     * @param key 
     * @param value 
     */
    abstract decrement (key: string, value?: number): Promise<number | false>

    /**
     * Remove a single key from the store.
     * 
     * @param key 
     * @param value 
     */
    abstract forget (key: string): Promise<boolean>

    /**
     * Remove every entry owned by this store.
     */
    abstract flush (): Promise<boolean>

    /**
     * The key prefix applied to every entry by this store.
     */
    abstract getPrefix (): string
}
