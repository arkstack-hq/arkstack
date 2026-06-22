import { PublishFilter, PublishGroup } from './types'

const REGISTRY_KEY = Symbol.for('arkstack.publishables')

/**
 * Registry of artifacts packages want to publish into the consuming application.
 *
 * Packages call {@link Publisher.publishes} from their `setup` module so that
 * `ark publish` can copy the artifacts (migrations, config stubs, assets, …)
 * into the app. The registry is backed by a global symbol so it stays a single
 * shared instance even across duplicated module copies.
 */
export class Publisher {
    /** The shared, global-symbol-backed registry of publishable groups. */
    private static get registry(): PublishGroup[] {
        return ((globalThis as any)[REGISTRY_KEY] ??= [] as PublishGroup[])
    }

    /**
     * Register artifacts a package wants to publish into the application.
     *
     * @example
     * ```ts
     * Publisher.publishes({
     *     package: '@arkstack/cache',
     *     tag: 'cache-migrations',
     *     entries: [{ from: join(here, '../stubs/...'), to: 'src/database/migrations/...' }],
     * })
     * ```
     *
     * @param group  The publishable group to register.
     */
    static publishes(group: PublishGroup): void {
        this.registry.push(group)
    }

    /**
     * Read the registered publishable groups, optionally filtered by package or
     * tag.
     *
     * @param filter  Restrict the result to a package and/or tag.
     * @returns       The matching publishable groups.
     */
    static publishables(filter: PublishFilter = {}): PublishGroup[] {
        return this.registry.filter((group) =>
            (!filter.package || group.package === filter.package) &&
            (!filter.tag || group.tag === filter.tag),
        )
    }

    /** Remove every registered publishable group (primarily for tests). */
    static clear(): void {
        this.registry.length = 0
    }
}
