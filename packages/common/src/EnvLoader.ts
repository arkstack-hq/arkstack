import type { EnvReturn } from './types'
import { config as loadEnvFile } from 'dotenv'

/**
 * Loads environment variables, reading the `.env` file on first access.
 *
 * The `.env` file is loaded lazily the first time a variable is read, so
 * environment access never depends on a side-effect `import 'dotenv/config'`
 * running first. Import ordering — which linters and bundlers may rewrite —
 * could otherwise place an env-reading module before dotenv has populated
 * `process.env`, leaving that module with default/stale values.
 * `dotenv.config()` never overrides variables already set, so the lazy load is
 * safe alongside other loaders.
 */
export class EnvLoader {
    private loaded = false
    /**
     * Load the `.env` file once.
     * 
     * @returns 
     */
    private ensureLoaded(): void {
        if (this.loaded) {
            return
        }

        this.loaded = true

        try {
            loadEnvFile({
                quiet: true,
                // `ark dev` is a long-lived parent process. Its restarted server
                // children inherit the parent's original dotenv values, so let
                // each fresh child replace those cached values from the current
                // file. Normal runtimes retain dotenv's shell-first precedence.
                override: process.env.ARKSTACK_ENV_RELOAD === 'true',
            })
        } catch {
            /** No .env file (or dotenv unavailable); use process.env as-is. */
        }
    }

    /**
     * Read an environment variable, coercing booleans, numbers and `null`, and
     * falling back to `defaultValue` when it is unset.
     *
     * @param name          The variable name.
     * @param defaultValue  Returned when the variable is unset.
     */
    get<X = never, D = undefined, K extends string = string>(
        name: K,
        defaultValue?: D,
    ): EnvReturn<X, K, D> {
        this.ensureLoaded()

        let val: string | number | boolean | undefined | null =
            process.env[name] ?? ''

        if ([true, 'true', 'on', false, 'false', 'off'].includes(val)) {
            val = [true, 'true', 'on'].includes(val)
        }

        if (
            !isNaN(Number(val)) &&
            typeof val !== 'boolean' &&
            typeof val !== 'undefined' &&
            val !== ''
        ) {
            val = Number(val)
        }

        if (val === '') {
            val = undefined
        }

        if (val === 'null') {
            val = null
        }

        val ??= defaultValue as typeof val

        return val as EnvReturn<X, K, D>
    }
}

/** 
 * Shared environment loader backing {@link env}.
 */
export const envLoader = new EnvLoader()
