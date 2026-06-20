import { Command } from '@h3ravel/musket'
import { Queue } from '../QueueManager'

/**
 * Delete all of the jobs from a queue.
 */
export class QueueClearCommand extends Command {
    protected signature = `queue:clear
        {connection? : The queue connection to clear. Defaults to the configured default.}
        {--queue= : The queue to clear.}
    `
    protected description = 'Delete all of the jobs from the specified queue.'

    async handle () {
        const connection = this.argument('connection') as string | undefined
        const queue = this.option('queue') as string | undefined

        const count = await Queue.connection(connection).clear(queue)

        this.info(`Cleared ${count} job(s) from the [${connection ?? 'default'}] connection.`)
    }
}
