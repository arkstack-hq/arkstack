import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  cleanUrls: true,
  // base: '/arkstack/',
  title: "Arkstack",
  description: "Simple, Starter Kit for Node.js applications built with TypeScript",
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'description', content: 'Simple, Starter Kit for Node.js applications built with TypeScript' }],
    ['meta', { name: 'keywords', content: 'API, Web, Node.js, TypeScript, Starter Kit' }],
    ['meta', { name: 'author', content: 'Toneflix' }],
    ['meta', { property: 'og:title', content: 'Arkstack' }],
    ['meta', { property: 'og:description', content: 'Simple, Starter Kit for Node.js applications built with TypeScript' }],
    ['meta', { property: 'og:image', content: '/logo.jpg' }],
    ['meta', { property: 'og:url', content: 'https://arkstack.github.io/arkstack/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Arkstack' }],
    ['meta', { name: 'twitter:description', content: 'Simple, Starter Kit for Node.js applications built with TypeScript' }],
    ['meta', { name: 'twitter:image', content: '/logo.jpg' }]
  ],
  themeConfig: {
    logo: '/logo.png',
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API', link: '/api' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'CLI', link: '/guide/cli' },
          { text: 'Middleware', link: '/guide/middleware' },
          { text: 'Authentication', link: '/guide/authentication' },
          { text: 'Notifications', link: '/guide/notifications' },
          { text: 'Hooks', link: '/guide/hooks' },
          { text: 'HTTP', link: '/guide/http' },
          { text: 'Database & Modeling', link: '/guide/database-modeling' },
          { text: 'API Reference', link: '/api' },
        ]
      },
      {
        text: 'Runtime Interaction',
        items: [
          { text: 'Express', link: '/guide/express-runtime' },
          { text: 'H3', link: '/guide/h3-runtime' },
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
          { text: 'Unification Roadmap', link: '/architecture/unification-roadmap' },
        ]
      },
      {
        text: 'More',
        items: [
          { text: 'Roadmap', link: '/more/roadmap' },
          { text: 'Contributing', link: '/more/contributing' },
          { text: 'Changelog', link: '/more/changelog' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'discord', link: 'https://discord.gg/jmQybxKQ7R' },
      { icon: 'github', link: 'https://github.com/arkstack-hq/arkstack' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/create-arkstack' },
    ]
  }
})
