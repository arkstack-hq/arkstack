import { CliApp, MigrateFreshCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class MigrateFreshCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
