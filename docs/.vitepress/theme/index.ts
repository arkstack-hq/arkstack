// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'
import LandingLayout from '../components/LandingLayout.vue'
import HIcon from '../components/HIcon.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp ({ app, router, siteData }) {
    app.component('icon', HIcon)
    app.component('landing', LandingLayout)
  }
} satisfies Theme
