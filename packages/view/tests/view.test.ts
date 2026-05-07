import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { View, ViewFactory, view } from '../src'

let viewsPath: string

describe('View', () => {
    beforeEach(async () => {
        viewsPath = await mkdtemp(join(tmpdir(), 'arkstack-view-'))
        View.configure({ viewsPath })
    })

    afterEach(async () => {
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
        expect(globalThis.view).toBe(view)
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

    it('runs wildcard and named view composers before rendering', async () => {
        await writeFile(join(viewsPath, 'profile.edge'), '{{ title }}: {{ name }}{{ suffix }}')

        class ProfileComposer {
            compose (renderedView: Parameters<Parameters<typeof View.composer>[1]>[0]) {
                renderedView.with('name', 'Ada')
            }
        }

        class ProfileSuffixComposer {
            compose (renderedView: Parameters<Parameters<typeof View.composer>[1]>[0]) {
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
})
