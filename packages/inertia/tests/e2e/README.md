# Inertia browser round-trip (manual E2E)

A throwaway harness that proves `@arkstack/inertia` works against a **real**
Inertia client (Vue 3 + Vite) in a **real** browser (Playwright/Chromium). It is
intentionally outside the package's automated (CI) test suite — it needs its own
`npm install`, a Chromium download, and a Vite build — and is not published.

The automated, CI-safe coverage lives in `../*.test.ts` (unit + real-HTTP Express
integration). This harness covers the one thing those cannot: that a real browser
performs an Inertia SPA visit (no full page reload) end to end.

## What it verifies

- Initial visit returns an HTML document embedding the `data-page` element.
- The Vue Inertia client mounts and receives the server props.
- Clicking an Inertia `<Link>` performs a **client-side** visit: the URL and
  component change, the page is **not** fully reloaded, the request carries
  `X-Inertia: true`, and the response is the JSON page object.

## Run it

```bash
cd packages/inertia/tests/e2e
npm install
npx playwright install chromium
npm run build              # build the Vue client with Vite

# build the workspace packages the server imports (from the repo root):
#   pnpm --filter @arkstack/inertia --filter @arkstack/driver-express \
#        --filter @arkstack/view --filter @arkstack/contract build

# --- client-rendered round-trip ---
node server.mjs &          # start the Express + @arkstack/inertia server
npm run verify             # drive the browser round-trip (exits non-zero on failure)
```

### SSR mode

Additionally verifies that the initial page is server-rendered and the client
hydrates it:

```bash
npm run build:ssr          # build the SSR bundle (dist-ssr/ssr.js)
node dist-ssr/ssr.js &     # start the Inertia SSR server on :13714
SSR=1 node server.mjs &    # start the app server with SSR enabled
SSR=1 npm run verify       # asserts server-rendered markup + hydration
```

## Layout

- `src/` — the Vue Inertia client (`main.js`, `Pages/Home.vue`, `Pages/About.vue`).
- `server.mjs` — an Express server using the built `@arkstack/inertia` adapter and
  the `inertia()` driver middleware, rendering the root document via `@arkstack/view`.
- `run.mjs` — the Playwright script asserting the browser round-trip.
