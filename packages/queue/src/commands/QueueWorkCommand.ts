import { Command } from '@h3ravel/musket'
import { Queue } from '../QueueManager'
import { Worker } from '../Worker'
import { bootArkorm } from '@arkstack/database'

/** The message of a thrown value, whatever it is. */
const reason = (error: unknown): string => error instanceof Error
    ? error.message
    : String(error)

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

    async handle() {
        const connection = Queue.connection(this.argument('connection') as string | undefined)
        const worker = new Worker(connection).on({
            onProcessed: (job) => {
                this.success(`Processed: ${job.name()}`)
            },
            onFailed: (job, error, released) => {
                this.error(released
                    ? `Failed (attempt ${job.attempts()}, retrying): ${job.name()} — ${reason(error)}`
                    : `Failed permanently: ${job.name()} — ${reason(error)}`)
            },
        })

        const queue = (this.option('queue') as string | undefined) ?? connection.getDefaultQueue()

        try {
            bootArkorm()
        } catch {/** */ }

        // The worker runs in its own process, so nothing has constructed the
        // application's jobs and the registry a payload resolves against is
        // empty. Load them before working, or every job pops and fails.
        await this.registerJobs()

        if (this.option('once')) {
            const handled = await worker.runNextJob(queue)

            if (!handled) this.info('No jobs available.')

            return
        }

        this.info(`Processing jobs from the [${connection.getConnectionName()}] connection on the [${queue}] queue.`)

        await worker.daemon({
            queue,
            sleep: Number(this.option('sleep') ?? 3),
            maxJobs: Number(this.flag('maxJobs', 'max-jobs') ?? 0),
            stopWhenEmpty: Boolean(this.flag('stopWhenEmpty', 'stop-when-empty')),
        })
    }

    /**
     * Read a multi-word flag. Musket hands over the parsed options camelCased,
     * so `--stop-when-empty` arrives as `stopWhenEmpty`; the kebab-case name is
     * accepted too so the flag can't go quietly missing again.
     *
     * @param camel  The camelCase key.
     * @param kebab  The flag as written in the signature.
     */
    private flag(camel: string, kebab: string): unknown {
        return this.option(camel) ?? this.option(kebab)
    }

    /**
     * Register the application's job classes with `@arkstack/jobs` when it is
     * installed. Without it a payload cannot be turned back into a job.
     */
    private async registerJobs(): Promise<void> {
        try {
            const specifier = '@arkstack/jobs'
            const { loadJobs } = await import(specifier)
            const names = (await loadJobs()) as string[]

            if (names.length) this.line(`Loaded ${names.length} job class(es).`)
        } catch {
            // `@arkstack/jobs` isn't installed; the app registers its own jobs.
        }
    }
}
