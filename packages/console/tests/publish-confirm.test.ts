// oxlint-disable typescript/no-explicit-any
import { beforeEach, describe, expect, test, vi } from 'vitest'

const fsState = vi.hoisted(() => ({ writes: new Map<string, string>() }))

vi.mock('node:fs', () => ({
    // Source stubs live under a `FROM/` prefix; destinations never do, so they
    // are treated as "not yet present" and get written.
    existsSync: (p: string) => String(p).includes('FROM'),
    mkdirSync: () => undefined,
    readFileSync: (p: string) => `// ${p} ext={{ext}}`,
    writeFileSync: (p: string, c: string) => void fsState.writes.set(String(p), String(c)),
    statSync: () => ({ isDirectory: () => false }),
    readdirSync: () => [],
    renameSync: () => undefined,
}))

import { PublishCommand } from '../src/commands/PublishCommand'
import { Publisher } from '@arkstack/common'

const registerInertia = () => {
    Publisher.publishes({ package: '@arkstack/inertia', tag: 'inertia-config', entries: [{ from: 'FROM/config', to: 'src/config/inertia.ts' }] })
    Publisher.publishes({ package: '@arkstack/inertia', tag: 'inertia-vue', entries: [{ from: 'FROM/vue', to: 'resources/js/app.ts' }] })
    Publisher.publishes({ package: '@arkstack/inertia', tag: 'inertia-react', entries: [{ from: 'FROM/react', to: 'resources/js/app.tsx' }] })

    Publisher.confirm({
        package: '@arkstack/inertia',
        message: 'Which framework?',
        options: [
            { name: 'Vue', value: 'inertia-vue' },
            { name: 'React', value: 'inertia-react' },
        ],
        callback: (tag, stub) => stub.replaceAll('{{ext}}', tag === 'inertia-react' ? '.tsx' : '.ts'),
    })
}

const makeCtx = (opts: Record<string, any>, choice?: any) => {
    const ctx: any = Object.create(PublishCommand.prototype)
    ctx.loadPackageSetups = async () => undefined
    ctx.option = (key: string) => opts[key]
    ctx.choice = choice ?? vi.fn(async () => 'inertia-vue')
    ctx.warn = vi.fn()
    ctx.success = vi.fn()
    ctx.info = vi.fn()
    ctx.line = vi.fn()

    return ctx
}

const wrote = (to: string) => [...fsState.writes.entries()].find(([key]) => key.endsWith(to))?.[1]

describe('publish confirmations', () => {
    beforeEach(() => {
        Publisher.clear()
        fsState.writes.clear()
        registerInertia()
    })

    test('prompts, publishes only the chosen gated tag, and runs the callback', async () => {
        const choice = vi.fn(async () => 'inertia-vue')
        const ctx = makeCtx({ interaction: true }, choice)

        await ctx.handle()

        expect(choice).toHaveBeenCalledOnce()
        // unconditional group + the chosen (vue) group
        expect(wrote('src/config/inertia.ts')).toBeDefined()
        expect(wrote('resources/js/app.ts')).toBeDefined()
        // the non-chosen gated group is excluded
        expect(wrote('resources/js/app.tsx')).toBeUndefined()
        // callback transformed {{ext}} for the chosen framework (.ts)
        expect(wrote('resources/js/app.ts')).toContain('ext=.ts')
        expect(wrote('src/config/inertia.ts')).toContain('ext=.ts')
    })

    test('an explicit --tag bypasses the prompt and still applies the callback', async () => {
        const choice = vi.fn(async () => 'inertia-vue')
        const ctx = makeCtx({ interaction: true, tag: 'inertia-react' }, choice)

        await ctx.handle()

        expect(choice).not.toHaveBeenCalled()
        expect(wrote('resources/js/app.tsx')).toContain('ext=.tsx')
        expect(wrote('resources/js/app.ts')).toBeUndefined()
        expect(wrote('src/config/inertia.ts')).toBeUndefined()
    })

    test('--no-interaction skips prompts and leaves gated tags unpublished', async () => {
        const choice = vi.fn(async () => 'inertia-vue')
        const ctx = makeCtx({ interaction: false }, choice)

        await ctx.handle()

        expect(choice).not.toHaveBeenCalled()
        // only the unconditional group publishes
        expect(wrote('src/config/inertia.ts')).toBeDefined()
        expect(wrote('resources/js/app.ts')).toBeUndefined()
        expect(wrote('resources/js/app.tsx')).toBeUndefined()
    })
})
