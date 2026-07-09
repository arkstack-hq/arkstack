import path, { join } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { existsSync } from 'node:fs'
import { importFile } from '@arkstack/common'
import { outputDir } from '@arkstack/common'

/**
 * Load the application's schedule definitions from `src/routes/console.ts`.
 * The TypeScript source is preferred (loaded via jiti, so no build is needed),
 * falling back to the built `<outDir>/routes/console.js`.
 *
 * @returns `true` when a console route file was found and loaded.
 */
export const loadSchedule = async (): Promise<boolean> => {
    const root = Arkstack.rootDir()
    const dist = path.relative(root, outputDir())

    const candidates = [
        join(root, 'src', 'routes', 'console.ts'),
        join(root, dist, 'routes', 'console.js'),
    ]

    for (const file of candidates) {
        if (existsSync(file)) {
            await importFile(file)

            return true
        }
    }

    return false
}
