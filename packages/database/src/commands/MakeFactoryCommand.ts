import { CliApp, MakeFactoryCommand as Command } from 'arkormx'

import { Rebuilder } from '../extensions/Rebuilder'

export class MakeFactoryCommand extends Command {
    async handle () {
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
