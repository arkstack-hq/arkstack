import type { Choice, Choices, PublishConfirmation, PublishGroup } from '@arkstack/common'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { groupPublishables, loadPackageSetups } from '../helpers'

import { Arkstack } from '@arkstack/contract'
import { Command } from '@h3ravel/musket'
import { Publisher } from '@arkstack/common'

/** A choice the user made for a package's confirmation: the picked tag + transform. */
interface PublishChoice {
    tag: string
    callback?: PublishConfirmation['callback']
}

/** Suffix that marks a file as a publishable stub; stripped on publish. */
const STUB_SUFFIX = '.stub'

/**
 * Strip a trailing `.stub` suffix from a path.
 *
 * Stubs are shipped as `<name>.<ext>.stub` so they are ignored by linting,
 * type-checking and test discovery in the source repo, then restored to their
 * real extension when published into an application.
 *
 * @param path
 */
export const stripStubSuffix = (path: string): string =>
    path.endsWith(STUB_SUFFIX) ? path.slice(0, -STUB_SUFFIX.length) : path

/**
 * Publish artifacts (migrations, stubs, assets, …) that installed packages
 * register via `publishes()` into the consuming application.
 */
export class PublishCommand extends Command {
    protected signature = `publish
        {--package= : Only publish artifacts registered by this package (e.g. @arkstack/cache).}
        {--tag= : Only publish artifacts registered under this tag.}
        {--force : Overwrite files that already exist at the destination.}
        {--list : List the publishable artifacts without copying anything.}
    `

    protected description = 'Publish package artifacts into your application.'

    async handle() {
        // Installed packages register their publishables from their `setup`
        // module — load them before reading the registry.
        await loadPackageSetups()


        const interactive = this.option('interaction') !== false
        const filter = {
            package: this.option('package'),
            tag: this.option('tag'),
        }

        /**
         * When nothing is targeted explicitly, ask which package to publish.
         * An explicit `--tag` (or `--package`) is already a target, so it skips
         * the prompt — and `--no-interaction` never prompts.
         */
        if (!filter.package && !filter.tag && interactive && !this.option('list')) {
            const groups = groupPublishables('package')
            filter.package = await this.choice('Choose a package to publish', groups)
        }

        // `--list` shows everything available without prompting or gating.
        if (this.option('list')) {
            return void this.listGroups(Publisher.publishables(filter))
        }

        // Resolve any package confirmations: a package can ask the user to pick a
        // tag (or any value), which decides what — and how — gets published.
        const { choices, gated } = await this.resolveConfirmations(filter)

        const groups = Publisher.publishables(filter).filter((group) =>
            // A tag offered behind a confirmation is published only when chosen;
            // every other group publishes unconditionally.
            !gated.has(group.tag ?? '') || choices.get(group.package)?.tag === group.tag,
        )

        if (groups.length < 1) {
            return void this.warn(
                `No publishable artifacts found${this.describeFilter(filter)}.`,
            )
        }

        let published = 0
        let skipped = 0

        for (const group of groups) {
            const choice = choices.get(group.package)

            for (const entry of group.entries) {
                if (!existsSync(entry.from)) {
                    this.warn(`[${group.package}] Source not found, skipping: ${entry.from}`)
                    continue
                }

                // The published artifact never keeps the `.stub` marker.
                const to = stripStubSuffix(entry.to)
                const dest = join(Arkstack.rootDir(), to)

                if (existsSync(dest) && !this.option('force')) {
                    this.warn(`Exists, skipped (use --force): ${to}`)
                    skipped++
                    continue
                }

                let content = readFileSync(entry.from, 'utf-8')

                // Let the package post-process the stub based on the user's choice.
                if (choice?.callback) {
                    content = await choice.callback(choice.tag, content)
                }

                mkdirSync(dirname(dest), { recursive: true })
                writeFileSync(dest, content, { encoding: 'utf-8' })

                // A published directory may itself contain `.stub` files.
                if (statSync(dest).isDirectory()) {
                    this.stripStubsInTree(dest)
                }

                this.success(`Published [${group.package}] -> ${to}`)
                published++
            }
        }

        this.info(`Done. ${published} published, ${skipped} skipped.`)
    }

    /**
     * Resolve package confirmations into the user's choices.
     *
     * Each confirmation lets a package prompt for a value (typically a tag); the
     * picked tag selects which gated group publishes, and the confirmation's
     * `callback` transforms the published stubs. An explicit `--tag` bypasses the
     * prompt (and still applies the matching callback); `--no-interaction` skips
     * prompting, so gated tags are left unpublished.
     *
     * @param filter  The active package/tag filter.
     * @returns       The per-package choices and the set of gated tags.
     */
    private async resolveConfirmations(
        { package: pkg, tag }: { package?: string, tag?: string }
    ) {
        const confirmations = Publisher.confirmables(pkg || true)
        const choices = new Map<string, PublishChoice>()
        const gated = new Set<string>()

        const interactive = this.option('interaction') !== false

        for (const confirmation of confirmations) {
            const values = this.choiceValues(confirmation.options)
            values.forEach((value) => gated.add(value))

            if (tag) {
                // Explicit tag: no prompt, but still apply the callback if this
                // confirmation offers that tag.
                if (values.includes(tag)) {
                    choices.set(confirmation.package, {
                        tag: tag,
                        callback: confirmation.callback
                    })
                }

                continue
            }

            if (!interactive) {
                this.warn(`[${confirmation.package}] Skipped "${confirmation.message}" (no-interaction); pass --tag to publish a specific option.`)
                continue
            }

            const _tag = await this.choice(
                `[${confirmation.package}] ${confirmation.message}`,
                confirmation.options as Choices,
            )

            choices.set(confirmation.package, { tag: _tag, callback: confirmation.callback })
        }

        return { choices, gated }
    }

    /** 
     * Extract the selectable values from a confirmation's choices. 
     * 
     * @param options 
     * @returns 
     */
    private choiceValues(options: Choices): string[] {
        return (options as ReadonlyArray<string | Choice<string>>).map((option) =>
            typeof option === 'string' ? option : option.value,
        )
    }

    /**
     * Recursively rename `*.stub` files within a published directory to their
     * real extension.
     *
     * @param dir
     */
    private stripStubsInTree(dir: string) {
        for (const item of readdirSync(dir, { recursive: true, withFileTypes: true })) {
            if (item.isFile() && item.name.endsWith(STUB_SUFFIX)) {
                const current = join(item.parentPath, item.name)

                renameSync(current, stripStubSuffix(current))
            }
        }
    }

    /**
     * Print the publishable artifacts grouped by package without copying.
     *
     * @param groups
     */
    private listGroups(groups: PublishGroup[]) {
        this.info('Publishable artifacts:')

        for (const group of groups) {
            this.line(`  ${group.package}${group.tag ? ` (tag: ${group.tag})` : ''}`)

            for (const entry of group.entries) {
                this.line(`    - ${stripStubSuffix(entry.to)}`)
            }
        }
    }

    private describeFilter(filter: { package?: string, tag?: string }): string {
        const parts = [
            filter.package ? `package "${filter.package}"` : '',
            filter.tag ? `tag "${filter.tag}"` : '',
        ].filter(Boolean)

        return parts.length ? ` for ${parts.join(' and ')}` : ''
    }
}
