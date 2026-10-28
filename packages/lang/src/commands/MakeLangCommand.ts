import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { existsSync } from 'node:fs'

/**
 * Create a translation file at `src/lang/{locale}/{name}.ts`.
 *
 * When the same file exists in the fallback locale it is copied as a starting
 * point, so translators only need to change the values.
 */
export class MakeLangCommand extends Command {
  protected signature = `make:lang
        {name : the translation file (group) to create, e.g. messages or fr/messages}
        {--locale= : the locale directory; defaults to app.locale}
        {--force : overwrite the file if it already exists}
    `

  protected description = 'Create a new translation file'

  async handle() {
    const input = String(this.argument('name') ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/\.(ts|js|json)$/i, '')

    if (!input) return void this.error('Translation file name is required')

    const [maybeLocale, maybeGroup] = input.includes('/') ? input.split('/', 2) : [undefined, input]
    const locale = String(this.option('locale') || maybeLocale || appConfig('app.locale', 'en'))
    const group = maybeGroup ?? input

    if (!/^[A-Za-z0-9_-]+$/.test(locale) || !/^[A-Za-z0-9_-]+$/.test(group)) {
      return void this.error('Locale and file name may only contain letters, numbers, "-" and "_"')
    }

    const path = this.path(locale, group)
    const fallback = String(appConfig('app.fallback_locale', 'en'))
    const source = this.path(fallback, group)

    await mkdir(dirname(path), { recursive: true })

    if (existsSync(path) && !this.option('force')) {
      return void this.error(`Translation file ${locale}/${group} already exists at ${path}`)
    }

    if (fallback !== locale && existsSync(source)) {
      await copyFile(source, path)
    } else {
      await writeFile(path, this.stub())
    }

    this.success(`Translation file ${locale}/${group} created successfully at ${path}`)
  }

  path(locale: string, group: string) {
    return resolve(Arkstack.rootDir(), 'src', 'lang', locale, `${group}.ts`)
  }

  stub() {
    return [
      'export default {',
      "  // welcome: 'Welcome, :name!',",
      "  // items: '{0} No items|{1} One item|[2,*] :count items',",
      '}',
      '',
    ].join('\n')
  }
}

const appConfig = (key: string, fallback: string): string => {
  try {
    return (globalThis as any).config?.(key) || fallback
  } catch {
    return fallback
  }
}
