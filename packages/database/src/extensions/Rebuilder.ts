import { readFile, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { CliApp } from 'arkormx'
import { Logger } from '@arkstack/common'
import { createRequire } from 'node:module'
import { globSync } from 'node:fs'
import { join } from 'node:path'

type Type = 'models' | 'seeders' | 'migrations' | 'factories'

export class Rebuilder {
    constructor(private app: CliApp) { }

    static async build (app: CliApp, name: string, type: Type = 'models') {
        try {
            const inst = new Rebuilder(app)

            const dir = inst.paths()[type] ?? join(Arkstack.rootDir(), 'src', type)
            const outputExt = inst.resolveOutputExt()
            let outputPath = join(dir, `${name}.${outputExt}`)

            if (type === 'migrations') {
                outputPath = globSync(`${join(dir, inst.date())}*_${name}.ts`, {
                    cwd: Arkstack.rootDir(),
                    withFileTypes: false,
                }).sort().at(-1)!
            }

            const content = inst.content(await readFile(outputPath, 'utf8'), type)

            await writeFile(outputPath, content, 'utf8')

        } catch (error: any) {
            Logger.error(error.message, false)
        }
    }

    paths () {
        return this.app.getConfig('paths') ?? {}
    }

    content (content: string, type: Type) {
        const replacements: { [X in Type]: [
            string | RegExp,
            string | ((sub: string, ...args: any[]) => string)
        ] } = {
            models: [
                /import\s*{\s*Model\s*}\s*from\s*['"]\s*arkormx\s*['"]\s*;?/g,
                'import { Model } from \'@arkstack/database\'\n\n'
            ],
            seeders: [
                /import\s*{\s*Seeder\s*}\s*from\s*['"]\s*arkormx\s*['"]\s*;?/g,
                'import { Seeder } from \'@arkstack/database\'\n\n'
            ],
            factories: [
                /import\s*{\s*ModelFactory\s*}\s*from\s*['"]\s*arkormx\s*['"]\s*;?/g,
                'import { ModelFactory } from \'@arkstack/database\'\n'
            ],
            migrations: [
                /import\s*{\s*(.*?)\s*}\s*from\s*['"]\s*arkormx\s*['"]\s*;?/g,
                (_, val) => `import { ${val.trim()} } from '@arkstack/database'\n\n`
            ]
        }

        const replacement = replacements[type]

        return content.replace(replacement[0], replacement[1] as never)
    }

    resolveOutputExt () {
        const preferred = this.app.getConfig('outputExt') === 'js' ? 'js' : 'ts'
        if (preferred === 'ts' && !this.hasTypeScriptInstalled()) return 'js'

        return preferred
    }


    hasTypeScriptInstalled () {
        try {
            createRequire(import.meta.url).resolve('typescript', { paths: [Arkstack.rootDir()] })

            return true
        } catch {
            return false
        }
    }

    date () {
        const now = new Date()

        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
        ].join('')
    }
}