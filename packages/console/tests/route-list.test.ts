// oxlint-disable typescript/no-explicit-any
import { describe, expect, it } from 'vitest'

import { RouteList } from '../src/commands/RouteList'

describe('RouteList formatter', () => {
    it('includes method, path and handler columns', () => {
        const output = (RouteList.prototype as any).formatRoutes([
            {
                methods: ['get'],
                path: '/api/users',
                controllerName: 'UserController',
                actionName: 'index',
            },
            {
                methods: ['post'],
                path: '/api/users',
                actionName: 'createUser',
            },
        ])

        expect(output).toContain('METHOD')
        expect(output).toContain('PATH')
        expect(output).toContain('HANDLER')
        expect(output).toContain('GET')
        expect(output).toContain('POST')
        expect(output).toContain('/api/users')
        expect(output).toContain('UserController → index')
        expect(output).toContain('createUser')
    })

    it('returns a clear message when there are no routes', () => {
        const output = (RouteList.prototype as any).formatRoutes([])

        expect(output).toBe('No routes registered.')
    })
})
