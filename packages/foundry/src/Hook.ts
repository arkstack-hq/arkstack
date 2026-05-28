import { HookArgs, HookFor, HookName, HookPos, HookPositions, HookRegistry, IHook } from './types'

export class Hook {
    private static hooks = new Map<string, IHook>()

    /**
     * Hooks define code that should run within defined boundaries to add extra functionalities.
     * 
     * @param name 
     * @param value 
     */
    static set<N extends HookName> (
        name: N | (string & {}),
        hook: HookFor<N>
    ) {
        const oldhook = this.hooks.get(name) ?? {}

        this.hooks.set(name, {
            ...oldhook,
            ...hook,
        })
    }

    /**
     * Check if a hook is defined by name
     * 
     * @param name 
     */
    static has<N extends HookName, P extends HookPositions<N>> (name: N | (string & {}), pos?: P) {
        if (pos && this.hooks.has(name))
            return Boolean(this.get(name, pos))

        return this.hooks.has(name)
    }

    /**
     * Retrieve a defined hook by name
     * 
     * @param name 
     */
    static get<N extends HookName> (name: N): HookFor<N> | undefined
    /**
     * Retrieve a defined hook by name and position
     * 
     * @param name 
     * @param pos 
     */
    static get<N extends HookName, P extends HookPositions<N>> (name: N, pos: P): HookPos<N, P> | undefined
    /**
     * Retrieve a defined hook by name and position the set args for callback
     * 
     * @param name 
     * @param pos 
     */
    static get<N extends HookName, P extends HookPositions<N>> (name: N, pos: P, ...args: HookArgs<N, P>): void
    static get<N extends HookName, P extends HookPositions<N>> (
        name: N,
        pos?: P,
        ...args: HookArgs<N, P> | any[]
    ): HookFor<N> | HookPos<N, P> | undefined {
        const hook = this.hooks.get(name)

        if (!hook) return undefined
        if (pos === undefined) return hook as HookFor<N>

        const fn = hook[pos]
        if (!fn) return undefined

        if (args.length > 0) return fn(...args) as HookPos<N, P>

        return fn as HookPos<N, P>
    }

    /**
     * Retrieve all defined hooks
     * 
     * @param name 
     */
    static getAll = () => {
        const hooks: Record<string, IHook> & HookRegistry = {}

        for (const [name, value] of this.hooks)
            hooks[name] = value

        return hooks
    }

    /**
     * Remove the defined hook
     * 
     * @param name 
     */
    static unset<N extends HookName, P extends HookPositions<N>> (name?: N | (string & {}), pos?: P) {
        if (name && this.hooks.has(name)) {
            if (pos !== undefined) {
                const hook = this.get(name)
                if (hook?.[pos]) delete hook[pos]

                return Object.keys(hook ?? {}).length < 1
                    ? void this.hooks.delete(name)
                    : undefined
            }

            this.hooks.delete(name)
        } else this.clear()
    }

    /**
     * Clear all the defined hooks
     */
    static clear = () => {
        this.hooks.clear()
    }
}
