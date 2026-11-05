import { CommandConstructor, HookMap } from './types'

/**
 * Base class for packages that extend an Arkstack app. A plugin adds hook
 * listeners and console commands, and can be limited to some drivers.
 * Install it with `Plugins.use()` or `app.use()`.
 */
export abstract class ArkstackPlugin {
  abstract readonly name: string

  /**
   * Driver names the plugin works with, such as `express`. Empty means every driver.
   */
  readonly drivers: string[] = []

  /**
   * Hook listeners added when the plugin is installed.
   */
  hooks(): HookMap {
    return {}
  }

  /**
   * Console command classes added to `ark`.
   */
  commands(): CommandConstructor[] {
    return []
  }

  /**
   * Runs once when the plugin is installed.
   */
  register(): void {}

  /**
   * Whether the plugin works with the named driver.
   *
   * @param driver
   */
  supports(driver: string): boolean {
    return this.drivers.length < 1 || this.drivers.includes(driver)
  }
}
