import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  cleanUrls: true,
  // base: '/arkstack/',
  title: "Arkstack",
  description: "Runtime-agnostic TypeScript backend framework for structured server applications",
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
    ['meta', { name: 'description', content: 'Runtime-agnostic TypeScript backend framework for structured server applications' }],
    ['meta', { name: 'keywords', content: 'API, Web, Node.js, TypeScript, Backend Framework, Runtime Agnostic' }],
    ['meta', { name: 'author', content: 'Toneflix' }],
    ['meta', { property: 'og:title', content: 'Arkstack' }],
    ['meta', { property: 'og:description', content: 'Runtime-agnostic TypeScript backend framework for structured server applications' }],
    ['meta', { property: 'og:image', content: '/banner.jpg' }],
    ['meta', { property: 'og:url', content: 'https://arkstack.toneflix.net' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Arkstack' }],
    ['meta', { name: 'twitter:description', content: 'Runtime-agnostic TypeScript backend framework for structured server applications' }],
    ['meta', { name: 'twitter:image', content: '/banner.jpg' }]
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
          {
            text: 'Utilities',
            collapsed: true,
            items: [
              { text: 'Helpers', link: '/guide/utilities/helpers' },
              { text: 'Hashing', link: '/guide/utilities/hashing' },
              { text: 'Encryption', link: '/guide/utilities/encryption' },
              { text: 'Trait System', link: '/guide/utilities/trait-system' },
            ]
          },
          {
            text: 'Responses & Resources',
            link: '/guide/responses',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/guide/responses' },
              { text: 'Resources', link: 'https://arkstack-hq.github.io/resora/guide/resources' },
              { text: 'Collections', link: 'https://arkstack-hq.github.io/resora/guide/collections' },
              { text: 'Generating Resources', link: 'https://arkstack-hq.github.io/resora/guide/generating-resources' },
              { text: 'Resora Reference', link: 'https://arkstack-hq.github.io/resora/guide/getting-started' },
            ],
          },
          {
            text: 'Database & Modeling',
            link: '/guide/database-modeling',
            collapsed: true,
            items: [
              { text: 'Introduction', link: '/guide/database-modeling' },
              { text: 'Models', link: 'https://arkormx.toneflix.net/guide/models' },
              { text: 'Mutators & Accessors', link: 'https://arkormx.toneflix.net/guide/mutators' },
              { text: 'Casting', link: 'https://arkormx.toneflix.net/guide/casting' },
              { text: 'Query Builder', link: 'https://arkormx.toneflix.net/guide/query-builder' },
              { text: 'Expressions & Aggregation', link: 'https://arkormx.toneflix.net/guide/expressions' },
              { text: 'Collections', link: 'https://arkormx.toneflix.net/guide/collections' },
              { text: 'Transactions', link: 'https://arkormx.toneflix.net/guide/transactions' },
              { text: 'Pagination', link: 'https://arkormx.toneflix.net/guide/pagination' },
              { text: 'Relationships', link: 'https://arkormx.toneflix.net/guide/relationships' },
              { text: 'Factories and Seeders', link: 'https://arkormx.toneflix.net/guide/factories-seeders' },
              { text: 'Arkormˣ Reference', link: 'https://arkormx.toneflix.net/guide/getting-started' },
            ],
          },
          {
            text: 'Application Essentials',
            collapsed: true,
            items: [
              {
                text: 'Validation',
                link: '/guide/validation',
                collapsed: true,
                items: [
                  { text: 'Introduction', link: '/guide/validation' },
                  { text: 'Kanun Reference', link: 'https://arkstack-hq.github.io/kanun/guide/getting-started' },
                ],
              },
              {
                text: 'HTTP Testing',
                link: '/guide/http-testing',
                collapsed: true,
                items: [
                  { text: 'Introduction', link: '/guide/http-testing' },
                  { text: 'Parasito Reference', link: 'https://github.com/arkstack-hq/parasito#readme' },
                ],
              },
            ],
          },
          { text: 'CLI', link: '/guide/cli' },
          { text: 'Middleware', link: '/guide/middleware' },
          { text: 'Authentication', link: '/guide/authentication' },
          { text: 'Notifications', link: '/guide/notifications' },
          { text: 'Cache', link: '/guide/cache' },
          { text: 'Queue', link: '/guide/queue' },
          { text: 'Jobs', link: '/guide/jobs' },
          { text: 'Task Scheduling', link: '/guide/scheduling' },
          { text: 'Views', link: '/guide/views' },
          { text: 'Inertia', link: '/guide/inertia' },
          { text: 'Hooks', link: '/guide/hooks' },
          { text: 'HTTP', link: '/guide/http' },
          { text: 'Deployment', link: '/guide/deployment' },
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
          { text: 'AI Agents', link: '/more/agents' },
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
    ],

    footer: {}
  }
})
