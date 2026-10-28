import type { Replacements, TranslationKey, TranslationValue } from './types'

import { Lang } from './Lang'

/**
 * Translate a key.
 *
 * @example
 * __('messages.welcome', { name: 'Ada' }) // "Welcome, Ada!"
 *
 * @param key      e.g. `messages.welcome` (autocompleted once types are generated).
 * @param replace  Values for `:placeholder` tokens.
 * @param locale   Locale to use instead of the current one.
 */
export function __<K extends TranslationKey>(key: K, replace?: Replacements, locale?: string): TranslationValue<K> {
  return Lang.get(key, replace, locale)
}

/**
 * Alias of {@link __}.
 */
export const trans = __

/**
 * Translate a pluralized key. `:count` is filled in automatically.
 *
 * @example
 * transChoice('cart.items', 3) // "3 items"
 *
 * @param key      Translation key whose line has `|`-separated forms.
 * @param count    Number to pluralize for, or an array/collection whose length is used.
 * @param replace  Values for `:placeholder` tokens.
 * @param locale   Locale to use instead of the current one.
 */
export function transChoice<K extends TranslationKey>(
  key: K,
  count: number | unknown[] | { length: number } | { count(): number },
  replace?: Replacements,
  locale?: string,
): string {
  return Lang.choice(key, count, replace, locale)
}
