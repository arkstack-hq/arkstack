# Getting Started

Arkstack is a runtime-agnostic TypeScript backend framework for building structured, production-ready server applications.

It gives you a complete application layer with routing conventions, console commands, authentication, notifications, views, hooks, shared contracts, and runtime drivers for Express, H3, and future transports.

Arkstack is opinionated about application architecture while staying flexible about the HTTP runtime beneath it.

It prioritizes the Arkstack application model first, runtime adapters second.

## Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn

## Create a New App

::: code-group

```sh [npx]
$ npx create arkstack
```

```sh [npm]
$ npm init arkstack@latest
```

```sh [pnpm]
$ pnpm create arkstack@latest
```

```sh [yarn]
$ yarn create arkstack@latest
```

:::

You can also provide a target directory:

::: code-group

```sh [npx]
$ npx create arkstack my-app
```

```sh [npm]
$ npm init arkstack@latest my-app
```

```sh [pnpm]
$ pnpm create arkstack@latest my-app
```

```sh [yarn]
$ yarn create arkstack@latest my-app
```

:::

## Available Templates

- `express` - full Arkstack app on the Express driver with database features
- `express-lean` - lean Express-driver app stripped of database features and app scaffolding
- `h3` - full Arkstack app on the H3 driver with database features
- `h3-lean` - lean H3-driver app stripped of database features and app scaffolding

## Install and Run

::: code-group

```sh [npm]
cd my-app
$ npm install
$ npm run dev
```

```sh [pnpm]
cd my-app
$ pnpm install
$ pnpm dev
```

```sh [yarn]
cd my-app
$ yarn install
$ yarn dev
```

:::

## Useful Commands

- `npx ark dev` - run in development mode
- `npx ark build` - build for production
- `npx ark` - run Arkstack console commands
- `pnpm lint` - run lint checks

For full command usage and generation workflows, see [Arkstack CLI](/guide/cli).

## Full vs Lean

Use **full** templates when you want the complete Arkstack experience with Arkormˣ and database features included. Full kits come with:

- `src/app` with generated controllers, resources, and services
- `src/routes/api.ts` with scaffolded API routes
- Arkormˣ and related runtime files and dependencies

Use **lean** templates when you want a minimal HTTP starter without database dependencies. In lean kits, Arkstack removes:

- `src/app`
- `src/routes/api.ts`
- Arkormˣ/database runtime files and dependencies

## Monorepo Packages (Concept)

Arkstack kits build on shared packages:

- `@arkstack/contract`
- `@arkstack/common`
- `@arkstack/console`

For architecture details, see [Architecture Overview](/architecture/overview).

If you are using a full template with database features, continue with [Database & Modeling](/guide/database-modeling).
