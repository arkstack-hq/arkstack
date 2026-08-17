import { CliApp, ModelsSyncCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class ModelsSyncCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
