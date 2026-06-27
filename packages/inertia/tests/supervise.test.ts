import { describe, expect, test } from 'vitest'

import { superviseProcess } from '../src/ssr-process'

const node = process.execPath

describe('superviseProcess', () => {
    test('restarts a crashing process until stopped', async () => {
        let exits = 0
        const controller = superviseProcess(node, ['-e', 'process.exit(1)'], {
            restart: true,
            restartDelayMs: 10,
            onExit: () => {
                exits += 1

                // Let it restart a couple of times, then stop.
                if (exits === 3) {
                    controller.stop()
                }
            },
        })

        await controller.done

        expect(exits).toBeGreaterThanOrEqual(3)
    })

    test('does not restart when restart is false', async () => {
        let willRestart: boolean | undefined
        const controller = superviseProcess(node, ['-e', 'process.exit(0)'], {
            restart: false,
            onExit: (_code, restart) => {
                willRestart = restart
            },
        })

        await controller.done

        expect(willRestart).toBe(false)
    })

    test('stop() terminates a long-running process', async () => {
        const controller = superviseProcess(node, ['-e', 'setInterval(() => {}, 1000)'], {
            restart: true,
            restartDelayMs: 10,
        })

        // Give it a moment to spawn, then stop it.
        await new Promise((resolve) => setTimeout(resolve, 100))
        controller.stop()

        await expect(controller.done).resolves.toBeUndefined()
    })

    test('reports a spawn failure via onError', async () => {
        let error: Error | undefined
        const controller = superviseProcess('/no/such/binary-xyz', [], {
            restart: false,
            onError: (e) => {
                error = e
            },
        })

        await controller.done

        expect(error).toBeInstanceOf(Error)
    })
})
