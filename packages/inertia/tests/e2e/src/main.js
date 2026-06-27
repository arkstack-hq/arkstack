import { Link, createInertiaApp } from '@inertiajs/vue3'
import { createApp, createSSRApp, h } from 'vue'

// A boot id that changes only on a full page (re)load — used by the Playwright
// test to assert SPA navigations do NOT trigger a full reload.
window.__APP_BOOT_ID__ = `${Date.now()}-${Math.random()}`

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/*.vue', { eager: true })

        return pages[`./Pages/${name}.vue`]
    },
    setup ({ el, App, props, plugin }) {
        // Hydrate when the markup was server-rendered; mount fresh otherwise.
        const hydrated = el.hasChildNodes()
        const factory = hydrated ? createSSRApp : createApp
        const app = factory({ render: () => h(App, props) })
        app.use(plugin)
        app.component('Link', Link)
        app.mount(el)
        window.__INERTIA_MOUNTED__ = true
        window.__WAS_HYDRATED__ = hydrated
    },
})
