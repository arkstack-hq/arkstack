import type { TranslationLines, TranslationLoader } from './types'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

import { createJiti } from 'jiti'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const EXTENSIONS = ['.ts', '.mts', '.js', '.mjs', '.cjs', '.json']

/**
 * Loads translation groups from `{path}/{locale}/{group}.{ts,js,json}`.
 *
 * Files export an object of lines (or a function returning one) as their
 * default export. TypeScript sources load directly in development and the
 * compiled `.js` files load in production, so no build step is needed to see
 * new translations while developing.
 *
 * Namespaced groups load from the namespace's directory, then the app's
 * `{path}/vendor/{namespace}/{locale}/{group}` file is merged over them so an
 * application can override package translations.
 */
export class FileLoader implements TranslationLoader {
  private readonly hints = new Map<string, string>()
  private readonly jiti = createJiti(pathToFileURL(path.join(process.cwd(), 'index.js')).href, {
    interopDefault: false,
    moduleCache: false,
  })

  /**
   * @param langPath  The application's lang directory, or a function returning it
   *                  (resolved on every load so root-dir changes are picked up).
   */
  constructor(private readonly langPath: string | (() => string)) {}

  /**
   * The application's lang directory.
   */
  path(): string {
    return typeof this.langPath === 'function' ? this.langPath() : this.langPath
  }

  load(locale: string, group: string, namespace = '*'): TranslationLines {
    if (namespace === '*') return this.loadPath(this.path(), locale, group)

    const hint = this.hints.get(namespace)
    const base = hint ? this.loadPath(hint, locale, group) : {}
    const override = this.loadPath(path.join(this.path(), 'vendor', namespace), locale, group)

    return deepMerge(base, override)
  }

  addNamespace(namespace: string, hint: string): void {
    this.hints.set(namespace, hint)
  }

  namespaces(): Record<string, string> {
    return Object.fromEntries(this.hints)
  }

  locales(): string[] {
    try {
      return readdirSync(this.path(), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'vendor')
        .map((entry) => entry.name)
        .sort()
    } catch {
      return []
    }
  }

  groups(locale: string, namespace = '*'): string[] {
    const dirs =
      namespace === '*'
        ? [path.join(this.path(), locale)]
        : [this.hints.get(namespace), path.join(this.path(), 'vendor', namespace)]
            .filter((dir): dir is string => !!dir)
            .map((dir) => path.join(dir, locale))

    const groups = new Set<string>()

    for (const dir of dirs) {
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const ext = path.extname(entry.name)

          if (entry.isFile() && EXTENSIONS.includes(ext) && !entry.name.endsWith('.d.ts')) {
            groups.add(path.basename(entry.name, ext))
          }
        }
      } catch {
        /* missing locale directory */
      }
    }

    return [...groups].sort()
  }

  /**
   * Load `{dir}/{locale}/{group}.*`, preferring TypeScript source over output.
   */
  private loadPath(dir: string, locale: string, group: string): TranslationLines {
    if (!isSafeSegment(locale) || !isSafeSegment(group)) return {}

    const base = path.join(dir, locale, group)
    const file = EXTENSIONS.map((ext) => base + ext).find((candidate) => existsSync(candidate))

    if (!file) return {}

    try {
      if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'))

      const mod = this.jiti(file)
      let lines = mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod

      if (typeof lines === 'function') lines = lines()

      return lines && typeof lines === 'object' ? (lines as TranslationLines) : {}
    } catch (error) {
      throw new Error(`[arkstack] Failed to load translations from "${file}": ${(error as Error).message}`, {
        cause: error,
      })
    }
  }
}

/**
 * Locale and group names come from user input (e.g. `?lang=`), so keep them to
 * a single path segment.
 */
const isSafeSegment = (value: string) => /^[A-Za-z0-9_-]+$/.test(value)

const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

export const deepMerge = (base: TranslationLines, override: TranslationLines): TranslationLines => {
  const result: TranslationLines = { ...base }

  for (const [key, value] of Object.entries(override)) {
    result[key] = isObject(value) && isObject(result[key]) ? deepMerge(result[key], value) : value
  }

  return result
}
