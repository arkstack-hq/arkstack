import { importFile, nodeEnv, outputDir } from '@arkstack/common'
import path, { join } from 'node:path'

import { Arkstack } from '@arkstack/contract'
import { Dirent } from 'node:fs'
import { JobConstructor } from './types'
import { JobRegistry } from './JobRegistry'
import { readdirSync } from 'node:fs'

/**
 * Whether a module export is a runnable job class.
 *
 * The test is `handle` on the prototype rather than `instanceof Job`: a job
 * module loaded through jiti carries its own copy of the base class, so an
 * identity check would reject every job it finds. An abstract base declares no
 * `handle` of its own and is skipped.
 */
const isJobClass = (value: unknown): value is JobConstructor => typeof value === 'function'
    && typeof (value as { prototype?: { handle?: unknown } }).prototype?.handle === 'function'

/** The job modules in the first candidate directory that has any. */
const jobFiles = (directories: string[]): [string, Dirent<string>[]] => {
    for (const directory of directories) {
        try {
            const files = readdirSync(directory, { withFileTypes: true }).filter(
                (file) => file.isFile() && ['.ts', '.js', '.mjs'].includes(path.extname(file.name)),
            )

            if (files.length) return [directory, files]
        } catch {
            // Directory missing — try the next candidate.
        }
    }

    return ['', []]
}

/**
 * Import the application's job classes so a worker can reconstruct them.
 *
 * A dedicated `queue:work` process never constructs the app's jobs itself, and
 * a job class only reaches the {@link JobRegistry} when its module is loaded —
 * without this a worker cannot resolve a single payload it pops, and every job
 * is released back onto the queue until it exhausts its attempts.
 *
 * Every concrete `Job` subclass a module exports is registered under its class
 * name, which is the name payloads are serialized with.
 *
 * @param subPath  Directory (under `src/`, or the build output) to load from.
 * @returns        The names registered, in discovery order.
 */
export const loadJobs = async (subPath: string = join('app', 'jobs')): Promise<string[]> => {
    const root = Arkstack.rootDir()

    // Production prefers the build output (a deploy ships only `dist`); dev
    // prefers source so edits land without a rebuild. Either falls back.
    const [directory, files] = jobFiles(nodeEnv() === 'prod'
        ? [join(outputDir(), subPath), join(root, 'src', subPath)]
        : [join(root, 'src', subPath), join(outputDir(), subPath)])

    const registered: string[] = []

    for (const file of files) {
        // One unloadable job module must not cost the worker every other job.
        try {
            const module = await importFile<Record<string, unknown>>(join(directory, file.name))

            for (const value of Object.values(module)) {
                if (!isJobClass(value)) continue

                JobRegistry.register(value)
                registered.push(value.name)
            }
        } catch {
            continue
        }
    }

    return registered
}
