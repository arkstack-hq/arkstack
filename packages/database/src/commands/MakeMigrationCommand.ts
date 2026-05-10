import { CliApp, MakeMigrationCommand as Command } from 'arkormx'

export class MakeMigrationCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
