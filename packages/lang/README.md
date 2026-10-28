# @arkstack/lang

[![@arkstack/lang](https://img.shields.io/npm/dt/@arkstack/lang?style=flat-square&label=@arkstack/lang&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/lang)](https://www.npmjs.com/package/@arkstack/lang)

Localization module for Arkstack: file-based translations in `src/lang/{locale}/{group}.ts`, typed `__()` helpers, plural forms and per-request locales.

```ts
// src/lang/en/messages.ts
export default {
  welcome: 'Welcome, :name!',
  items: '{0} No items|{1} One item|[2,*] :count items',
}
```

```ts
import '@arkstack/lang/setup'

__('messages.welcome', { name: 'Ada' }) // "Welcome, Ada!"
transChoice('messages.items', 3) // "3 items"
```

- Keys autocomplete after the `prepare` script runs, the same way as `config()` keys.
- `localeMiddleware()` (Express) and `h3LocaleMiddleware()` (H3) set the locale per request from the query, a cookie or `Accept-Language`.
- `ark make:lang fr/messages` creates translation files; `ark lang:export` writes JSON for frontends.

See the [localization guide](https://arkstack.toneflix.net/guide/localization).
