import { CliApp, MakeSeederCommand as Command } from 'arkormx'

import { Rebuilder } from '../extensions/Rebuilder'
import { bootArkorm } from '../arkorm'

export class MakeSeederCommand extends Command {
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
            `${str(name.replace(/Seeder$/, '')).append('Seeder').pascal()}`,
            'seeders'
        )

        return handle
    }
}
