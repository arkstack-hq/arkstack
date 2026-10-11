import { ArkstackConsoleApp } from '../app'
import { Command } from '@h3ravel/musket'

// oxlint-disable-next-line typescript/no-explicit-any
export class MakeFullResource extends Command<ArkstackConsoleApp<any>> {
  protected signature = `make:full-resource
        {prefix : prefix of the resources to create, "Admin" will create AdminResource, AdminCollection and AdminController}
        {--m|model? : name of model to attach to the generated controller}
        {--f|factory : Create and link a factory}
        {--s|seeder : Create a seeder file for the model (only if --model is specified)}
        {--x|migration : Create a migration file for the model (only if --model is specified)}
        {--force : force overwrite if resources already exist}
    `

  protected description = 'Create a full new set of API resources (Controller, Resource, Collection)'

  async handle() {
    this.app.command = this

    const res1 = this.app.makeResource(this.argument('prefix'), {
      force: this.option('force'),
    })
    const res2 = this.app.makeResource(this.argument('prefix') + 'Collection', {
      collection: true,
      force: this.option('force'),
    })
    const name3 = this.app.makeController(
      this.argument('prefix'),
      Object.assign({}, this.options(), {
        api: true,
        force: this.option('force'),
      }),
    )

    this.success(
      `Created full resource set: ${this.app.normalizePath(res1.name)}, ${this.app.normalizePath(res2.name)}, ${this.app.normalizePath(name3)} successfully!`,
    )
  }
}
