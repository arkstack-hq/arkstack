import type { ResoraConfig } from 'resora'
import appConfig from './app'

/**
 * Resora configuration, applied per request by the `resora()` middleware and at
 * generation time by `make:resource`.
 *
 * The object is cast to `ResoraConfig` because it also carries arkstack
 * passthrough fields (`localStubsDir` and the controller/model stub names) that
 * resora accepts at runtime but doesn't surface in its narrower config type.
 */
export default (): ResoraConfig => {
    const app = appConfig()

    return {
        preferredCase: 'camel',
        responseStructure: {
            wrap: true,
            rootKey: 'data',
        },
        paginatedExtras: ['meta', 'links'],
        baseUrl: app.url ?? 'https://localhost',
        pageName: 'page',
        paginatedLinks: {
            first: 'first',
            last: 'last',
            prev: 'prev',
            next: 'next',
        },
        paginatedMeta: {
            to: 'to',
            from: 'from',
            links: 'links',
            path: 'path',
            total: 'total',
            per_page: 'per_page',
            last_page: 'last_page',
            current_page: 'current_page',
        },
        cursorMeta: {
            previous: 'previous',
            next: 'next',
        },
        resourcesDir: 'src/app/http/resources',
        localStubsDir: 'node_modules/@arkstack/driver-express/stubs',
        stubs: {
            resource: 'resource.stub',
            collection: 'resource.collection.stub',
            controller: 'controller.stub',
            api: 'controller.api.stub',
            model: 'controller.model.stub',
            apiResource: 'controller.api.resource.stub',
        },
    } as ResoraConfig
}
