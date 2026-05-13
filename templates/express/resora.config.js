import { defineConfig } from 'resora'

export default defineConfig({
  preferredCase: 'camel',
  responseStructure: {
    wrap: true,
    rootKey: 'data',
  },
  paginatedExtras: ['meta', 'links'],
  baseUrl: 'https://localhost',
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
  }
})