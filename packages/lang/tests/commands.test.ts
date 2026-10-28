import { afterEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { LangExportCommand } from '../src/commands/LangExportCommand'
import { MakeLangCommand } from '../src/commands/MakeLangCommand'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const run = async (command: any, args: Record<string, unknown>, opts: Record<string, unknown> = {}) => {
  const messages: string[] = []

  Object.assign(command, {
    argument: (name: string) => args[name],
    option: (name: string) => opts[name],
    success: (message: string) => messages.push(message),
    info: (message: string) => messages.push(message),
    error: (message: string) => messages.push(`error: ${message}`),
  })

  await command.handle()

  return messages
}

describe('lang commands', () => {
  const previous = Arkstack.rootDir()
  let root: string | undefined

  afterEach(async () => {
    Arkstack.setRootDir(previous)
    if (root) await rm(root, { recursive: true, force: true })
    root = undefined
  })

  it('make:lang creates a file, copying the fallback locale when present', async () => {
    root = await mkdtemp(join(tmpdir(), 'arkstack-make-lang-'))
    Arkstack.setRootDir(root)

    const command = new MakeLangCommand({} as never, {} as never)

    await run(command, { name: 'messages' }, { locale: 'en' })
    const created = await readFile(join(root, 'src/lang/en/messages.ts'), 'utf8')
    expect(created).toContain('export default {')

    await writeFile(join(root, 'src/lang/en/messages.ts'), "export default { hi: 'Hi' }\n")
    await run(command, { name: 'fr/messages' })
    expect(await readFile(join(root, 'src/lang/fr/messages.ts'), 'utf8')).toContain("hi: 'Hi'")

    const messages = await run(command, { name: 'fr/messages' })
    expect(messages[0]).toContain('already exists')

    expect((await run(command, { name: '../evil' }))[0]).toContain('error')
  })

  it('lang:export writes JSON per locale, optionally in i18next format', async () => {
    root = await mkdtemp(join(tmpdir(), 'arkstack-lang-export-'))
    Arkstack.setRootDir(root)

    await mkdir(join(root, 'src/lang/en'), { recursive: true })
    await writeFile(join(root, 'src/lang/en/messages.ts'), "export default { hi: 'Hi :name', n: { x: 'X' } }\n")

    await run(new LangExportCommand({} as never, {} as never), {}, { out: 'out', i18next: true })

    const exported = JSON.parse(await readFile(join(root, 'out/en.json'), 'utf8'))
    expect(exported).toEqual({ messages: { hi: 'Hi {{name}}', n: { x: 'X' } } })
  })
})
