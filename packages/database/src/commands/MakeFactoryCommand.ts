import { CliApp, MakeFactoryCommand as Command } from 'arkormx'

import { Rebuilder } from '../extensions/Rebuilder'
import { bootArkorm } from '../arkorm'

export class MakeFactoryCommand extends Command {
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
            `${str(name.replace(/Factory$/, '')).append('Factory').pascal()}`,
            'factories'
        )

        return handle
    }
}
