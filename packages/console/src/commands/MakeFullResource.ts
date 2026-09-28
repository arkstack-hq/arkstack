import { applyRuntimeConfig, getDefaultConfig } from 'resora'

import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'
import { Logger } from '@arkstack/common'

// oxlint-disable-next-line typescript/no-explicit-any
export class MakeFullResource extends Command<ArkstackConsoleApp<any>> {
    protected signature = `make:full-resource
        {prefix : prefix of the resources to create, "Admin" will create AdminResource, AdminCollection and AdminController}
        {--m|model? : name of model to attach to the generated controller (will be created if it doesn't exist)}
        {--f|factory : Create and link a factory}
        {--s|seeder : Create a seeder file for the model (only if --model is specified)}
        {--x|migration : Create a migration file for the model (only if --model is specified)}
        {--force : force overwrite if resources already exist}
    `

    protected description =
        'Create a full new set of API resources (Controller, Resource, Collection)'

    async handle() {
        try {
            applyRuntimeConfig({ ...getDefaultConfig(), ...config('resources', {}) })
        } catch { /** */ }

        this.app.command = this

        const res = this.app.makeResource(this.argument('prefix'), {
            force: this.option('force')
        })

        const col = this.app.makeResource(this.argument('prefix') + 'Collection', {
            collection: true,
            force: this.option('force'),
        })

        const cont = this.app.makeController(
            this.argument('prefix'),
            Object.assign({}, this.options(), { api: true, force: this.option('force') }),
        )

        let model: Record<string, any> | null = {}

        try {
            const { CliApp } = await import('arkormx')
            const app = new CliApp()

            model = this.option('model')
                ? app.makeModel(this.argument('prefix'), { ...this.options(), force: false })
                : null
        } catch {
            // Apps without database needs should not break when arkormx is not installed
        }

        this.success('Created full resource set:');

        [
            ['Resource', res.path],
            ['Collection', col.path],
            ['Controller', cont],
            model ? ['Model', model.model.path] : '',
            model?.factory ? ['Factory', model.factory.path] : '',
            model?.seeder ? ['Seeder', model.seeder.path] : '',
            model?.migration ? ['Migration', model.migration.path] : ''
        ].filter(Boolean).map(([name, path]) => this.success(Logger.splitLogger(name!, path!)))
    }
}
