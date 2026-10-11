import { CliApp, SeedCommand as Command } from 'arkormx'

import { bootArkorm } from '../arkorm'

export class SeedCommand extends Command {
  async handle() {
    try {
      bootArkorm()
    } catch {
      /** */
    }

    this.app.command = this

    this.app = new CliApp()

    return super.handle()
  }
}
