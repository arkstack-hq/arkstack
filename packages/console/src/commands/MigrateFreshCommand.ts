import { CliApp, MigrateFreshCommand as Command } from 'arkormx'

export class MigrateFreshCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
