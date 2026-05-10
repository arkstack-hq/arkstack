import { CliApp, MakeModelCommand as Command } from 'arkormx'

export class MakeModelCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
