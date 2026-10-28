import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { BuildInterfaces } from '../src/prepare/BuildInterfaces'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

describe('BuildInterfaces.translations', () => {
  const previousRoot = Arkstack.rootDir()
  let root: string | undefined

  afterEach(async () => {
    Arkstack.setRootDir(previousRoot)
    if (root) await rm(root, { recursive: true, force: true })
    root = undefined
  })

  const setup = async (dependencies: Record<string, string>) => {
    root = await mkdtemp(join(tmpdir(), 'arkstack-translation-registry-'))
    await mkdir(join(root, '.arkstack'), { recursive: true })
    await mkdir(join(root, 'src/lang/en'), { recursive: true })
    await mkdir(join(root, 'src/lang/fr'), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies }))
    await writeFile(
      join(root, 'src/lang/en/messages.ts'),
      `export default {
  welcome: 'Welcome, :name!',
  'not-found': 'Missing',
  nested: { deep: { line: 'Deep' } },
}`,
    )
    await writeFile(join(root, 'src/lang/en/auth.json'), JSON.stringify({ failed: 'Nope', throttle: { wait: 'Wait' } }))
    await writeFile(join(root, 'src/lang/fr/only_fr.ts'), `export default { x: 'X' }`)
    Arkstack.setRootDir(root)

    return root
  }

  it('appends a TranslationRegistry from the reference locale', async () => {
    const dir = await setup({ '@arkstack/lang': 'workspace:^' })
    await writeFile(join(dir, '.arkstack/ark.d.ts'), "declare module '@arkstack/common' {}\n\nexport {}\n")

    BuildInterfaces.translations(undefined, 'en')

    const declaration = await readFile(join(dir, '.arkstack/ark.d.ts'), 'utf8')

    expect(declaration).toContain("declare module '@arkstack/common' {}")
    expect(declaration).toContain("declare module '@arkstack/lang' {")
    expect(declaration).toContain('interface TranslationRegistry {')
    expect(declaration).toContain('welcome: string')
    expect(declaration).toContain("'not-found': string")
    expect(declaration).toMatch(/nested: \{\s+deep: \{\s+line: string/)
    expect(declaration).toMatch(/auth: \{\s+failed: string\s+throttle: \{\s+wait: string/)
    expect(declaration).not.toContain('only_fr')
  })

  it('skips apps that do not depend on @arkstack/lang', async () => {
    const dir = await setup({})

    BuildInterfaces.translations()

    expect(existsSync(join(dir, '.arkstack/ark.d.ts'))).toBe(false)
  })
})
