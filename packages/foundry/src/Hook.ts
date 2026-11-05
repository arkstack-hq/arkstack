import { HookArgs, HookFor, HookName, HookPos, HookPositions, HookRegistry, HookResult, IHook } from './types'

export class Hook {
  private static hooks = new Map<string, IHook>()
  private static listeners = new Map<string, IHook[]>()

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
   * Add callbacks for a hook's positions alongside any others already there.
   * Unlike {@link Hook.on}, nothing is replaced, so several packages can listen
   * to the same position. Returns a function that removes these callbacks.
   *
   * @param name
   * @param hook
   */
  static listen<N extends HookName>(name: N | (string & {}), hook: Partial<HookFor<N>>): () => void {
    const listener = { ...(hook as IHook) }

    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener])

    return () => {
      const remaining = (this.listeners.get(name) ?? []).filter((entry) => entry !== listener)

      if (remaining.length > 0) this.listeners.set(name, remaining)
      else this.listeners.delete(name)
    }
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
    if (pos) return this.callbacks(name, pos as string).length > 0

    return this.hooks.has(name) || this.listeners.has(name)
  }

  /**
   * Run a hook position with the given arguments: the {@link Hook.on} callback
   * first, then every {@link Hook.listen} callback in the order they were added.
   * Returns the first callback's result, as a Promise when any callback is
   * async, so it can be awaited. A no-op returning `undefined` when nothing is
   * registered there, so call sites need no {@link Hook.has} check.
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
    const [first, ...rest] = this.callbacks(name, pos as string)

    if (!first) return undefined

    const result = first(...args)
    let pending: unknown = result

    for (const fn of rest) {
      pending = pending instanceof Promise ? pending.then(() => fn(...args)) : fn(...args)
    }

    return (pending instanceof Promise ? pending.then(() => result) : result) as HookResult<N, P & string>
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
   * Remove a hook, or one position of it, including its {@link Hook.listen}
   * callbacks. With no name, removes every hook.
   *
   * @param name
   * @param pos
   */
  static off<N extends HookName, P extends HookPositions<N>>(name?: N | (string & {}), pos?: P) {
    if (!name) return this.clear()

    if (pos === undefined) {
      this.hooks.delete(name)
      this.listeners.delete(name)

      return
    }

    const hook = this.hooks.get(name)

    if (hook) {
      delete hook[pos as string]

      if (Object.keys(hook).length < 1) this.hooks.delete(name)
    }

    const listeners = (this.listeners.get(name) ?? []).filter((listener) => {
      delete listener[pos as string]

      return Object.keys(listener).length > 0
    })

    if (listeners.length > 0) this.listeners.set(name, listeners)
    else this.listeners.delete(name)
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
    this.listeners.clear()
  }

  /**
   * Every callback registered for a position, in the order {@link Hook.emit} runs them.
   *
   * @param name
   * @param pos
   */
  private static callbacks(name: string, pos: string) {
    return [this.hooks.get(name), ...(this.listeners.get(name) ?? [])]
      .map((hook) => hook?.[pos])
      .filter((fn): fn is (...args: any[]) => unknown => typeof fn === 'function')
  }
}
