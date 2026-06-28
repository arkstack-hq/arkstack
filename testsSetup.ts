const conf = {
  'app.name': 'Arcstack',
  'app.env': 'test',
  'app.debug': true,
  'app.url': 'http://localhost',
  'app.asset_url': null,
  'app.locale': 'en',
  'app.fallback_locale': 'en',
  'app.key': 'base64:randomstring',
  'app.cipher': 'AES-256-CBC',
  'app.log_level': 'debug',
  'app.log_channel': 'stack',
  'app.log_deprecations_channel': null,
  'app.timezone': 'UTC',
  'app.providers': [],
  'app.aliases': {},
}

globalThis.config ??= ((key: string, def?: string) => {
  return key ? conf[key as never] ?? def : conf as never
}) as never