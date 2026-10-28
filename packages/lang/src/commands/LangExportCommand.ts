import { dirname, resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { FileLoader } from '../FileLoader'
import type { TranslationLines } from '../types'

/**
 * Write each locale's translations to `{out}/{locale}.json` for frontends.
 *
 * With `--i18next`, `:name` placeholders become `{{name}}` so the files can be
 * loaded directly by i18next.
 */
export class LangExportCommand extends Command {
  protected signature = `lang:export
        {--locale= : export only this locale}
        {--out=public/lang : directory to write the JSON files to}
        {--i18next : convert :placeholders to i18next's {{placeholders}}}
    `

  protected description = 'Export translations to JSON files for frontend use'

  async handle() {
    const loader = new FileLoader(resolve(Arkstack.rootDir(), 'src', 'lang'))
    const only = this.option('locale') ? String(this.option('locale')) : undefined
    const locales = only ? [only] : loader.locales()
    const out = resolve(Arkstack.rootDir(), String(this.option('out') || 'public/lang'))

    if (!locales.length) return void this.error('No locales found in src/lang')

    for (const locale of locales) {
      const messages: Record<string, TranslationLines> = {}

      for (const group of loader.groups(locale)) {
        messages[group] = loader.load(locale, group)
      }

      for (const namespace of Object.keys(loader.namespaces())) {
        for (const group of loader.groups(locale, namespace)) {
          messages[`${namespace}::${group}`] = loader.load(locale, group, namespace)
        }
      }

      const data = this.option('i18next') ? toI18next(messages) : messages
      const file = resolve(out, `${locale}.json`)

      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, JSON.stringify(data, null, 2) + '\n')

      this.info(`Exported ${locale} → ${file}`)
    }

    this.success('Translations exported successfully')
  }
}

export const toI18next = <T>(value: T): T => {
  if (typeof value === 'string') return value.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{{$1}}') as T

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toI18next(item)])) as T
  }

  return value
}
