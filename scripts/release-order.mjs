#!/usr/bin/env node

import { dirname, join } from 'node:path'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

/*
 * release-order — derive the @arkstack publish/recovery command order from the
 * workspace dependency graph, so the package list never has to be hand-kept.
 *
 * Usage:
 *   node scripts/release-order.mjs order
 *   node scripts/release-order.mjs publish
 *   node scripts/release-order.mjs fix --bad 1.16.3 [--good 0.16.3]
 *   node scripts/release-order.mjs unpublish --bad 1.16.3
 *
 * Commands:
 *   order       Print the dependency order (base-first) and its reverse.
 *   publish     Emit `pnpm publish` commands in base-first order.
 *   fix         Emit `npm dist-tag add <good> latest` + `npm deprecate <bad>`
 *               for every package — the safe recovery when unpublish is blocked.
 *   unpublish   Emit `npm unpublish <bad>` in reverse order (dependents first).
 *
 * Options:
 *   --good <v>   Good version. Defaults to each package's current version.
 *   --bad  <v>   Bad version to deprecate / unpublish (required for fix/unpublish).
 *   --run        Execute the commands instead of just printing them.
 *   --include-private   Include private packages (skipped by default).
 *   --dir <glob-root>   Packages directory (default: "packages").
 */
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const command = args[0]
const flag = (name) => {
    const i = args.indexOf(`--${name}`)

    return i !== -1 && (args[i + 1]?.startsWith('--') ?? true) ? true : i !== -1 ? args[i + 1] : undefined
}
const has = (name) => args.includes(`--${name}`)

const good = flag('good')
const bad = flag('bad')
const run = has('run')
const includePrivate = has('include-private')
const dir = (typeof flag('dir') === 'string' && flag('dir')) || 'packages'

/** Read every package.json under <dir>/*, keyed by package name. */
const readPackages = () => {
    const root = join(repoRoot, dir)
    const pkgs = new Map()

    for (const entry of readdirSync(root)) {
        const manifest = join(root, entry, 'package.json')
        if (!existsSync(manifest)) continue

        const json = JSON.parse(readFileSync(manifest, 'utf8'))
        if (!json.name) continue
        if (json.private && !includePrivate) continue

        const deps = { ...json.dependencies, ...json.peerDependencies }
        pkgs.set(json.name, { name: json.name, version: json.version, deps: Object.keys(deps) })
    }

    return pkgs
}

/**
 * Kahn topological sort: dependencies before dependents (base-first). Ties are
 * broken alphabetically for stable output; cycles are reported, not silently
 * dropped.
 */
const topoSort = (pkgs) => {
    const names = new Set(pkgs.keys())
    const indegree = new Map([...names].map((n) => [n, 0]))
    const dependents = new Map([...names].map((n) => [n, []]))

    for (const { name, deps } of pkgs.values()) {
        for (const dep of deps) {
            if (!names.has(dep) || dep === name) continue
            indegree.set(name, indegree.get(name) + 1)
            dependents.get(dep).push(name)
        }
    }

    const ready = [...names].filter((n) => indegree.get(n) === 0).sort()
    const ordered = []

    while (ready.length) {
        const n = ready.shift()
        ordered.push(n)
        for (const d of dependents.get(n).sort()) {
            indegree.set(d, indegree.get(d) - 1)
            if (indegree.get(d) === 0) {
                ready.push(d)
                ready.sort()
            }
        }
    }

    if (ordered.length !== names.size) {
        const cyclic = [...names].filter((n) => !ordered.includes(n))
        throw new Error(`Dependency cycle among: ${cyclic.join(', ')}`)
    }

    return ordered
}

/** Versions of a package currently on the registry (empty if unpublished/unknown). */
const publishedVersions = (pkg) => {
    try {
        const out = execSync(`npm view ${pkg} versions --json`, {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        })
        const parsed = JSON.parse(out)

        return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
        return []
    }
}

const emit = (lines, { continueOnError = false } = {}) => {
    const failures = []

    for (const line of lines) {
        if (!run) {
            console.log(line)
            continue
        }

        console.error(`$ ${line}`)

        try {
            execSync(line, { cwd: repoRoot, stdio: 'inherit' })
        } catch (error) {
            if (!continueOnError) throw error
            failures.push(line)
            console.error(`  ! failed (continuing): ${line.split('"')[0].trim()}`)
        }
    }

    if (failures.length) {
        console.error(`\n${failures.length} command(s) failed:\n${failures.map((f) => `  ${f}`).join('\n')}`)
    }
}

const main = () => {
    const pkgs = readPackages()
    if (!pkgs.size) throw new Error(`No publishable packages found under "${dir}/".`)

    const baseFirst = topoSort(pkgs)
    const reverse = [...baseFirst].reverse()

    switch (command) {
        case 'order':
            console.log('# dependency order (base-first — publish in this order):')
            baseFirst.forEach((n, i) => console.log(`${String(i + 1).padStart(2)}. ${n}`))
            console.log('\n# reverse (dependents-first — unpublish in this order):')
            reverse.forEach((n, i) => console.log(`${String(i + 1).padStart(2)}. ${n}`))
            break

        case 'publish':
            emit(baseFirst.map((n) => `pnpm --filter ${n} publish --no-git-checks --access public`))
            break

        case 'fix': {
            if (!bad) throw new Error('fix requires --bad <version>')
            const lines = []
            for (const n of baseFirst) {
                const goodVersion = good || pkgs.get(n).version
                const versions = publishedVersions(n)

                // Only point `latest` at a version that's actually published, and
                // only deprecate the bad one if it's still there (you may have
                // already unpublished some).
                if (versions.includes(goodVersion)) {
                    lines.push(`npm dist-tag add ${n}@${goodVersion} latest`)
                } else {
                    console.error(`# skip ${n}: ${goodVersion} not on the registry yet — run "publish" first`)
                }

                if (versions.includes(bad)) {
                    lines.push(`npm deprecate "${n}@${bad}" "Published in error — use the ${goodVersion} line"`)
                } else {
                    console.error(`# skip ${n}: ${bad} not present (already unpublished?)`)
                }
            }
            emit(lines, { continueOnError: true })
            break
        }

        case 'unpublish':
            if (!bad) throw new Error('unpublish requires --bad <version>')
            emit(reverse.map((n) => `npm unpublish ${n}@${bad}`))
            break

        default:
            console.error('Usage: node scripts/release-order.mjs <order|publish|fix|unpublish> [--good v] [--bad v] [--run] [--include-private] [--dir packages]')
            process.exit(1)
    }
}

try {
    main()
} catch (error) {
    console.error(error)
}
