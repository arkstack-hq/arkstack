import { existsSync, readdirSync } from 'node:fs'

import { Arkstack } from '@arkstack/contract'
import { GroupedOption } from './types'
import { Publisher } from '@arkstack/common'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Import the `setup` module of every installed `@arkstack/*` package so its
 * `publishes()` registrations run. Errors (missing build, side effects) are
 * ignored so one bad package cannot break publishing.
 */
export const loadPackageSetups = async () => {
    const scope = join(Arkstack.rootDir(), 'node_modules', '@arkstack')

    if (!existsSync(scope)) {
        return
    }

    for (const pkg of readdirSync(scope)) {
        const setup = join(scope, pkg, 'dist', 'setup.js')

        if (!existsSync(setup)) {
            continue
        }

        try {
            await import(pathToFileURL(setup).href)
        } catch {
            /** Ignore packages whose setup cannot be loaded in this context. */
        }
    }
}

export function groupPublishables(groupBy: 'tag' | 'package' = 'tag'): GroupedOption[] {
    const groups = new Map<
        string,
        {
            name: string;
            packages: Set<string>;
            tags: Set<string>;
            entries: number;
        }
    >()

    const publishables = Publisher.publishables()

    for (const item of publishables) {
        const tag = item.tag ?? 'untagged'
        const key = groupBy === 'tag' ? tag : item.package

        if (!groups.has(key)) {
            groups.set(key, {
                name: key,
                packages: new Set(),
                tags: new Set(),
                entries: 0,
            })
        }

        const group = groups.get(key)!

        group.packages.add(item.package)
        group.tags.add(tag)
        group.entries += item.entries.length
    }

    return Array.from(groups.values()).map(g => ({
        name: g.name,
        value: g.name,
        description: groupBy === 'package'
            ? `${g.name} has ${g.tags.size} tag${g.tags.size === 1 ? '' : 's'} and ${g.entries} publishable${g.entries === 1 ? '' : 's'}`
            : g.name === 'untagged'
                ? `These publishables have no tag and include ${g.entries} publishable${g.entries === 1 ? '' : 's'} from ${g.packages.size} package${g.packages.size === 1 ? '' : 's'}`
                : `This tag exists in ${g.packages.size} package${g.packages.size === 1 ? '' : 's'} and has ${g.entries} publishable${g.entries === 1 ? '' : 's'}`,
    }))
}