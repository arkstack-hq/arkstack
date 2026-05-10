import { CliApp, MakeFactoryCommand as Command } from 'arkormx'

export class MakeFactoryCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
