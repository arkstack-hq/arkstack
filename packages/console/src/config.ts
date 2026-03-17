import { Core } from './types'

export const defaultConfig = (app: Core) => {
    const driver = app.getDriver().name ?? 'h3'

    return {
        resourcesDir: 'src/app/http/resources',
        localStubsDir: `node_modules/@arkstack/driver-${driver}/stubs`,
        stubs: {
            resource: 'resource.stub',
            collection: 'resource.collection.stub',
            controller: 'controller.stub',
            api: 'controller.api.stub',
            model: 'controller.model.stub',
            apiResource: 'controller.api.resource.stub',
        }
    }
}