import { HookArgs, HookFor, HookName, HookPos, HookPositions, HookRegistry, HookResult, IHook } from './types'

export class Hook {
  private static hooks = new Map<string, IHook>()

  /**
   * Register callbacks for a hook's positions. Registering the same name again
   * merges: only the positions supplied are added or replaced.
   *
   * @param name
   * @param hook
   */
  static on<N extends HookName>(name: N | (string & {}), hook: Partial<HookFor<N>>) {
    const oldhook = this.hooks.get(name) ?? {}

    this.hooks.set(name, {
      ...oldhook,
      ...(hook as IHook),
    })
  }

  /**
   * @deprecated Use {@link Hook.on}; `set` merges rather than replaces.
   *
   * @param name
   * @param hook
   */
  static set<N extends HookName>(name: N | (string & {}), hook: Partial<HookFor<N>>) {
    this.on(name, hook)
  }

  /**
   * Check if a hook is defined by name, or a position of it.
   *
   * @param name
   * @param pos
   */
  static has<N extends HookName, P extends HookPositions<N>>(name: N | (string & {}), pos?: P) {
    if (pos && this.hooks.has(name)) return Boolean(this.hooks.get(name)?.[pos as string])

    return this.hooks.has(name)
  }

  /**
   * Run a hook position with the given arguments and return its result (a
   * Promise for an async hook, so it can be awaited). A no-op returning
   * `undefined` when nothing is registered there, so call sites need no
   * {@link Hook.has} check.
   *
   * @param name
   * @param pos
   * @param args
   */
  static emit<N extends HookName, P extends HookPositions<N>>(
    name: N,
    pos: P,
    ...args: HookArgs<N, P & string>
  ): HookResult<N, P & string> | undefined {
    const fn = this.hooks.get(name)?.[pos as string]

    return fn ? (fn(...args) as HookResult<N, P & string>) : undefined
  }

  /**
   * Retrieve a defined hook by name
   *
   * @param name
   */
  static get<N extends HookName>(name: N): HookFor<N> | undefined
  /**
   * Retrieve a defined hook's position by name and position
   *
   * @param name
   * @param pos
   */
  static get<N extends HookName, P extends HookPositions<N>>(name: N, pos: P): HookPos<N, P & string> | undefined
  /**
   * @deprecated Use {@link Hook.emit} to call a hook; `get` with arguments calls it.
   *
   * @param name
   * @param pos
   * @param args
   */
  static get<N extends HookName, P extends HookPositions<N>>(name: N, pos: P, ...args: HookArgs<N, P & string>): void
  static get<N extends HookName, P extends HookPositions<N>>(
    name: N,
    pos?: P,
    ...args: HookArgs<N, P & string> | any[]
  ): HookFor<N> | HookPos<N, P & string> | undefined {
    const hook = this.hooks.get(name)

    if (!hook) return undefined
    if (pos === undefined) return hook as HookFor<N>
    if (args.length > 0) return void this.emit(name, pos, ...(args as HookArgs<N, P & string>))

    return hook[pos as string] as HookPos<N, P & string> | undefined
  }

  /**
   * Retrieve all defined hooks
   */
  static all = () => {
    const hooks: Record<string, IHook> & HookRegistry = {}

    for (const [name, value] of this.hooks) hooks[name] = value

    return hooks
  }

  /**
   * @deprecated Use {@link Hook.all}.
   */
  static getAll = () => this.all()

  /**
   * Remove a hook, or one position of it. With no name, removes every hook.
   *
   * @param name
   * @param pos
   */
  static off<N extends HookName, P extends HookPositions<N>>(name?: N | (string & {}), pos?: P) {
    if (name && this.hooks.has(name)) {
      if (pos !== undefined) {
        const hook = this.hooks.get(name)
        if (hook?.[pos as string]) delete hook[pos as string]

        return Object.keys(hook ?? {}).length < 1 ? void this.hooks.delete(name) : undefined
      }

      this.hooks.delete(name)
    } else if (!name) this.clear()
  }

  /**
   * @deprecated Use {@link Hook.off}.
   *
   * @param name
   * @param pos
   */
  static unset<N extends HookName, P extends HookPositions<N>>(name?: N | (string & {}), pos?: P) {
    this.off(name, pos)
  }

  /**
   * Clear all the defined hooks
   */
  static clear = () => {
    this.hooks.clear()
  }
}
