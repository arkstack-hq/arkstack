import { CliApp, MigrationHistoryCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class MigrationHistoryCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
