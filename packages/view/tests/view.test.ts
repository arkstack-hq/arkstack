import { View, ViewFactory, ViewInstance, clearRouterViewPlugin, clearViewData, runWithViewData, view } from '../src'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'

import { Arkstack } from '@arkstack/contract'
import { Session } from '../../http/src'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let viewsPath: string
const test = parseFloat(process.versions.node) > 22.99 ? it : it.skip

View.boot()

const clearTestSession = () => {
    const session = globalThis.session?.()

    if (session && typeof session === 'object' && 'clear' in session && typeof session.clear === 'function') {
        session.clear()
    }

    delete (globalThis as any).session
}

describe('View', () => {
    beforeEach(async () => {
        viewsPath = await mkdtemp(join(tmpdir(), 'arkstack-view-'))
        View.configure({ viewsPath })
    })

    afterEach(async () => {
        clearTestSession()
        clearViewData()
        await rm(viewsPath, { recursive: true, force: true })
    })

    it('renders views from the imported helper and static View API', async () => {
        await writeFile(join(viewsPath, 'welcome.edge'), 'Hello {{ name }} from {{ app }}')

        View.share({ app: 'Arkstack' })

        await expect(view('welcome', { name: 'Ada' })).resolves.toBe('Hello Ada from Arkstack')
        await expect(View.make('welcome', { name: 'Grace' }).render()).resolves.toBe('Hello Grace from Arkstack')
    })

    it('returns the factory from view() and supports global share data', async () => {
        await writeFile(join(viewsPath, 'home.edge'), '{{ greeting }}, {{ name }}')

        view().share({ greeting: 'Hello' }).share('name', 'Ada')

        await expect(view('home')).resolves.toBe('Hello, Ada')
        expect(globalThis.view()).toBe(view())
    })

    it('supports local data through view instance with calls', async () => {
        await writeFile(join(viewsPath, 'local.edge'), '{{ greeting }}, {{ name }}')

        await expect(view('local').with({ greeting: 'Hello' }).with('name', 'Ada')).resolves.toBe('Hello, Ada')
    })

    it('checks existence and renders the first existing view', async () => {
        await writeFile(join(viewsPath, 'fallback.edge'), 'Fallback {{ name }}')

        expect(View.exists('missing')).toBe(false)
        expect(View.exists('fallback')).toBe(true)

        await expect(View.first(['missing', 'fallback'], { name: 'Ada' })).resolves.toBe('Fallback Ada')
    })

    it('throws when none of the fallback views exist', () => {
        expect(() => View.first(['missing', 'also-missing'])).toThrow('None of the given views exist: missing, also-missing')
    })

    it('renders raw views synchronously with composer data', () => {
        View.raw('inline', '{{ greeting }}, {{ name }}')
        View.composer('inline', renderedView => {
            renderedView.with('greeting', 'Hello')
        })

        const renderedView = View.make('inline').with('name', 'Ada')

        expect(renderedView.renderSync()).toBe('Hello, Ada')
    })

    it('flushes shared data and composers independently', async () => {
        await writeFile(join(viewsPath, 'flush.edge'), '{{ greeting || "No greeting" }} {{ name || "No name" }}')

        View.share('greeting', 'Hello')
        View.composer('flush', renderedView => {
            renderedView.with('name', 'Ada')
        })

        await expect(View.make('flush')).resolves.toBe('Hello Ada')

        View.factoryInstance().flushShared()
        await expect(View.make('flush')).resolves.toBe('No greeting Ada')

        View.factoryInstance().flushComposers()
        await expect(View.make('flush')).resolves.toBe('No greeting No name')
    })

    it('provides a safe error bag to views', async () => {
        await writeFile(join(viewsPath, 'form.edge'), '{{ errors.has("email") ? errors.first("email") : "No errors" }}')

        await expect(view('form')).resolves.toBe('No errors')
        await expect(view('form', { errors: { email: ['Email is required'] } })).resolves.toBe('Email is required')
    })

    it('falls back to the active HTTP session errors for views', async () => {
        await writeFile(join(viewsPath, 'session-errors.edge'), '{{ errors.first("email") }}')

        new Session({
            errors: {
                email: ['Email is required'],
            },
        })

        await expect(view('session-errors')).resolves.toBe('Email is required')
    })

    it('uses per-request view data from the Clear Router view plugin', async () => {
        await writeFile(join(viewsPath, 'request.edge'), '{{ session.get("intended") }}:{{ errors.first("email") }}')

        let resolver: (context: any) => void | Promise<void> = () => undefined
        clearRouterViewPlugin.setup({
            useHttpContext (callback: any) {
                resolver = callback
            },
        } as never)

        await resolver({
            ctx: {
                res: {
                    locals: {
                        session: {
                            get: (key: string) => key === 'intended' ? '/dashboard' : undefined,
                        },
                        errors: {
                            first: (field: string) => field === 'email' ? 'Email is required' : '',
                            get: () => ['Email is required'],
                            has: () => true,
                            all: () => ['Email is required'],
                        },
                    },
                },
            },
        })

        await expect(view('request')).resolves.toBe('/dashboard:Email is required')
    })

    test('scopes explicit view context data to a render callback', async () => {
        await writeFile(join(viewsPath, 'scoped.edge'), '{{ errors.first("email") || "empty" }}')

        await expect(runWithViewData(
            { errors: { email: ['Scoped error'] } },
            () => view('scoped'),
        )).resolves.toBe('Scoped error')
        await expect(view('scoped')).resolves.toBe('empty')
    })

    it('runs wildcard and named view composers before rendering', async () => {
        await writeFile(join(viewsPath, 'profile.edge'), '{{ title }}: {{ name }}{{ suffix }}')

        class ProfileComposer {
            compose (renderedView: ViewInstance) {
                renderedView.with('name', 'Ada')
            }
        }

        class ProfileSuffixComposer {
            compose (renderedView: ViewInstance) {
                renderedView.with('suffix', '!')
            }
        }

        View.composer('*', renderedView => {
            renderedView.with({ title: 'User' })
        })

        View.composer('profile', ProfileComposer)
        View.composer('profile', new ProfileSuffixComposer())

        await expect(View.make('profile')).resolves.toBe('User: Ada!')
    })

    it('can create isolated factories for alternate view roots', async () => {
        const factory = new ViewFactory({ viewsPath })

        await writeFile(join(viewsPath, 'plain.edge'), '{{ message }}')

        await expect(factory.make('plain').with({ message: 'Hi' })).resolves.toBe('Hi')
    })

    it('renders unscoped package views with tilde notation', async () => {
        const root = await mkdtemp(join(tmpdir(), 'arkstack-package-view-'))
        Arkstack.setRootDir(root)
        const previous = Arkstack.rootDir()

        process.chdir(root)

        try {
            const packageViews = join(root, 'node_modules', 'billing-kit', 'resources', 'views')

            await mkdir(packageViews, { recursive: true })
            await writeFile(join(packageViews, 'mail.edge'), 'Invoice {{ number }}')

            const factory = new ViewFactory({ viewsPath })

            expect(factory.exists('~billing-kit.mail')).toBe(true)
            await expect(factory.make('~billing-kit.mail', { number: 'A-100' })).resolves.toBe('Invoice A-100')
        } finally {
            process.chdir(previous)
            await rm(root, { recursive: true, force: true })
        }
    })

    it('renders scoped package views with tilde notation', async () => {
        const root = await mkdtemp(join(tmpdir(), 'arkstack-scoped-package-view-'))
        Arkstack.setRootDir(root)
        const previous = Arkstack.rootDir()

        process.chdir(root)

        try {
            const packageViews = join(root, 'node_modules', '@toneflix', 'mail-kit', 'resources', 'views')
            await mkdir(packageViews, { recursive: true })
            await writeFile(join(packageViews, 'mail.edge'), 'Welcome {{ name }} from {{ source }}')

            const factory = new ViewFactory({ viewsPath })
            factory.composer('~toneflix/mail-kit.mail', renderedView => {
                renderedView.with('source', renderedView.name)
            })

            expect(factory.exists('~toneflix/mail-kit.mail')).toBe(true)
            await expect(factory.make('~toneflix/mail-kit.mail', { name: 'Ada' })).resolves.toBe('Welcome Ada from ~toneflix/mail-kit.mail')
        } finally {
            process.chdir(previous)
            await rm(root, { recursive: true, force: true })
        }
    })
})
