import type { MissingKeyHandler, Replacements, TranslationKey, TranslationLines, TranslationValue } from './types'

import { FileLoader } from './FileLoader'
import { Translator } from './Translator'
import { resolveRuntimeDir } from '@arkstack/common'

/**
 * Read an app config value without failing when config is unavailable
 * (e.g. in a bare script or test).
 */
const appConfig = <T>(key: string, fallback: T): T => {
  try {
    const value = (globalThis as any).config?.(key)

    return value === undefined || value === null || value === '' ? fallback : value
  } catch {
    return fallback
  }
}

/**
 * The application's lang directory: `app.lang_path` when configured, otherwise
 * `src/lang` in development and its build output in production.
 */
export const langPath = (): string => {
  const configured = appConfig<string | undefined>('app.lang_path', undefined)

  return configured ?? resolveRuntimeDir('src/lang')
}

/**
 * Static access to the application's translator.
 *
 * The default translator reads `src/lang/{locale}/{group}.ts` and takes its
 * locales from `app.locale` and `app.fallback_locale`.
 */
export class Lang {
  private static instance?: Translator

  /**
   * The shared translator, created on first use.
   */
  static translator(): Translator {
    this.instance ??= new Translator(new FileLoader(langPath), {
      locale: appConfig('app.locale', 'en'),
      fallbackLocale: appConfig<string | null>('app.fallback_locale', 'en'),
    })

    return this.instance
  }

  /**
   * Replace the shared translator (e.g. with a custom loader or in tests).
   * Pass nothing to reset to the default on next use.
   */
  static setTranslator(translator?: Translator): typeof Lang {
    this.instance = translator

    return this
  }

  static get<K extends TranslationKey>(key: K, replace?: Replacements, locale?: string): TranslationValue<K> {
    return this.translator().get(key, replace, locale) as TranslationValue<K>
  }

  static choice<K extends TranslationKey>(
    key: K,
    count: number | unknown[] | { length: number } | { count(): number },
    replace?: Replacements,
    locale?: string,
  ): string {
    return this.translator().choice(key, count, replace, locale)
  }

  static has(key: TranslationKey, locale?: string, fallback = true): boolean {
    return this.translator().has(key, locale, fallback)
  }

  static hasForLocale(key: TranslationKey, locale?: string): boolean {
    return this.translator().hasForLocale(key, locale)
  }

  static locale(): string {
    return this.translator().locale()
  }

  static getLocale(): string {
    return this.translator().locale()
  }

  static setLocale(locale: string): typeof Lang {
    this.translator().setLocale(locale)

    return this
  }

  static isLocale(locale: string): boolean {
    return this.translator().isLocale(locale)
  }

  static getFallback(): string | null {
    return this.translator().getFallback()
  }

  static setFallback(locale: string | null): typeof Lang {
    this.translator().setFallback(locale)

    return this
  }

  static withLocale<T>(locale: string, callback: () => T): T {
    return this.translator().withLocale(locale, callback)
  }

  static addNamespace(namespace: string, hint: string): typeof Lang {
    this.translator().addNamespace(namespace, hint)

    return this
  }

  static addLines(lines: Record<string, string>, locale: string, namespace?: string): typeof Lang {
    this.translator().addLines(lines, locale, namespace)

    return this
  }

  static handleMissingKeysUsing(handler: MissingKeyHandler | undefined): typeof Lang {
    this.translator().handleMissingKeysUsing(handler)

    return this
  }

  static group(group: string, locale?: string, namespace?: string): TranslationLines {
    return this.translator().group(group, locale, namespace)
  }

  static locales(): string[] {
    return this.translator().locales()
  }

  static flush(): typeof Lang {
    this.instance?.flush()

    return this
  }
}
