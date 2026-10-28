import type { DotPath, DotPathValue } from '@arkstack/common'

/**
 * Map of translation groups (one per file in `src/lang/{locale}`) to their
 * lines. It is empty here and filled in by the generated `.arkstack/ark.d.ts`
 * (`ark prepare`), which is what gives `__()` key autocomplete.
 *
 * Packages that ship namespaced translations can augment it too, using
 * `'<namespace>::<group>'` as the property name:
 *
 * ```ts
 * declare module '@arkstack/lang' {
 *   interface TranslationRegistry {
 *     'billing::invoices': { paid: string }
 *   }
 * }
 * ```
 */
export interface TranslationRegistry {}

/**
 * True when no translations have been registered (no generated types yet).
 */
type RegistryIsEmpty = keyof TranslationRegistry extends never ? true : false

/**
 * A translation key such as `'messages.welcome'`.
 *
 * Once the registry is generated, keys are checked and autocompleted like
 * `config()` keys. Namespaced keys (`'pkg::group.key'`) are always accepted so
 * package translations work before they are registered.
 */
export type TranslationKey = RegistryIsEmpty extends true
  ? string
  : DotPath<TranslationRegistry> | `${string}::${string}`

/**
 * The value a key resolves to: a `string` for a single line, or the nested
 * object for a key that points at a group of lines.
 */
export type TranslationValue<K extends string> = RegistryIsEmpty extends true
  ? string
  : K extends DotPath<TranslationRegistry>
    ? DotPathValue<TranslationRegistry, K> extends string
      ? string
      : DotPathValue<TranslationRegistry, K>
    : string

/**
 * Values substituted into `:placeholder` tokens.
 */
export type Replacements = Record<string, string | number | boolean | null | undefined>

/**
 * A loaded translation group: nested objects of strings.
 */
export interface TranslationLines {
  [key: string]: string | TranslationLines
}

/**
 * Reads translation groups from storage.
 */
export interface TranslationLoader {
  /**
   * Load one group (file) for a locale. Returns `{}` when it does not exist.
   *
   * @param locale     Locale directory, e.g. `en`.
   * @param group      Group (file) name, e.g. `messages`.
   * @param namespace  `*` for the application, or a registered namespace.
   */
  load(locale: string, group: string, namespace?: string): TranslationLines

  /**
   * Register a directory holding a namespace's `{locale}/{group}` files.
   */
  addNamespace(namespace: string, hint: string): void

  /**
   * Registered namespaces and their directories.
   */
  namespaces(): Record<string, string>

  /**
   * Locales available to the application (its locale directories).
   */
  locales(): string[]

  /**
   * Group names available for a locale.
   */
  groups(locale: string, namespace?: string): string[]
}

/**
 * Called when a key cannot be found in any locale. Return a string to use it as
 * the translation; return nothing to fall back to the key itself.
 */
export type MissingKeyHandler = (key: string, replace: Replacements, locale: string) => string | void

export interface TranslatorOptions {
  /** Default locale. */
  locale?: string
  /** Locale tried when a key is missing in the current one. `null` disables it. */
  fallbackLocale?: string | null
  /** Storage for translation groups. */
  loader?: TranslationLoader
}

export interface LocaleDetectionOptions {
  /**
   * Locales the app accepts. Defaults to the locale directories in `src/lang`.
   */
  supported?: string[] | (() => string[])
  /**
   * Query parameter to read, e.g. `?lang=fr`. `false` disables it. Default `lang`.
   */
  query?: string | false
  /**
   * Cookie to read. `false` disables it. Default `locale`.
   */
  cookie?: string | false
  /**
   * Read the `Accept-Language` header. Default `true`.
   */
  header?: boolean
  /**
   * Custom resolver checked first, e.g. the signed-in user's saved locale.
   * Receives the raw request (Express `req` or H3 `event`).
   */
  resolve?: (request: any) => string | null | undefined | Promise<string | null | undefined>
  /**
   * Set the `Content-Language` response header. Default `true`.
   */
  contentLanguage?: boolean
}

export type { DotPath, DotPathValue }
