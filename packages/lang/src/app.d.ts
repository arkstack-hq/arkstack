import type { __ as Translate, transChoice as TranslateChoice } from './index'

declare global {
  /**
   * Translate a key, e.g. `__('messages.welcome', { name })`.
   */
  var __: typeof Translate
  /**
   * Alias of `__()`.
   */
  var trans: typeof Translate
  /**
   * Translate a pluralized key, e.g. `transChoice('cart.items', count)`.
   */
  var transChoice: typeof TranslateChoice
}

export {}
