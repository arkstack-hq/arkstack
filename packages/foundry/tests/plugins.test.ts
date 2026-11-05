import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ArkstackPlugin } from '../src/ArkstackPlugin'
import { Hook } from '../src/Hook'
import { Plugins } from '../src/Plugins'

class StatusCommand {}

class AuditPlugin extends ArkstackPlugin {
  readonly name = 'audit'
  readonly registered = vi.fn()
  readonly started = vi.fn()

  hooks() {
    return {
      'test:start': { after: this.started },
    }
  }

  commands() {
    return [StatusCommand]
  }

  register() {
    this.registered()
  }
}

class ExpressOnlyPlugin extends ArkstackPlugin {
  readonly name = 'express-only'
  readonly drivers = ['express']
}

describe('Plugins', () => {
  beforeEach(() => {
    Plugins.clear()
    Hook.clear()
  })

  it('registers the plugin and its hook listeners once', () => {
    const plugin = new AuditPlugin()

    Plugins.use(plugin, new AuditPlugin())
    Hook.emit('test:start', 'after', 'ok')

    expect(plugin.registered).toHaveBeenCalledTimes(1)
    expect(plugin.started).toHaveBeenCalledWith('ok')
    expect(Plugins.all()).toEqual([plugin])
    expect(Plugins.get('audit')).toBe(plugin)
  })

  it('keeps plugin listeners next to the app own hook', () => {
    const plugin = new AuditPlugin()
    const own = vi.fn()

    Plugins.use(plugin)
    Hook.on('test:start', { after: own })
    Hook.emit('test:start', 'after')

    expect(own).toHaveBeenCalledTimes(1)
    expect(plugin.started).toHaveBeenCalledTimes(1)
  })

  it('collects console commands from every plugin', () => {
    Plugins.use(new AuditPlugin(), new ExpressOnlyPlugin())

    expect(Plugins.commands()).toEqual([StatusCommand])
  })

  it('removes a plugin and its listeners', () => {
    const plugin = new AuditPlugin()

    Plugins.use(plugin)
    Plugins.remove('audit')
    Hook.emit('test:start', 'after')

    expect(Plugins.has('audit')).toBe(false)
    expect(plugin.started).not.toHaveBeenCalled()
  })

  it('rejects a driver a plugin does not support', () => {
    Plugins.use(new ExpressOnlyPlugin())

    expect(() => Plugins.assertSupports('express')).not.toThrow()
    expect(() => Plugins.assertSupports('h3')).toThrow('express-only (express)')
  })
})
