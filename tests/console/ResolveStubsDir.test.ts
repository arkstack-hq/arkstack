import { assert, test } from 'vitest'

import { resolveStubsDir } from '../../packages/console/src/app'

test('resolveStubsDir prefers localStubsDir from config', () => {
    const selected = resolveStubsDir({
        localStubsDir: 'src/app/console/stubs',
    })

    assert.equal(selected, `${process.cwd()}/src/app/console/stubs`)
})

test('resolveStubsDir falls back to options stubsDir', () => {
    const selected = resolveStubsDir(undefined, {
        stubsDir: '/tmp/stubs',
    })

    assert.equal(selected, '/tmp/stubs')
})

test('resolveStubsDir falls back to default stubsDir', () => {
    const selected = resolveStubsDir(undefined)
        .replaceAll(/node_modules\/@arkstack\/driver-([A-Za-z0-9]+)\//g, '')

    assert.containSubset(selected, `${process.cwd()}/stubs`)
})
