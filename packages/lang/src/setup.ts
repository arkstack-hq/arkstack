import { __, trans, transChoice } from './helpers'

/**
 * Register the global translation helpers and share them with Edge views.
 *
 * ```ts
 * // src/core/bootstrap.ts
 * import '@arkstack/lang/setup'
 * ```
 */
globalThis.__ = __
globalThis.trans = trans
globalThis.transChoice = transChoice

// Make the helpers available in Edge templates when @arkstack/view is installed.
try {
  const { View } = await import('@arkstack/view')

  View.share({ __, trans, transChoice })
} catch {
  /* @arkstack/view is not installed */
}
