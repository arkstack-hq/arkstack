import { Command } from '@h3ravel/musket'
import { Queue } from '../QueueManager'

/**
 * Process jobs from a queue connection.
 */
export class QueueWorkCommand extends Command {
    protected signature = `queue:work
        {connection? : The queue connection to work. Defaults to the configured default.}
        {--queue= : The queue to process.}
        {--sleep=3 : Seconds to sleep when no job is available.}
        {--max-jobs=0 : Stop after processing this many jobs (0 for unlimited).}
        {--once : Process a single job and exit.}
        {--stop-when-empty : Stop when the queue is empty.}
    `
    protected description = 'Start processing jobs on the queue as a daemon.'

    async handle () {
        const connection = this.argument('connection') as string | undefined
        const worker = Queue.worker(connection)
        const queue = this.option('queue') as string | undefined

        if (this.option('once')) {
            const handled = await worker.runNextJob(queue)

            this.info(handled ? 'Processed one job.' : 'No jobs available.')

            return
        }

        this.info(`Processing jobs from [${connection ?? 'default'}] connection.`)

        await worker.daemon({
            queue,
            sleep: Number(this.option('sleep') ?? 3),
            maxJobs: Number(this.option('max-jobs') ?? 0),
            stopWhenEmpty: Boolean(this.option('stop-when-empty')),
        })
    }
}
