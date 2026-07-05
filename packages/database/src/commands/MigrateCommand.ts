import { CliApp, MigrateCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class MigrateCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
