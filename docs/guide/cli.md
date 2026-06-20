# Arkstack CLI

The Arkstack CLI is exposed through the `ark` command and powered by `@h3ravel/musket`.

Use it from your app root:

::: code-group

```sh [pnpm]
pnpm ark
```

```sh [npx]
npx ark
```

:::

## Common command patterns

- Show help: `pnpm ark --help`
- Show command help: `pnpm ark <command> --help`
- Force overwrite generated files: add `--force`

## Core Arkstack commands

### `route:list`

List registered routes.

```sh
pnpm ark route:list
```

Optional filters:

- `--p|path` filter by route path

### `make:controller`

Create a controller.

```sh
pnpm ark make:controller User
```

Useful options:

- `--api` generate API-style controller
- `--m|model <name>` attach and/or create model context
- `--f|factory` create linked factory (with model)
- `--s|seeder` create linked seeder (with model)
- `--x|migration` create linked migration (with model)
- `--force` overwrite existing file

### `make:resource`

Create resources (from `resora` resource generator).

```sh
pnpm ark make:resource resource User
pnpm ark make:resource collection UserCollection
pnpm ark make:resource all User
```

### `make:full-resource`

Create a full API set: resource, collection, and controller.

```sh
pnpm ark make:full-resource User --m User --force
```

## Arkormˣ-powered commands

Arkstack also exposes Arkormˣ database/modeling commands via the same CLI:

- `make:model`
- `make:migration`
- `make:factory`
- `make:seeder`
- `migrate`
- `models:sync`
- `seed`

Examples:

```sh
pnpm ark make:model User --all
pnpm ark make:migration add_status_to_users
pnpm ark migrate --name add_status_to_users
pnpm ark models:sync
pnpm ark seed
```

For advanced database workflows and options, see [Arkormˣ Documentation](https://arkorm.toneflix.net/).

## Custom app commands

You can add your own commands in:

- `src/app/console/commands`

Scaffold one with `pnpm ark make:command <Name>`, then run it straight away — the console kernel loads commands directly from the TypeScript source, so new commands and edits are picked up on the next CLI run without a build step. The built output (`dist`) is only used as a fallback when the source directory is not present, such as a production deploy.

By convention each file exports a class named after the file (e.g. `GreetCommand.ts` → `export class GreetCommand`); a `default` export is also supported.

For info on creating custom commands, see the [Official H3ravel Musket documentation](https://h3ravel.toneflix.net/musket/commands).
