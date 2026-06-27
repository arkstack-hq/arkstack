import { createApp, h } from 'vue'
import { Link, createInertiaApp } from '@inertiajs/vue3'

// A boot id that changes only on a full page (re)load — used by the Playwright
// test to assert SPA navigations do NOT trigger a full reload.
window.__APP_BOOT_ID__ = `${Date.now()}-${Math.random()}`

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/*.vue', { eager: true })

        return pages[`./Pages/${name}.vue`]
    },
    setup ({ el, App, props, plugin }) {
        const app = createApp({ render: () => h(App, props) })
        app.use(plugin)
        app.component('Link', Link)
        app.mount(el)
        window.__INERTIA_MOUNTED__ = true
    },
})
