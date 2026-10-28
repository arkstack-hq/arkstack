import type { MissingKeyHandler, Replacements, TranslationLines, TranslationLoader, TranslatorOptions } from './types'
import { localeContext, runWithLocale } from './context'

import { MessageSelector } from './MessageSelector'
import { deepMerge } from './FileLoader'

interface ResolvedLine {
  line: string | TranslationLines
  locale: string
}

/**
 * Resolves translation keys to lines for a locale.
 *
 * Keys are `group.key.nested` for application translations (the group is the
 * file name in `src/lang/{locale}`) or `namespace::group.key` for translations
 * registered by packages. Missing keys fall back to the fallback locale, then
 * to the key itself.
 */
export class Translator {
  private defaultLocale: string
  private fallbackLocale: string | null
  private readonly loaded = new Map<string, TranslationLines>()
  private readonly selector = new MessageSelector()
  private missingKeyHandler?: MissingKeyHandler

  constructor(
    private readonly loader: TranslationLoader,
    options: Omit<TranslatorOptions, 'loader'> = {},
  ) {
    this.defaultLocale = Translator.assertLocale(options.locale ?? 'en')
    this.fallbackLocale = options.fallbackLocale === undefined ? 'en' : options.fallbackLocale
  }

  /**
   * Get the translation for a key.
   *
   * @param key       e.g. `messages.welcome` or `billing::invoices.paid`.
   * @param replace   Values for `:placeholder` tokens.
   * @param locale    Locale to use instead of the current one.
   * @param fallback  Try the fallback locale when the key is missing.
   * @returns         The line, the nested group for a group key, or the key itself when missing.
   */
  get(key: string, replace: Replacements = {}, locale?: string, fallback = true): string | TranslationLines {
    const resolved = this.resolve(key, locale, fallback)

    if (resolved) return this.replaceIn(resolved.line, replace)

    return this.missing(key, replace, locale ?? this.locale())
  }

  /**
   * Get a pluralized line, e.g. `'apple|apples'` or `'{0} none|[1,*] :count items'`.
   *
   * `:count` is filled in automatically.
   *
   * @param key      Translation key.
   * @param count    Number to pluralize for, or an array/collection whose length is used.
   * @param replace  Values for `:placeholder` tokens.
   * @param locale   Locale to use instead of the current one.
   */
  choice(
    key: string,
    count: number | unknown[] | { length: number } | { count(): number },
    replace: Replacements = {},
    locale?: string,
  ): string {
    const number = Translator.countOf(count)
    const values = { count: number, ...replace }
    const resolved = this.resolve(key, locale, true)

    if (!resolved || typeof resolved.line !== 'string') {
      const missing = this.missing(key, values, locale ?? this.locale())

      return this.makeReplacements(this.selector.choose(missing, number, locale ?? this.locale()), values)
    }

    return this.makeReplacements(this.selector.choose(resolved.line, number, resolved.locale), values)
  }

  /**
   * Whether a key exists in the current (or given) locale, or its fallback.
   */
  has(key: string, locale?: string, fallback = true): boolean {
    return this.resolve(key, locale, fallback) !== undefined
  }

  /**
   * Whether a key exists in exactly the given locale (no fallback).
   */
  hasForLocale(key: string, locale?: string): boolean {
    return this.has(key, locale, false)
  }

  /**
   * The active locale: the current request's locale when inside one, otherwise
   * the default locale.
   */
  locale(): string {
    return localeContext()?.locale ?? this.defaultLocale
  }

  getLocale(): string {
    return this.locale()
  }

  /**
   * Change the active locale. Inside a request (or `withLocale`) this only
   * affects that request; outside one it changes the default.
   */
  setLocale(locale: string): this {
    Translator.assertLocale(locale)

    const context = localeContext()

    if (context) context.locale = locale
    else this.defaultLocale = locale

    return this
  }

  /**
   * Whether the active locale matches `locale`.
   */
  isLocale(locale: string): boolean {
    return this.locale() === locale
  }

  getFallback(): string | null {
    return this.fallbackLocale
  }

  setFallback(locale: string | null): this {
    this.fallbackLocale = locale === null ? null : Translator.assertLocale(locale)

    return this
  }

  /**
   * Run `callback` with a different locale, restoring it afterwards. Safe across
   * `await`s and concurrent requests.
   */
  withLocale<T>(locale: string, callback: () => T): T {
    return runWithLocale(Translator.assertLocale(locale), callback)
  }

  /**
   * Register a package's translation directory under a namespace, so its keys
   * resolve as `namespace::group.key`.
   */
  addNamespace(namespace: string, hint: string): this {
    this.loader.addNamespace(namespace, hint)

    return this
  }

  /**
   * Add lines at runtime. Keys are `group.key` (dot notation allowed).
   *
   * @example
   * Lang.addLines({ 'messages.welcome': 'Hi :name' }, 'en')
   */
  addLines(lines: Record<string, string>, locale: string, namespace = '*'): this {
    for (const [key, value] of Object.entries(lines)) {
      const [group, ...rest] = key.split('.')

      if (!group || !rest.length) continue

      const current = this.loadGroup(namespace, group, locale)
      const addition = rest.reduceRight<TranslationLines | string>((acc, segment) => ({ [segment]: acc }), value)

      this.loaded.set(this.cacheKey(namespace, group, locale), deepMerge(current, addition as TranslationLines))
    }

    return this
  }

  /**
   * Handle keys that are missing in every locale (e.g. to log them).
   */
  handleMissingKeysUsing(handler: MissingKeyHandler | undefined): this {
    this.missingKeyHandler = handler

    return this
  }

  /**
   * All lines of a group for a locale, e.g. for sending to a frontend.
   */
  group(group: string, locale?: string, namespace = '*'): TranslationLines {
    return this.loadGroup(namespace, group, locale ?? this.locale())
  }

  /**
   * Locales available to the application.
   */
  locales(): string[] {
    return this.loader.locales()
  }

  getLoader(): TranslationLoader {
    return this.loader
  }

  /**
   * Forget loaded lines so files are read again on next use.
   */
  flush(): this {
    this.loaded.clear()

    return this
  }

  /**
   * Replace `:name`, `:Name` and `:NAME` tokens in a line.
   */
  makeReplacements(line: string, replace: Replacements = {}): string {
    const entries = Object.entries(replace).filter(([, value]) => value !== undefined && value !== null)

    if (!entries.length || !line.includes(':')) return line

    const map = new Map<string, string>()

    for (const [key, raw] of entries) {
      const value = String(raw)

      map.set(key, value)
    }

    for (const [key, raw] of entries) {
      const value = String(raw)
      const ucKey = key.charAt(0).toUpperCase() + key.slice(1)
      const upperKey = key.toUpperCase()

      if (!map.has(ucKey)) map.set(ucKey, value.charAt(0).toUpperCase() + value.slice(1))
      if (!map.has(upperKey)) map.set(upperKey, value.toUpperCase())
    }

    // Match the longest known name at each `:`, so `:named` with only `name` set becomes `<value>d`.
    return line.replace(/:([A-Za-z0-9_]+)/g, (token, name: string) => {
      for (let length = name.length; length > 0; length--) {
        const candidate = name.slice(0, length)

        if (map.has(candidate)) return map.get(candidate)! + name.slice(length)
      }

      return token
    })
  }

  /**
   * Split a key into namespace, group and item.
   */
  parseKey(key: string): [namespace: string, group: string, item: string | null] {
    let namespace = '*'
    let rest = key

    const separator = key.indexOf('::')

    if (separator > 0) {
      namespace = key.slice(0, separator)
      rest = key.slice(separator + 2)
    }

    const dot = rest.indexOf('.')

    if (dot === -1) return [namespace, rest, null]

    return [namespace, rest.slice(0, dot), rest.slice(dot + 1)]
  }

  private resolve(key: string, locale: string | undefined, fallback: boolean): ResolvedLine | undefined {
    const [namespace, group, item] = this.parseKey(key)
    const primary = locale ?? this.locale()
    const locales = [primary]

    if (fallback && this.fallbackLocale && this.fallbackLocale !== primary) locales.push(this.fallbackLocale)

    for (const candidate of locales) {
      const line = this.lineFor(namespace, group, candidate, item)

      if (line !== undefined) return { line, locale: candidate }
    }
  }

  private lineFor(
    namespace: string,
    group: string,
    locale: string,
    item: string | null,
  ): string | TranslationLines | undefined {
    if (!group) return undefined

    const lines = this.loadGroup(namespace, group, locale)

    if (item === null) return Object.keys(lines).length ? lines : undefined

    // A literal key containing dots wins over walking the path.
    if (typeof lines[item] === 'string') return lines[item]

    let value: string | TranslationLines | undefined = lines

    for (const segment of item.split('.')) {
      if (!value || typeof value !== 'object') return undefined

      value = value[segment]
    }

    return value
  }

  private loadGroup(namespace: string, group: string, locale: string): TranslationLines {
    const cacheKey = this.cacheKey(namespace, group, locale)
    let lines = this.loaded.get(cacheKey)

    if (!lines) {
      lines = this.loader.load(locale, group, namespace)
      this.loaded.set(cacheKey, lines)
    }

    return lines
  }

  private cacheKey(namespace: string, group: string, locale: string) {
    return `${namespace}::${group}::${locale}`
  }

  private replaceIn(line: string | TranslationLines, replace: Replacements): string | TranslationLines {
    if (typeof line === 'string') return this.makeReplacements(line, replace)

    return Object.fromEntries(Object.entries(line).map(([key, value]) => [key, this.replaceIn(value, replace)]))
  }

  private missing(key: string, replace: Replacements, locale: string): string {
    const handled = this.missingKeyHandler?.(key, replace, locale)

    return this.makeReplacements(typeof handled === 'string' ? handled : key, replace)
  }

  private static countOf(count: number | unknown[] | { length: number } | { count(): number }): number {
    if (typeof count === 'number') return count
    if (Array.isArray(count)) return count.length
    if (typeof (count as { count?: unknown }).count === 'function') return (count as { count(): number }).count()

    return Number((count as { length: number }).length ?? 0)
  }

  private static assertLocale(locale: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(locale)) {
      throw new Error(`[arkstack] Invalid locale "${locale}".`)
    }

    return locale
  }
}
