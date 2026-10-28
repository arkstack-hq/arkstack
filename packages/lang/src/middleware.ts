import type { LocaleDetectionOptions } from './types'
import { Lang } from './Lang'

interface LocaleSources {
  custom?: string | null
  query?: string | null
  cookie?: string | null
  acceptLanguage?: string | null
}

/**
 * Parse an `Accept-Language` header into language tags, best first.
 *
 * @example
 * parseAcceptLanguage('fr-CA,fr;q=0.9,en;q=0.5') // ['fr-CA', 'fr', 'en']
 * 
 * @param header 
 * @returns 
 */
export const parseAcceptLanguage = (header?: string | null): string[] => {
  if (!header) return []

  return header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='))
      const quality = q ? Number(q.slice(2)) : 1

      return { tag: tag.trim(), quality: Number.isNaN(quality) ? 0 : quality, index }
    })
    .filter((entry) => entry.tag && entry.tag !== '*' && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)
    .map((entry) => entry.tag)
}

/**
 * Pick the first candidate the app supports. Matching ignores case and treats
 * `-` and `_` alike, and falls back to the base language (`fr-CA` → `fr`).
 *
 * @param candidates  Requested locales, best first.
 * @param supported   Locales the app has. When empty, any valid candidate is accepted.
 */
export const negotiateLocale = (candidates: (string | null | undefined)[], supported: string[]): string | undefined => {
  const normalize = (value: string) => value.toLowerCase().replace(/_/g, '-')
  const byNormalized = new Map(supported.map((locale) => [normalize(locale), locale]))

  for (const candidate of candidates) {
    if (!candidate || !/^[A-Za-z0-9_-]+$/.test(candidate)) continue

    if (!supported.length) return candidate

    const normalized = normalize(candidate)
    const exact = byNormalized.get(normalized)

    if (exact) return exact

    const base = byNormalized.get(normalized.split('-')[0])

    if (base) return base
  }
}

/**
 * Choose a locale from the request's sources in priority order: custom
 * resolver, query parameter, cookie, then `Accept-Language`.
 */
export const detectLocale = (sources: LocaleSources, supported: string[]): string | undefined => {
  const explicit = negotiateLocale([sources.custom, sources.query, sources.cookie], supported)

  return explicit ?? negotiateLocale(parseAcceptLanguage(sources.acceptLanguage), supported)
}

const supportedLocales = (options: LocaleDetectionOptions) => {
  const supported = options.supported ?? (() => Lang.locales())

  return typeof supported === 'function' ? supported() : supported
}

const readCookie = (header: string | null | undefined, name: string): string | undefined => {
  if (!header) return undefined

  for (const pair of header.split(';')) {
    const [key, ...value] = pair.trim().split('=')

    if (key === name) {
      try {
        return decodeURIComponent(value.join('='))
      } catch {
        return value.join('=')
      }
    }
  }
}

const first = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return first(value[0])

  return typeof value === 'string' ? value : undefined
}

/**
 * Express middleware that sets the locale for each request.
 *
 * The locale is kept per request, so `__()` and `Lang.setLocale()` inside a
 * handler never affect other requests.
 *
 * @example
 * // src/config/middleware.ts
 * before: [localeMiddleware()]
 */
export const localeMiddleware = (options: LocaleDetectionOptions = {}) => {
  const queryName = options.query === undefined ? 'lang' : options.query
  const cookieName = options.cookie === undefined ? 'locale' : options.cookie

  return async (req: any, res: any, next: (error?: unknown) => void) => {
    try {
      const locale = detectLocale(
        {
          custom: options.resolve ? await options.resolve(req) : undefined,
          query: queryName ? first(req.query?.[queryName]) : undefined,
          cookie: cookieName ? (req.cookies?.[cookieName] ?? readCookie(req.headers?.cookie, cookieName)) : undefined,
          acceptLanguage: options.header === false ? undefined : req.headers?.['accept-language'],
        },
        supportedLocales(options),
      )

      if (!locale) return next()

      if (options.contentLanguage !== false && !res.headersSent) res.setHeader?.('Content-Language', locale)

      Lang.withLocale(locale, () => next())
    } catch (error) {
      next(error)
    }
  }
}

/**
 * H3 middleware that sets the locale for each request.
 *
 * @example
 * // src/config/middleware.ts
 * before: [h3LocaleMiddleware()]
 */
export const h3LocaleMiddleware = (options: LocaleDetectionOptions = {}) => {
  const queryName = options.query === undefined ? 'lang' : options.query
  const cookieName = options.cookie === undefined ? 'locale' : options.cookie

  return async (event: any, next: () => unknown | Promise<unknown>) => {
    const headers = event.req?.headers as Headers | undefined
    const url: URL | undefined = event.url ?? (event.req?.url ? new URL(event.req.url, 'http://localhost') : undefined)

    const locale = detectLocale(
      {
        custom: options.resolve ? await options.resolve(event) : undefined,
        query: queryName ? url?.searchParams.get(queryName) : undefined,
        cookie: cookieName ? readCookie(headers?.get('cookie'), cookieName) : undefined,
        acceptLanguage: options.header === false ? undefined : headers?.get('accept-language'),
      },
      supportedLocales(options),
    )

    if (!locale) return await next()

    if (options.contentLanguage !== false) event.res?.headers?.set?.('content-language', locale)

    return await Lang.withLocale(locale, () => next())
  }
}
