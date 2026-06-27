import { type ChildProcess, spawn } from 'node:child_process'
import { isAbsolute, join } from 'node:path'

/** The default location of the built SSR bundle, relative to the app root. */
export const DEFAULT_SSR_BUNDLE = 'dist-ssr/ssr.js'

/**
 * Resolve the SSR bundle path run by `ark inertia:ssr`.
 *
 * Precedence: an explicit `--bundle` option, then `inertia.ssr.bundle` config,
 * then {@link DEFAULT_SSR_BUNDLE}. Relative paths are resolved from `rootDir`.
 */
export const resolveSsrBundle = (
    rootDir: string,
    option?: string,
    configured?: string,
): string => {
    const bundle = option || configured || DEFAULT_SSR_BUNDLE

    return isAbsolute(bundle) ? bundle : join(rootDir, bundle)
}

export interface SuperviseOptions {
    /** Working directory for the spawned process. */
    cwd?: string
    /** Restart the process when it exits unexpectedly (default `true`). */
    restart?: boolean
    /** Delay before restarting after a crash, in ms (default `1000`). */
    restartDelayMs?: number
    /** Called when the child exits; `willRestart` reflects the restart decision. */
    onExit?: (code: number | null, willRestart: boolean) => void
    /** Called when the child fails to spawn. */
    onError?: (error: Error) => void
}

/** Handle to a supervised process. */
export interface SsrProcessController {
    /** Stop the process and prevent further restarts. */
    stop (): void
    /** Resolves when the process has stopped (and will not restart). */
    done: Promise<void>
}

/**
 * Spawn and supervise a long-running process, restarting it when it crashes
 * until {@link SsrProcessController.stop} is called. Used by `ark inertia:ssr` to
 * keep the Inertia SSR server alive.
 */
export const superviseProcess = (
    command: string,
    args: string[],
    options: SuperviseOptions = {},
): SsrProcessController => {
    const { cwd, restart = true, restartDelayMs = 1000 } = options

    let child: ChildProcess | undefined
    let timer: NodeJS.Timeout | undefined
    let stopping = false
    let resolveDone: () => void = () => {}
    const done = new Promise<void>((resolve) => {
        resolveDone = resolve
    })

    const start = () => {
        child = spawn(command, args, { cwd, stdio: 'inherit' })

        child.on('error', (error) => {
            options.onError?.(error)
            resolveDone()
        })

        child.on('exit', (code) => {
            const willRestart = !stopping && restart

            options.onExit?.(code, willRestart)

            if (!willRestart) {
                resolveDone()

                return
            }

            timer = setTimeout(start, restartDelayMs)
        })
    }

    start()

    return {
        stop () {
            stopping = true

            if (timer) {
                clearTimeout(timer)
            }

            child?.kill('SIGTERM')
        },
        done,
    }
}
