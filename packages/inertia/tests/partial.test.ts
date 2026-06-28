import { describe, expect, test } from 'vitest'

import { Inertia } from '../src/Inertia'
import type { InertiaPage, InertiaRequest } from '../src/types'
import { runInertia } from '../src'

const partialRequest = (component: string, headers: Record<string, string>): InertiaRequest => ({
    method: 'GET',
    url: '/users',
    header: (name: string) => ({ 'x-inertia': 'true', ...headers })[name.toLowerCase()],
})

const props = () => ({
    users: () => 'users-data',
    stats: () => 'stats-data',
    settings: Inertia.always('always-data'),
    heavy: Inertia.lazy(() => 'heavy-data'),
    chart: Inertia.defer(() => 'chart-data'),
})

const render = (request: InertiaRequest) =>
    runInertia(request, () => Inertia.render('Users/Index', props())) as Promise<{ body: InertiaPage }>

describe('partial reloads', () => {
    test('full Inertia load excludes lazy and deferred props', async () => {
        const { body } = await render(partialRequest('Users/Index', {}))

        // `appName` is shared on every full load from `config('app.name')`.
        expect(Object.keys(body.props).sort()).toEqual(['appName', 'settings', 'stats', 'users'])
        expect(body.props.heavy).toBeUndefined()
        expect(body.props.chart).toBeUndefined()
    })

    test('advertises deferred props grouped on the initial load', async () => {
        const { body } = await render(partialRequest('Users/Index', {}))

        expect(body.deferredProps).toEqual({ default: ['chart'] })
    })

    test('only returns requested keys on a matching partial reload', async () => {
        const { body } = await render(partialRequest('Users/Index', {
            'x-inertia-partial-component': 'Users/Index',
            'x-inertia-partial-data': 'users',
        }))

        // `users` requested + `settings` is an always-prop.
        expect(Object.keys(body.props).sort()).toEqual(['settings', 'users'])
        expect(body.props.users).toBe('users-data')
        expect(body.deferredProps).toBeUndefined()
    })

    test('honours partial-except', async () => {
        const { body } = await render(partialRequest('Users/Index', {
            'x-inertia-partial-component': 'Users/Index',
            'x-inertia-partial-except': 'stats',
        }))

        expect(body.props.stats).toBeUndefined()
        expect(body.props.users).toBe('users-data')
        // always-props cannot be excepted.
        expect(body.props.settings).toBe('always-data')
    })

    test('deferred props are resolved when explicitly requested in a partial', async () => {
        const { body } = await render(partialRequest('Users/Index', {
            'x-inertia-partial-component': 'Users/Index',
            'x-inertia-partial-data': 'chart',
        }))

        expect(body.props.chart).toBe('chart-data')
    })

    test('a partial for a different component is treated as a full load', async () => {
        const { body } = await render(partialRequest('Users/Index', {
            'x-inertia-partial-component': 'Other/Page',
            'x-inertia-partial-data': 'users',
        }))

        // A mismatched partial is a full load, so shared `appName` is included.
        expect(Object.keys(body.props).sort()).toEqual(['appName', 'settings', 'stats', 'users'])
    })
})
