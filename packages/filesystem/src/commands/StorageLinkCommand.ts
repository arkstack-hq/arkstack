import { Command } from '@h3ravel/musket'
import { Storage } from '../'

export class StorageLinkCommand extends Command {
    protected signature = `storage:link
        {--force : Remove existing links before creating new ones.}
    `
    protected description = 'Create symbolic links for filesystem.links configuration.'

    async handle () {
        Storage.link(this.options())
    }
}