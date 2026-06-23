import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'

// oxlint-disable-next-line typescript/no-explicit-any
export class MakeController extends Command<ArkstackConsoleApp<any>> {
    protected signature = `make:controller
        {name : name of the controller to create}
        {--api : make an API controller}
        {--m|model? : name of model to attach to controller}
        {--force : force overwrite if controller already exists}
    `

    protected description = 'Create a new controller file'

    async handle() {
        this.app.command = this as never

        if (!this.argument('name')) return void this.error('Error: Controller name is required.')

        const name = this.app.makeController(this.argument('name'), this.options())

        this.success(`Controller: ${this.app.normalizePath(name)} created successfully!`)
    }
}
