# Arkstack

[![Create Arkstack][i1]][l1]
[![Downloads][d1]][l1]
[![Arkormˣ Downloads](https://img.shields.io/npm/dt/arkormx?style=flat-square&label=Arkormˣ&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Farkormx)](https://www.npmjs.com/package/arkormx)
[![Contract Downloads](https://img.shields.io/npm/dt/@arkstack/contract?style=flat-square&label=@arkstack/contract&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/contract)](https://www.npmjs.com/package/@arkstack/contract)
[![Common Downloads](https://img.shields.io/npm/dt/@arkstack/common?style=flat-square&label=@arkstack/common&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/common)](https://www.npmjs.com/package/@arkstack/common)
[![Console Downloads](https://img.shields.io/npm/dt/@arkstack/console?style=flat-square&label=@arkstack/console&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/console)](https://www.npmjs.com/package/@arkstack/console)
[![Console Slim Downloads](https://img.shields.io/npm/dt/@arkstack/console-slim?style=flat-square&label=@arkstack/console-slim&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/console-slim)](https://www.npmjs.com/package/@arkstack/console-slim)
[![Console Slim Downloads](https://img.shields.io/npm/dt/@arkstack/filesystem?style=flat-square&label=@arkstack/filesystem&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/filesystem)](https://www.npmjs.com/package/@arkstack/filesystem)
[![Driver Express Downloads](https://img.shields.io/npm/dt/@arkstack/driver-express?style=flat-square&label=@arkstack/driver-express&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/driver-express)](https://www.npmjs.com/package/@arkstack/driver-express)
[![Driver H3 Downloads](https://img.shields.io/npm/dt/@arkstack/driver-h3?style=flat-square&label=@arkstack/driver-h3&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/driver-h3)](https://www.npmjs.com/package/@arkstack/driver-h3)
[![Deploy Documentation](https://github.com/arkstack-hq/arkstack/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/arkstack-hq/arkstack/actions/workflows/deploy-docs.yml)
[![CI](https://github.com/arkstack-hq/arkstack/actions/workflows/ci.yml/badge.svg)](https://github.com/arkstack-hq/arkstack/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/arkstack-hq/arkstack/graph/badge.svg?token=vaccg5iudz)](https://codecov.io/gh/arkstack-hq/arkstack)

Arkstack is a runtime-agnostic TypeScript backend framework for building structured, production-ready server applications.

It gives you a complete application layer with routing conventions, console commands, authentication, notifications, views, hooks, shared contracts, and runtime drivers for Express, H3, and future transports.

Arkstack is opinionated about application architecture while staying flexible about the HTTP runtime beneath it.

It prioritizes the Arkstack application model first, runtime adapters second.

---

## Why Arkstack?

Most backend frameworks are tightly coupled to one HTTP runtime. Arkstack is designed around a stable application model, clean architecture, and transport-layer abstraction.

- Runtime driver support (Express, H3 — more coming)
- Opinionated framework conventions without runtime lock-in
- Clean and scalable application structure
- TypeScript native
- Structured error handling
- Standardized API responses
- First-party auth, notifications, views, hooks, and console packages
- Easy to extend

Your business logic remains independent of the HTTP runtime.

---

## Quick Start

```bash
npm init arkstack my-project
cd my-project
npm install
npm run dev
```

## Documentation

To learn how to use Arkstack, see the [Guide](https://arkstack.toneflix.net/guide/getting-started).

---

## Application Structure

```txt
src/
 ├── app/
 │   ├── console/
 │   │   └── commands/
 │   │
 │   ├── http/
 │   │   ├── middlewares/
 │   │   ├── controllers/
 │   │   └── resources/
 │   │
 │   ├── models/
 │   │
 │   └── services/
 │
 ├── config/
 │
 ├── core/
 │   ├── utils/
 │   │   ├── helpers.ts
 │   │   └── drivers/
 │   ├── app.ts
 │   └── bootstrap.ts
 │
 ├── database/
 │   ├── factories/
 │   ├── migrations/
 │   └── seeders/
 │
 ├── resources/
 │   └── views/
 │
 ├── routes/
 │   ├── api/
 │   └── web/
 │
 ├── types/
 │
 └── server.ts
```

### Structure Philosophy

- Controllers: HTTP layer
- Services: Business logic
- Resources: Response shaping
- Core: Framework-agnostic utilities

Switching frameworks should not require rewriting business logic.

---

## Supported Runtimes

| Framework | Status  |
| --------- | ------- |
| Express   | Stable  |
| H3        | Stable  |
| Fastify   | Planned |
| Bun       | Planned |

New adapters can be added without affecting the application layer.

---

## Monorepo Core Packages

- `@arkstack/contract`: framework-agnostic driver contracts used by all kits.
- `@arkstack/common`: shared lifecycle/network helpers reused by all kits.
- `@arkstack/console`: shared console runtime used by kits.

Each runtime kit (Express, H3, future Fastify/Bun) implements a framework-specific driver that conforms to the same contract.

---

Arkstack uses structured error classes and centralized error middleware.

Example:

```ts
throw new RequestError('Profile not found', 404);
```

All errors return consistent JSON:

```json
{
  "status": "error",
  "message": "Profile not found",
  "code": 404
}
```

---

## Resource Responses

Standardized API responses:

```ts
return new UserResource(req, res, user).json().status(200).additional({
  status: 'success',
  message: 'User retrieved',
});
```

Response format:

```json
{
  "data": {},
  "status": "success",
  "message": "User retrieved",
  "code": 200
}
```

---

## Development

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

---

## Design Goals

- Minimal magic
- Strong typing
- Clear separation of concerns
- Predictable structure
- Future-proof architecture

---

## Roadmap

- Fastify adapter
- Bun adapter
- CLI scaffolding generators
- Plugin system
- Authentication presets
- Validation layer abstraction
- Framework Switching

---

## Contributing

Contributions are welcome.

When adding framework adapters:

- Keep core framework-agnostic
- Avoid leaking framework types into business logic
- Follow established adapter patterns

---

## License

MIT

[i1]: https://img.shields.io/npm/v/create-arkstack?style=flat-square&label=create-arkstack&color=%230970ce
[l1]: https://www.npmjs.com/package/create-arkstack
[d1]: https://img.shields.io/npm/dt/create-arkstack?style=flat-square&label=Downloads&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fcreate-arkstack
