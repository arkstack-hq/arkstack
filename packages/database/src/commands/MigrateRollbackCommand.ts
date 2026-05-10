import { CliApp, MigrateRollbackCommand as Command } from 'arkormx'

export class MigrateRollbackCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
