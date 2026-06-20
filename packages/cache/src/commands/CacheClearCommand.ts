import { Cache } from '../CacheManager'
import { Command } from '@h3ravel/musket'

/**
 * Flush all entries from a cache store.
 */
export class CacheClearCommand extends Command {
    protected signature = `cache:clear
        {--store= : The cache store to flush. Defaults to the configured default store.}
    `
    protected description = 'Flush the application cache.'

    async handle () {
        const store = this.option('store')

        await Cache.store(store).flush()

        this.info(`Cache store [${store ?? 'default'}] cleared successfully.`)
    }
}
