import { AsyncLocalStorage } from 'node:async_hooks'

interface LocaleContext {
  locale: string
}

const storage = new AsyncLocalStorage<LocaleContext>()

/**
 * The locale context of the current request or `Lang.withLocale()` call.
 */
export const localeContext = () => storage.getStore()

/**
 * Run `callback` with its own locale. `Lang.setLocale()` inside it only
 * changes this context, so concurrent requests never see each other's locale.
 */
export const runWithLocale = <T>(locale: string, callback: () => T): T => storage.run({ locale }, callback)
