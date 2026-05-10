import { CliApp, MigrationHistoryCommand as Command } from 'arkormx'

export class MigrationHistoryCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
