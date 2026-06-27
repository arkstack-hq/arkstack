import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3110'
const checks = []
const ok = (name, cond, detail = '') => {
    checks.push({ name, pass: Boolean(cond), detail })
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage()

// Capture the network exchange for the Inertia (XHR) navigation to /about.
let aboutRequestHeaders = null
let aboutResponseContentType = null
page.on('request', (req) => {
    if (req.url().endsWith('/about')) {
        aboutRequestHeaders = req.headers()
    }
})
page.on('response', async (res) => {
    if (res.url().endsWith('/about') && aboutResponseContentType === null) {
        aboutResponseContentType = res.headers()['content-type'] ?? ''
    }
})

try {
    // --- Initial full-page visit -------------------------------------------
    const initial = await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    const initialHtml = await initial.text()

    ok('initial response is HTML', (initial.headers()['content-type'] ?? '').includes('text/html'))
    ok('initial HTML embeds the data-page element', initialHtml.includes('data-page='))
    ok('initial HTML embeds the Home component', initialHtml.includes('&quot;component&quot;:&quot;Home&quot;'))

    await page.waitForSelector('#page')
    ok('client mounted the Home page', (await page.textContent('#page')) === 'Home')
    ok('Home received server props', (await page.textContent('#greeting')) === 'Hello from Arkstack')
    ok('Inertia client booted', (await page.evaluate(() => window.__INERTIA_MOUNTED__)) === true)

    const bootId = await page.evaluate(() => window.__APP_BOOT_ID__)

    // --- SPA navigation via an Inertia <Link> ------------------------------
    await page.click('#to-about')
    await page.waitForFunction(() => document.querySelector('#page')?.textContent === 'About')

    ok('navigated to About component', (await page.textContent('#page')) === 'About')
    ok('About received server props', (await page.textContent('#name')) === 'Arkstack Inertia Adapter')
    ok('URL updated to /about', new URL(page.url()).pathname === '/about')

    const bootIdAfter = await page.evaluate(() => window.__APP_BOOT_ID__)
    ok('navigation was a SPA visit (no full reload)', bootId === bootIdAfter, `${bootId} === ${bootIdAfter}`)

    ok('Inertia XHR carried X-Inertia header', aboutRequestHeaders?.['x-inertia'] === 'true')
    ok('Inertia XHR response was JSON', (aboutResponseContentType ?? '').includes('application/json'))

    // --- Navigate back -----------------------------------------------------
    await page.click('#to-home')
    await page.waitForFunction(() => document.querySelector('#page')?.textContent === 'Home')
    ok('navigated back to Home', (await page.textContent('#page')) === 'Home')
} finally {
    await browser.close()
}

const failed = checks.filter(c => !c.pass)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
