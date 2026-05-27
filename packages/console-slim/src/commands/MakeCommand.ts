import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { resolve } from 'path'
import { writeFile } from 'fs/promises'

export class MakeCommand extends Command {
    protected signature = `make:command 
        {name : name of the command to create}
    `

    protected description = 'Creates a new console command class.'

    async handle () {
        const name = String(this.argument('name'))
            .replace(/\s+/g, '')
            .replace(/\.ts$/, '').trim()

        if (!name) return void this.error('Command name is required')

        const stubContent = this.stub(name)
        const filePath = resolve(Arkstack.rootDir(), 'src', `app/console/commands/${name}.ts`)

        await writeFile(filePath, stubContent, { flag: 'wx' })
        this.success(`Command ${name} created successfully at ${filePath}`)
    }

    stub (name: string) {
        name = name.endsWith('Command') ? name : `${name}Command`
        name = name.split('/').pop()!.split('.').shift()!
        const signature = `app:${name.toLowerCase()}`
        const description = `Description for ${signature} command`

        const stub = [
            'import { Command } from \'@h3ravel/musket\'',
            '',
            `export class ${name} extends Command {`,
            `    signature = '${signature}'`,
            '',
            `    description = '${description}'`,
            '',
            '    async handle () {',
            '        // Command logic goes here',
            '    }',
            '}',
        ]

        return stub.join('\n')
    }
}
