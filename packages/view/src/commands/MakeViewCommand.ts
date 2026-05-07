import { Command } from '@h3ravel/musket'
import { dirname, resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'

export class MakeViewCommand extends Command {
    protected signature = `make:view
        {name : name of the view to create}
        {--force : force overwrite if view already exists}
    `

    protected description = 'Create a new Edge view file'

    async handle () {
        const name = String(this.argument('name') ?? '').trim()

        if (!name) {
            return void this.error('View name is required')
        }

        const path = this.path(name)

        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, this.stub(name), { flag: this.option('force') ? 'w' : 'wx' })

        this.success(`View ${name} created successfully at ${path}`)
    }

    path (name: string) {
        const viewPath = name
            .replace(/\\/g, '/')
            .replace(/\./g, '/')
            .replace(/\.edge$/i, '')

        return resolve(process.cwd(), 'resources', 'views', `${viewPath}.edge`)
    }

    stub (name: string) {
        const title = name
            .split(/[./\\]/)
            .filter(Boolean)
            .pop() ?? 'view'

        return [
            `{{-- ${title} view --}}`,
            '',
            `<h1>{{ title || '${title}' }}</h1>`,
            '',
        ].join('\n')
    }
}
