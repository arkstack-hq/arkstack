import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'

import { FileLoader } from '../src/FileLoader'
import { Lang } from '../src/Lang'
import { Translator } from '../src/Translator'
import { __, transChoice } from '../src/helpers'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const write = async (root: string, file: string, contents: string) => {
  const path = join(root, file)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, contents)
}

describe('Translator', () => {
  let root: string
  let translator: Translator

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'arkstack-lang-'))

    await write(
      root,
      'en/messages.ts',
      `const greeting: string = 'Welcome, :name!'
export default {
  welcome: greeting,
  shout: 'Hello :NAME and :Name',
  apples: 'apple|apples',
  items: '{0} No items|{1} One item|[2,*] :count items',
  nested: { deep: { line: 'Deep :value' } },
  only_en: 'English only',
}`,
    )
    await write(root, 'fr/messages.ts', `export default { welcome: 'Bienvenue, :name !', apples: 'pomme|pommes' }`)
    await write(root, 'ru/messages.js', `export default { apples: ':count яблоко|:count яблока|:count яблок' }`)
    await write(root, 'de/messages.json', JSON.stringify({ welcome: 'Willkommen, :name!' }))
    await write(root, 'en/factory.ts', `export default () => ({ made: 'From a function' })`)

    translator = new Translator(new FileLoader(root), { locale: 'en', fallbackLocale: 'en' })
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('translates keys with replacements', () => {
    expect(translator.get('messages.welcome', { name: 'Ada' })).toBe('Welcome, Ada!')
    expect(translator.get('messages.nested.deep.line', { value: 42 })).toBe('Deep 42')
  })

  it('applies case variants of placeholders', () => {
    expect(translator.get('messages.shout', { name: 'ada' })).toBe('Hello ADA and Ada')
  })

  it('returns whole groups for group keys', () => {
    expect(translator.get('messages.nested', { value: 1 })).toEqual({ deep: { line: 'Deep 1' } })
  })

  it('loads ts, js, json and function exports', () => {
    expect(translator.get('messages.welcome', { name: 'Ada' }, 'de')).toBe('Willkommen, Ada!')
    expect(translator.get('factory.made')).toBe('From a function')
  })

  it('falls back to the fallback locale, then the key', () => {
    translator.setLocale('fr')

    expect(translator.get('messages.welcome', { name: 'Ada' })).toBe('Bienvenue, Ada !')
    expect(translator.get('messages.only_en')).toBe('English only')
    expect(translator.get('messages.unknown')).toBe('messages.unknown')
    expect(translator.get('Hello :name', { name: 'Ada' })).toBe('Hello Ada')
    expect(translator.has('messages.only_en')).toBe(true)
    expect(translator.hasForLocale('messages.only_en')).toBe(false)
  })

  it('pluralizes with locale rules and explicit ranges', () => {
    expect(translator.choice('messages.apples', 1)).toBe('apple')
    expect(translator.choice('messages.apples', 5)).toBe('apples')
    expect(translator.choice('messages.items', 0)).toBe('No items')
    expect(translator.choice('messages.items', 1)).toBe('One item')
    expect(translator.choice('messages.items', [1, 2, 3])).toBe('3 items')

    expect(translator.choice('messages.apples', 1, {}, 'ru')).toBe('1 яблоко')
    expect(translator.choice('messages.apples', 3, {}, 'ru')).toBe('3 яблока')
    expect(translator.choice('messages.apples', 5, {}, 'ru')).toBe('5 яблок')
    expect(translator.choice('messages.apples', 21, {}, 'ru')).toBe('21 яблоко')
  })

  it('uses the fallback locale plural rules for fallback lines', () => {
    expect(translator.choice('messages.items', 7, {}, 'fr')).toBe('7 items')
  })

  it('keeps setLocale inside withLocale scoped to that context', async () => {
    const results = await Promise.all([
      translator.withLocale('fr', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5))

        return translator.get('messages.welcome', { name: 'A' })
      }),
      translator.withLocale('en', async () => {
        translator.setLocale('de')
        await new Promise((resolve) => setTimeout(resolve, 1))

        return translator.get('messages.welcome', { name: 'B' })
      }),
    ])

    expect(results).toEqual(['Bienvenue, A !', 'Willkommen, B!'])
    expect(translator.locale()).toBe('en')
  })

  it('supports namespaces with app overrides', async () => {
    const pkg = await mkdtemp(join(tmpdir(), 'arkstack-lang-pkg-'))

    try {
      await write(pkg, 'en/invoices.ts', `export default { paid: 'Paid', due: 'Due :date' }`)
      await write(root, 'vendor/billing/en/invoices.ts', `export default { paid: 'Settled' }`)

      translator.addNamespace('billing', pkg)

      expect(translator.get('billing::invoices.paid')).toBe('Settled')
      expect(translator.get('billing::invoices.due', { date: 'today' })).toBe('Due today')
    } finally {
      await rm(pkg, { recursive: true, force: true })
    }
  })

  it('adds lines at runtime and reports missing keys', () => {
    const missing: string[] = []

    translator.addLines({ 'messages.extra.line': 'Extra :x' }, 'en')
    translator.handleMissingKeysUsing((key) => void missing.push(key))

    expect(translator.get('messages.extra.line', { x: 1 })).toBe('Extra 1')
    expect(translator.get('messages.welcome', { name: 'Ada' })).toBe('Welcome, Ada!')
    expect(translator.get('messages.nope')).toBe('messages.nope')
    expect(missing).toEqual(['messages.nope'])
  })

  it('lists locales and ignores unsafe locale input', () => {
    expect(translator.locales()).toEqual(['de', 'en', 'fr', 'ru'])
    expect(translator.get('messages.welcome', { name: 'A' }, '../en')).toBe('Welcome, A!')
    expect(() => translator.setLocale('../etc')).toThrow('Invalid locale')
  })

  it('backs the Lang facade and helpers', () => {
    Lang.setTranslator(translator)

    try {
      expect(__('messages.welcome', { name: 'Ada' })).toBe('Welcome, Ada!')
      expect(transChoice('messages.apples', 2)).toBe('apples')
      expect(Lang.withLocale('fr', () => __('messages.welcome', { name: 'Ada' }))).toBe('Bienvenue, Ada !')
    } finally {
      Lang.setTranslator()
    }
  })
})
