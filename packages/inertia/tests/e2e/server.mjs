import { Router as ClearRouter } from 'clear-router/express'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Import the built workspace packages by relative dist path: the fixture's
// isolated node_modules doesn't expose the @arkstack/* names, but each package's
// own node_modules still resolves its internal bare imports.
import { Arkstack } from '../../../contract/dist/index.js'
import { Inertia } from '../../../inertia/dist/index.js'
import { inertia } from '../../../driver-express/dist/middlewares/index.js'
import { view } from '../../../view/dist/index.js'
import express from 'express'

const dir = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT ?? 3110)

Arkstack.setRootDir(dir)

// Build the root document from the Vite build output: pull its <script>/<link>
// asset tags into the Inertia root template so the real client bundle loads.
const builtHtml = await readFile(path.join(dir, 'dist/index.html'), 'utf8')
const assetTags = (builtHtml.match(/<script\b[^>]*><\/script>|<link\b[^>]*\/?>/g) ?? []).join('\n    ')

view().raw('app', [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '    <meta charset="utf-8">',
    '    ' + assetTags,
    '</head>',
    '<body>',
    '    {{{ inertia }}}',
    '</body>',
    '</html>',
].join('\n'))

ClearRouter.get('/', () => Inertia.render('Home', {
    greeting: 'Hello from Arkstack',
    count: 42,
}))

ClearRouter.get('/about', () => Inertia.render('About', {
    name: 'Arkstack Inertia Adapter',
}))

const router = express.Router()
ClearRouter.apply(router)

const app = express()
app.use('/assets', express.static(path.join(dir, 'dist/assets')))
app.use(inertia())
app.use(router)

app.listen(port, () => {
    console.log(`inertia-e2e server listening on http://127.0.0.1:${port}`)
})
