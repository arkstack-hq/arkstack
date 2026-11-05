import { ArkstackPlugin } from './ArkstackPlugin'
import { CommandConstructor } from './types'
import { Hook } from './Hook'

interface InstalledPlugin {
  plugin: ArkstackPlugin
  dispose: Array<() => void>
}

/**
 * The process-wide registry of installed {@link ArkstackPlugin}s. Plugin hooks
 * are added with {@link Hook.listen}, so they run alongside the app's own.
 */
export class Plugins {
  private static installed = new Map<string, InstalledPlugin>()

  /**
   * Install plugins. A plugin whose name is already installed is skipped, so
   * importing the bootstrap file twice does not register it twice.
   *
   * @param plugins
   */
  static use(...plugins: ArkstackPlugin[]): void {
    for (const plugin of plugins) {
      if (this.installed.has(plugin.name)) continue

      plugin.register()

      const dispose = Object.entries(plugin.hooks())
        .filter(([, hook]) => hook !== undefined)
        .map(([name, hook]) => Hook.listen(name, hook!))

      this.installed.set(plugin.name, { plugin, dispose })
    }
  }

  /**
   * Check if a plugin is installed.
   *
   * @param name
   */
  static has(name: string): boolean {
    return this.installed.has(name)
  }

  /**
   * Retrieve an installed plugin by name.
   *
   * @param name
   */
  static get<T extends ArkstackPlugin = ArkstackPlugin>(name: string): T | undefined {
    return this.installed.get(name)?.plugin as T | undefined
  }

  /**
   * Retrieve every installed plugin, in install order.
   */
  static all(): ArkstackPlugin[] {
    return [...this.installed.values()].map(({ plugin }) => plugin)
  }

  /**
   * The console commands of every installed plugin.
   */
  static commands(): CommandConstructor[] {
    return this.all().flatMap((plugin) => plugin.commands())
  }

  /**
   * Throw when an installed plugin does not work with the named driver.
   *
   * @param driver
   */
  static assertSupports(driver: string): void {
    const unsupported = this.all().filter((plugin) => !plugin.supports(driver))

    if (unsupported.length < 1) return

    const names = unsupported.map((plugin) => `${plugin.name} (${plugin.drivers.join(', ')})`).join('; ')

    throw new Error(`These plugins do not support the "${driver}" driver: ${names}`)
  }

  /**
   * Uninstall a plugin and remove its hook listeners.
   *
   * @param name
   */
  static remove(name: string): void {
    this.installed.get(name)?.dispose.forEach((dispose) => dispose())
    this.installed.delete(name)
  }

  /**
   * Uninstall every plugin.
   */
  static clear(): void {
    for (const name of [...this.installed.keys()]) this.remove(name)
  }
}
