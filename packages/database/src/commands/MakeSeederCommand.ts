import { CliApp, MakeSeederCommand as Command } from 'arkormx'

export class MakeSeederCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
