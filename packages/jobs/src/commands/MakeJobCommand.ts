import { mkdir, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { dirname, resolve } from 'node:path'

/**
 * Generate a new dispatchable job class.
 */
export class MakeJobCommand extends Command {
    protected signature = `make:job
        {name : The name of the job class to create.}
    `
    protected description = 'Create a new queued job class.'

    async handle () {
        const name = String(this.argument('name'))
            .replace(/\s+/g, '')
            .replace(/\.ts$/, '')
            .trim()

        if (!name) {
            return void this.error('Job name is required')
        }

        const className = name.split('/').pop()!
        const filePath = resolve(Arkstack.rootDir(), 'src', `app/jobs/${name}.ts`)

        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, this.stub(className), { flag: 'wx' })

        this.success(`Job ${className} created successfully at ${filePath}`)
    }

    stub (name: string) {
        return [
            'import { Job } from \'@arkstack/jobs\'',
            '',
            `export class ${name} extends Job {`,
            '    constructor() {',
            '        super()',
            '    }',
            '',
            '    /**',
            '     * Execute the job.',
            '     */',
            '    async handle () {',
            '        // Job logic goes here',
            '    }',
            '}',
            '',
        ].join('\n')
    }
}
