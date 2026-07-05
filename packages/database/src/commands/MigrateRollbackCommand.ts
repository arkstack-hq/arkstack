import { CliApp, MigrateRollbackCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class MigrateRollbackCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
