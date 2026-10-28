# Localization

`@arkstack/lang` gives your app file-based translations: one file per group in `src/lang/{locale}`, `__()` helpers with key autocomplete, plural forms, and a locale per request.

## Install

App templates include the package. To add it manually:

::: code-group

```sh [npm]
npm i @arkstack/lang
```

```sh [pnpm]
pnpm add @arkstack/lang
```

```sh [yarn]
yarn add @arkstack/lang
```

:::

Then register the global helpers in `src/core/bootstrap.ts`:

```ts
import '@arkstack/lang/setup'
```

## Translation files

Each file in `src/lang/{locale}` is a group. Its default export is an object of lines, which can be nested:

```ts
// src/lang/en/messages.ts
export default {
  welcome: 'Welcome, :name!',
  cart: {
    items: '{0} Your cart is empty|{1} One item|[2,*] :count items',
  },
}
```

```ts
// src/lang/fr/messages.ts
export default {
  welcome: 'Bienvenue, :name !',
}
```

`.js` and `.json` files work too, and the default export can be a function returning the object.

Create a file with:

```sh
ark make:lang messages            # src/lang/{app.locale}/messages.ts
ark make:lang fr/messages         # copies src/lang/{fallback}/messages.ts when it exists
```

## Translating

```ts
__('messages.welcome', { name: 'Ada' }) // "Welcome, Ada!"
trans('messages.welcome', { name: 'Ada' }) // same as __()
__('messages.welcome', { name: 'Ada' }, 'fr') // force a locale
__('messages.cart') // a group key returns the nested object

import { Lang } from '@arkstack/lang'

Lang.get('messages.welcome', { name: 'Ada' })
Lang.has('messages.welcome')
```

A key that is missing in the current locale is looked up in `app.fallback_locale`, then the key itself is returned.

### Placeholders

`:name` is replaced by the value. Capitalized tokens follow the case: `:Name` capitalizes the first letter and `:NAME` uppercases the whole value.

### Plurals

```ts
transChoice('messages.cart.items', 0) // "Your cart is empty"
transChoice('messages.cart.items', 5) // "5 items"
transChoice('messages.cart.items', cart.items) // arrays and collections use their length
```

`:count` is filled in automatically. Lines can use:

- Plain forms: `'apple|apples'`. Forms follow the locale's plural rules from `Intl.PluralRules`, so languages with more forms work: `':count яблоко|:count яблока|:count яблок'`.
- Explicit counts and ranges: `{0}`, `{1,3}`, `[2,10]`, `[11,*]`.

## Autocomplete

Translation keys are typed the same way as `config()` keys. The `prepare` script (run after every install, or manually with `npx prepare`) reads the files in the fallback locale's directory and writes a `TranslationRegistry` into `.arkstack/ark.d.ts`:

```ts
declare module '@arkstack/lang' {
  interface TranslationRegistry {
    messages: {
      welcome: string
      cart: {
        items: string
      }
    }
  }
}
```

Re-run it after adding keys. After that, `__()`, `trans()`, `transChoice()` and `Lang.get()` autocomplete keys and reject typos. Keys come from `APP_FALLBACK_LOCALE`, then `APP_LOCALE`, then `en`, so keep the fallback locale complete. Namespaced keys (`pkg::group.key`) are always accepted.

## Locale per request

Add the middleware for your runtime in `src/config/middleware.ts`:

::: code-group

```ts [Express]
import { localeMiddleware } from '@arkstack/lang'

before: [localeMiddleware()]
```

```ts [H3]
import { h3LocaleMiddleware } from '@arkstack/lang'

before: [h3LocaleMiddleware()]
```

:::

It picks the first match from:

1. `resolve(request)`, if you pass one (for example the signed-in user's saved locale).
2. The `?lang=` query parameter.
3. The `locale` cookie.
4. The `Accept-Language` header.

Only locales that have a directory in `src/lang` are accepted. `fr-CA` falls back to `fr`, and `pt-br` matches `pt_BR`. The chosen locale is also sent as `Content-Language`.

```ts
localeMiddleware({
  supported: ['en', 'fr'],
  query: 'locale',
  cookie: false,
  resolve: (req) => req.user?.locale,
})
```

The locale is stored per request, so `Lang.setLocale('fr')` inside a handler changes only that request. Outside a request it changes the app default.

```ts
Lang.locale() // current locale
Lang.setLocale('fr')
await Lang.withLocale('fr', () => sendWelcomeMail(user)) // run code in another locale
```

## Views

With `@arkstack/view` installed, the setup import shares `__`, `trans` and `transChoice` with Edge templates:

```edge
<h1>{{ __('messages.welcome', { name: user.name }) }}</h1>
```

## Package translations

A package registers its translation directory under a namespace:

```ts
import { Lang } from '@arkstack/lang'

Lang.addNamespace('billing', join(packageRoot, 'lang'))

__('billing::invoices.paid')
```

An app overrides package lines with `src/lang/vendor/{namespace}/{locale}/{group}.ts`. Only the keys you set are replaced.

## Frontend export

To use the same translations in a frontend (for example an Inertia app), export them to JSON:

```sh
ark lang:export                      # public/lang/{locale}.json
ark lang:export --locale=fr --out=resources/lang
ark lang:export --i18next            # turns :name into {{name}} for i18next
```

## Configuration

The locales come from `src/config/app.ts`:

| Key                   | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `app.locale`          | Default locale                             |
| `app.fallback_locale` | Locale used when a key is missing          |
| `app.lang_path`       | Optional custom path to the lang directory |

Other runtime helpers:

```ts
Lang.addLines({ 'messages.beta': 'Beta' }, 'en') // add lines at runtime
Lang.handleMissingKeysUsing((key, replace, locale) => logger.warn(`Missing ${key} (${locale})`))
Lang.flush() // re-read files on next use
```
