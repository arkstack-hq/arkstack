import { CliApp, MigrateCommand as Command } from 'arkormx'

export class MigrateCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
