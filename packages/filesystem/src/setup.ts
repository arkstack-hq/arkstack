import { dirname, join } from 'node:path'

import { Publisher } from '@arkstack/common'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

Publisher.publishes({
    package: '@arkstack/filesystem',
    tag: 'filesystem-config',
    entries: [
        {
            from: join(root, 'stubs/config/filesystem.ts.stub'),
            to: 'src/config/filesystem.ts',
        },
    ],
})