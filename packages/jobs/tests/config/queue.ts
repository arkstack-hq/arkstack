import type { QueueConfig } from '@arkstack/queue'

export default (): QueueConfig => {
    return {
        default: env('QUEUE_CONNECTION', 'sync'),

        connections: {
            sync: {
                driver: 'sync',
            },
        },
    }
}
