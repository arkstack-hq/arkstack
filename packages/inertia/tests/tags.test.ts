import { describe, expect, test } from 'vitest'

import { ViewFactory } from '@arkstack/view'
import { registerInertiaTags } from '../src/tags'

const render = async (template: string, data: Record<string, unknown> = {}) => {
    const factory = new ViewFactory()
    registerInertiaTags(factory)
    factory.raw('root', template)

    return factory.make('root', data).render()
}

describe('@inertia / @inertiaHead tags', () => {
    test('@inertia renders the mount element raw', async () => {
        const html = await render('<body>\n@inertia\n</body>', {
            inertia: '<div id="app" data-page="{}"></div>',
        })

        expect(html).toContain('<div id="app" data-page="{}"></div>')
    })

    test('@inertiaHead renders the head markup raw', async () => {
        const html = await render('<head>\n@inertiaHead\n</head>', {
            inertiaHead: '<title>Home</title>',
        })

        expect(html).toContain('<title>Home</title>')
    })

    test('both tags fall back to empty output when no data is provided', async () => {
        const html = await render('<head>\n@inertiaHead\n</head>\n<body>\n@inertia\n</body>')

        expect(html).not.toContain('undefined')
    })

    test('registration is idempotent', async () => {
        const factory = new ViewFactory()
        registerInertiaTags(factory)

        expect(() => registerInertiaTags(factory)).not.toThrow()
    })
})
