import { createSSRApp, h } from 'vue'

import { createInertiaApp } from '@inertiajs/vue3'
import createServer from '@inertiajs/vue3/server'
import { renderToString } from '@vue/server-renderer'

// The Inertia SSR server: listens on :13714 and renders each posted page object
// to { head, body }. Started with `node dist-ssr/ssr.js`.
createServer((page) =>
    createInertiaApp({
        page,
        render: renderToString,
        resolve: (name) => {
            const pages = import.meta.glob('./Pages/*.vue', { eager: true })

            return pages[`./Pages/${name}.vue`]
        },
        setup ({ App, props, plugin }) {
            return createSSRApp({ render: () => h(App, props) }).use(plugin)
        },
    }),
)
