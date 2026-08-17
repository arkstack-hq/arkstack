import { CliApp, MakeModelCommand as Command } from 'arkormx'

import { Rebuilder } from '../extensions/Rebuilder'
import { bootArkorm } from '../arkorm'

export class MakeModelCommand extends Command {
    async handle() {
        try {
            bootArkorm()
        } catch {/** */ }

        this.app.command = this

        this.app = new CliApp()

        const name = this.argument('name')
        const handle = super.handle()

        Rebuilder.build(
            this.app,
            str(name.replace(/Model$/, '')).pascal().toString(),
            'models'
        )

        return handle
    }
}
