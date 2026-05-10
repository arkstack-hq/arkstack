import { CliApp, SeedCommand as Command } from 'arkormx'

export class SeedCommand extends Command {
    async handle () {
        this.app.command = this

        this.app = new CliApp()

        return super.handle()
    }
}
