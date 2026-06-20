import { registerJobsWithQueue } from './bridge'

/**
 * Boot the jobs/queue integration. Import this from your application bootstrap:
 *
 * ```ts
 * import '@arkstack/jobs/setup'
 * ```
 */
registerJobsWithQueue()
