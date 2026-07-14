# Architecture Overview

Arkstack is organized around one idea: application structure should stay stable even when the HTTP runtime changes.

Runtime-specific pieces live in driver packages. Shared behavior lives in focused packages. App code sits above both and uses the same conventions whether the application runs on Express, H3, or a future runtime.

## Architecture Layers

```txt
Application code
routes, controllers, models, views, config, commands

Shared packages
Resora, Arkormˣ, Kanun, auth, notifications, view, http, common

Development tools
Parasito, console, generators

Runtime drivers
@arkstack/driver-express, @arkstack/driver-h3

Underlying runtime
Express, H3
```

This split lets Arkstack keep project ergonomics without binding business logic to one runtime's request, response, middleware, or route implementation.

## Core Principles

- **Runtime details stay in drivers.** Express and H3 integrations are implemented by their driver packages.
- **Shared packages avoid runtime imports.** Packages like auth, notifications, views, and common utilities are designed to work without importing Express or H3 directly.
- **Runtime templates keep the same app shape.** Routes, models, resources, config files, and commands live in predictable places across generated applications.
- **Extension points are explicit.** Commands, hooks, view composers, package views, and driver middleware expose the places where packages and apps can plug in.

## Package Map

### Application Essentials

Arkstack presents several framework-agnostic packages as one application workflow:

- **Resora** is the preferred JSON response boundary for controller resources and collections.
- **Arkormˣ** is the database, model, query, migration, factory, and seeder layer.
- **Kanun** validates request and domain data and integrates validation failures with Arkstack HTTP sessions.
- **Parasito** drives HTTP integration tests against an Arkstack app without coupling tests to Express or H3.

Each package remains independently useful, but Arkstack templates configure their integration and expose a consistent project structure around them. Start with [Responses & Resources](/guide/responses), [Database & Modeling](/guide/database-modeling), [Validation](/guide/validation), and [HTTP Testing](/guide/http-testing) before moving into their package-level references.

### Contracts

`@arkstack/contract` defines the runtime-agnostic contracts used by Arkstack apps and drivers. It describes the integration boundary between the Arkstack app shell and each runtime driver.

Use it when building or reviewing driver-level behavior.

### Common

`@arkstack/common` provides shared runtime utilities:

- lifecycle and network helpers
- typed model resolution through `getModel()`
- hashing and encryption helpers
- shared exception and error handling primitives
- process-local hooks through `Hook`

Shared packages use `common` when they need app services without importing app files directly.

### HTTP

`@arkstack/http` provides small request and response wrappers for framework-neutral code.

Runtime middleware can still use native Express or H3 objects. The HTTP package exists for reusable services and tests that need normalized request data.

### Auth

`@arkstack/auth` owns framework-neutral authentication:

- credential verification
- JWT-backed personal access tokens
- temporary tokens
- current-session helpers
- two-factor authentication
- user/session contracts

Runtime-specific auth middleware lives in driver packages so each runtime can attach authenticated state naturally.

### Notifications

`@arkstack/notifications` provides framework-neutral delivery channels:

- mail through configured transports
- SMS through Twilio or AfricasTalking transports
- database-backed in-app notifications

Notifications use app models through `getModel()` when persistence is needed, and use `src/config/notifications.ts` for driver and transport configuration.

### Views

`@arkstack/view` wraps Edge.js with an Arkstack view factory:

- `view(name, data)` and `View.make(name, data)`
- local view data through `with()`
- global shared view data through `share()`
- view composers
- package-scoped views like `~package-name.mail` and `~org/package-name.mail`
- the auto-discovered `make:view` command

Templates render `src/resources/views/welcome.edge` from the `/` web route.

### Console

`@arkstack/console` provides the shared console runtime and base commands for full templates.

`@arkstack/console-slim` provides the slim command surface used by leaner templates.

Package commands can be auto-discovered from `node_modules/@arkstack/*/dist/commands/*.js`, which lets packages such as filesystem and view add commands without editing the app console kernel.

## Runtime Drivers

Each runtime implements the app contract through a driver package:

- `@arkstack/driver-express`
- `@arkstack/driver-h3`

Driver packages own runtime-specific concerns:

- route binding
- middleware integration
- static asset handling
- error handling adapters
- auth middleware state attachment
- runtime-specific stubs

This keeps application files consistent while letting each runtime use its native mechanics.

## Request Flow

A typical HTTP request moves through these layers:

```txt
Runtime request
  -> driver middleware
  -> Clear Router route binding
  -> route/controller
  -> shared services
  -> runtime response
```

For example, an authenticated route uses driver middleware to validate the bearer token through `@arkstack/auth`. After validation, the driver attaches authenticated state to the request context. The route can then call shared packages such as notifications or views without caring which runtime handled the request.

## Extension Points

### Hooks

`Hook` from `@arkstack/foundry` provides named callback positions.

The auth middleware exposes `middleware:auth`, with a runtime-agnostic context shape:

```ts
Hook.set('middleware:auth', {
  before: ({ req, res }) => {},
  after: ({ req, res }) => {},
  error: (error, { req, res }) => {},
});
```

### View Composers

View composers attach data before rendering:

```ts
View.composer('dashboard', (view) => {
  view.with('title', 'Dashboard');
});
```

Composers can be functions, classes, or instances with a `compose()` method.

### Package Views

Packages can ship their own `resources/views` directory and expose templates through tilde names:

```ts
await view('~package-name.mail');
await view('~org/package-name.mail');
```

### Console Commands

Packages can expose commands from their built `dist/commands` directory. The console discovers them through the shared command glob.

## Template Profiles

### Full

Full templates include the batteries-included app structure:

- Arkormˣ/database setup
- app models
- migrations
- controllers and resources
- auth-ready user/session models
- notification models
- view package and `welcome.edge`
- API and web route scaffolding

### Lean

Lean templates remove database-heavy pieces for a smaller baseline:

- no Arkormˣ runtime setup
- no app model layer
- no database migrations
- no default API resource scaffolding

They keep the same runtime and console architecture where it still applies.

## Why This Matters

Arkstack's architecture gives you:

- a stable project shape across runtimes
- less duplicated runtime glue
- shared auth, notifications, views, hooks, and console commands
- room for future runtime drivers without rewriting app code
- package-level extension points that can grow without centralizing everything in one package

The result is a backend stack that feels structured and familiar while still letting the runtime remain replaceable.
