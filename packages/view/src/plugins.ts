import { collectViewData, enterViewData } from './viewContext'

import { definePlugin as defineClearRouterPlugin } from 'clear-router/core'

export const clearRouterViewPlugin = defineClearRouterPlugin({
    name: 'arkstack-view',
    setup: ({ useHttpContext }) => {
        useHttpContext((context) => {
            enterViewData(collectViewData(context))
        })
    },
})