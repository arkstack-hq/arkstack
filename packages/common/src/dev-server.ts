import { fork, type ChildProcess, type ForkOptions } from 'node:child_process'
import { access, stat } from 'node:fs/promises'
import path from 'node:path'
import { nodeEnv } from './system'

interface OutputChunk {
    facadeModuleId?: string | null;
    isEntry?: boolean;
}

interface OutputOptions {
    dir?: string;
    file?: string;
}

export interface DevServerRunnerOptions extends ForkOptions {
    input: string;
    args?: readonly string[];
}

/**
 * Run the emitted server entry after a watched build has completely settled.
 *
 * This runner does not replace the live process immediately in `writeBundle`.
 * Tsdown can still finalize or replace its output after that hook, creating a
 * short window where Node cannot resolve the entry.
 */
export const devServer = (options: DevServerRunnerOptions) => {
    if (nodeEnv() !== 'dev' || process.env.CLI_BUILD === 'true') {
        return { name: 'arkstack-dev-server-disabled' }
    }

    let child: ChildProcess | undefined
    let restart = Promise.resolve()
    const {
        input: sourceInput,
        args: runnerArgs = [],
        ...forkOptions
    } = options
    const input = path.resolve(sourceInput)
    const args = [...runnerArgs]

    const waitUntilStable = async (entry: string): Promise<void> => {
        let previousSize = -1

        for (let attempt = 0; attempt < 50; attempt++) {
            try {
                await access(entry)
                const size = (await stat(entry)).size

                if (size > 0 && size === previousSize) return
                previousSize = size
            } catch {
                previousSize = -1
            }

            await new Promise(resolve => setTimeout(resolve, 10))
        }

        throw new Error(`The emitted server entry was not ready: ${entry}`)
    }

    const stopChild = async (): Promise<void> => {
        if (!child || child.exitCode !== null) return

        const exited = new Promise<void>(resolve => child?.once('exit', () => resolve()))
        child.kill()
        await exited
    }

    return {
        name: 'arkstack-dev-server',
        writeBundle(output: OutputOptions, bundle: Record<string, OutputChunk>) {
            const fileName = Object.keys(bundle).find(name => {
                const chunk = bundle[name]

                return chunk?.isEntry && path.resolve(chunk.facadeModuleId ?? '') === input
            })

            if (!fileName) throw new Error('Could not find the emitted server entry')

            const directory = output.dir ?? path.dirname(output.file ?? '')
            const entry = path.join(directory, fileName)

            restart = restart.then(async () => {
                // Yield past `writeBundle` so tsdown can finish swapping its
                // staged output into place before we inspect or execute it.
                await new Promise(resolve => setTimeout(resolve, 0))
                await waitUntilStable(entry)
                await stopChild()
                child = fork(entry, args, forkOptions)
            })
        },
        async closeWatcher() {
            await stopChild()
        },
    }
}
