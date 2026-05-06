type Position = 'before' | 'after' | (string & {})

export type IHook = {
    [P in Position]?: (...args: any[]) => void
}

export class Hook {
    private static hooks = new Map<string, IHook>()

    /**
     * Hooks define code that should run within defined boundaries to add extra functionalities.
     * 
     * @param name 
     * @param value 
     */
    static set = (
        name: string,
        hook: IHook
    ) => {
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
    static has = (name: string, pos?: Position) => {
        if (pos && this.hooks.has(name))
            return Boolean(this.get(name, pos))

        return this.hooks.has(name)
    }

    /**
     * Retrieve a defined hook by name
     * 
     * @param name 
     */
    static get<N extends string> (name: N): IHook | undefined
    /**
     * Retrieve a defined hook by name and position
     * 
     * @param name 
     * @param pos 
     */
    static get<N extends string> (name: N, pos: Position): IHook[Position] | undefined
    static get<N extends string> (
        name: N,
        pos?: Position
    ): IHook | IHook[Position] | undefined {
        const hook = this.hooks.get(name)

        if (!hook) return undefined

        if (pos !== undefined) {
            if (!hook[pos]) return undefined

            return hook[pos]
        }


        return hook
    }

    /**
     * Retrieve all defined hooks
     * 
     * @param name 
     */
    static getAll = () => {
        const hooks: Record<string, IHook> = {}

        for (const [name, value] of this.hooks)
            hooks[name] = value

        return hooks
    }

    /**
     * Remove the defined hook
     * 
     * @param name 
     */
    static unset = (name?: string, pos?: Position) => {
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
