import { describe, expect, it } from 'vitest'
import { h3LocaleMiddleware, localeMiddleware, negotiateLocale, parseAcceptLanguage } from '../src/middleware'

import { Lang } from '../src/Lang'

describe('locale detection', () => {
  it('parses Accept-Language by quality', () => {
    expect(parseAcceptLanguage('en;q=0.5, fr-CA, fr;q=0.9, *;q=0.1')).toEqual(['fr-CA', 'fr', 'en'])
    expect(parseAcceptLanguage(undefined)).toEqual([])
  })

  it('negotiates against supported locales', () => {
    expect(negotiateLocale(['fr-CA'], ['en', 'fr'])).toBe('fr')
    expect(negotiateLocale(['pt-br'], ['en', 'pt_BR'])).toBe('pt_BR')
    expect(negotiateLocale(['de', '../x'], ['en'])).toBeUndefined()
    expect(negotiateLocale(['../x', 'de'], [])).toBe('de')
  })

  it('sets the locale per request in Express', async () => {
    const headers: Record<string, string> = {}
    let seen: string | undefined

    await localeMiddleware({ supported: ['en', 'fr'] })(
      { query: {}, headers: { 'accept-language': 'fr-FR,fr;q=0.9', cookie: 'a=b' } },
      { setHeader: (key: string, value: string) => (headers[key] = value) },
      () => {
        seen = Lang.locale()
      },
    )

    expect(seen).toBe('fr')
    expect(headers['Content-Language']).toBe('fr')
  })

  it('prefers query, then cookie, over the header', async () => {
    let seen: string | undefined
    const run = (req: any) =>
      localeMiddleware({ supported: ['en', 'fr', 'de'] })(req, {}, () => {
        seen = Lang.locale()
      })

    await run({ query: { lang: 'de' }, headers: { cookie: 'locale=fr', 'accept-language': 'en' } })
    expect(seen).toBe('de')

    await run({ query: {}, headers: { cookie: 'locale=fr', 'accept-language': 'en' } })
    expect(seen).toBe('fr')
  })

  it('sets the locale per request in H3', async () => {
    const response = new Headers()
    const event = {
      url: new URL('http://localhost/?lang=fr'),
      req: { headers: new Headers({ 'accept-language': 'en' }) },
      res: { headers: response },
    }

    const result = await h3LocaleMiddleware({ supported: ['en', 'fr'], resolve: () => undefined })(event, () =>
      Lang.locale(),
    )

    expect(result).toBe('fr')
    expect(response.get('content-language')).toBe('fr')
  })
})
