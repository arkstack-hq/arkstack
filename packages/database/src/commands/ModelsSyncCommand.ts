import { CliApp, ModelsSyncCommand as Command } from 'arkormx'

export class ModelsSyncCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
