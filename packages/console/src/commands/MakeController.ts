import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'

// oxlint-disable-next-line typescript/no-explicit-any
export class MakeController extends Command<ArkstackConsoleApp<any>> {
    protected signature = `make:controller
        {name : name of the controller to create}
        {--api : make an API controller}
        {--m|model? : name of model to attach to controller}
        {--f|factory : Create and link a factory}
        {--s|seeder : Create a seeder file for the model (only if --model is specified)}
        {--x|migration : Create a migration file for the model (only if --model is specified)}
        {--force : force overwrite if controller already exists}
    `

    protected description = 'Create a new controller file'

    async handle() {
        this.app.command = this

        if (!this.argument('name')) return void this.error('Error: Controller name is required.')

        const name = this.app.makeController(this.argument('name'), this.options())

        const { CliApp } = await import('arkormx')
        const app = new CliApp()
        app.command = this as never

        const model = this.option('model')
            ? app.makeModel(this.option('model'), this.options())
            : null

        this.success('Controller created successfully!');

        [
            ['Controller', name],
            model ? ['Model', model.model.path] : '',
            model?.factory ? ['Factory', model.factory.path] : '',
            model?.seeder ? ['Seeder', model.seeder.path] : '',
            model?.migration ? ['Migration', model.migration.path] : ''
        ].filter(Boolean).map(([name, path]) => this.success(app.splitLogger(name!, path!)))
    }
}
