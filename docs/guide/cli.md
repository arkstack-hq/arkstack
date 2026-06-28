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

### `key:generate`

Generate and set the application key (`APP_KEY`) in your `.env` file. `APP_KEY` is the unified secret used to sign JWTs and encrypt values, available as `config('app.key')`.

```sh
pnpm ark key:generate
```

| Option    | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `--show`  | Print a freshly generated key instead of writing to `.env`. |
| `--force` | Overwrite an existing `APP_KEY` without confirmation.       |

### `publish`

Publish artifacts that installed packages register migrations, stubs, assets into your application. For example, the `database` cache store and queue connection ship migrations, and `@arkstack/auth` ships the `UserTwoFactor` model and its migration this command copies them into `src/database/migrations` and `src/app/models`.

```sh
pnpm ark publish --list                       # show what can be published
pnpm ark publish --tag cache-migrations       # publish the cache table migration
pnpm ark publish --package @arkstack/queue    # publish everything @arkstack/queue offers
pnpm ark publish --tag two-factor             # publish the UserTwoFactor model + migration
pnpm ark publish --tag queue-migrations --force
```

| Option             | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `--package <name>` | Only publish artifacts registered by this package.       |
| `--tag <tag>`      | Only publish artifacts registered under this tag.        |
| `--force`          | Overwrite files that already exist at the destination.   |
| `--list`           | List the publishable artifacts without copying anything. |

Packages register what they publish by calling `Publisher.publishes()` from their `setup` module:

```ts
import { Publisher } from '@arkstack/common';

Publisher.publishes({
  package: '@arkstack/cache',
  tag: 'cache-migrations',
  entries: [
    {
      from: '/abs/path/in/package/stubs/create_cache_table.ts.stub',
      to: 'src/database/migrations/create_cache_table.ts',
    },
  ],
});
```

Source artifacts may be named with a trailing `.stub` extension (e.g. `Model.ts.stub`) so they are ignored by the package's own linting, type-checking and tests. The `.stub` suffix is stripped automatically when the file is published, restoring its real extension.

#### Interactive confirmations

A package can take more control over **what** and **how** it publishes by registering a confirmation with `Publisher.confirm()`. When you run `ark publish`, the user is prompted to choose an option; the chosen value selects which tagged group is published, and an optional `callback` post-processes each published stub.

```ts
import { Publisher } from '@arkstack/common';

// Register the framework-specific groups behind tags…
Publisher.publishes({ package: '@arkstack/inertia', tag: 'inertia-vue', entries: [/* … */] });
Publisher.publishes({ package: '@arkstack/inertia', tag: 'inertia-react', entries: [/* … */] });

// …then let the user pick one.
Publisher.confirm({
  package: '@arkstack/inertia',
  message: 'What front-end framework are you using with Inertia?',
  options: [
    { name: 'Vue', value: 'inertia-vue' },
    { name: 'React', value: 'inertia-react' },
  ],
  // Transform every stub this package publishes based on the choice.
  callback: (choice, stub) => stub.replaceAll('{{ext}}', choice === 'inertia-react' ? '.tsx' : '.ts'),
});
```

How it behaves:

- A tag listed in a confirmation's `options` is **gated** — it is published only when the user (or `--tag`) selects it. Groups not referenced by any confirmation publish unconditionally.
- The selected value is passed to `callback(choice, stub)` along with each stub's contents; whatever it returns is written out. Use it to fill placeholders, swap extensions, etc.
- `--tag <tag>` skips the prompt and publishes that tag directly (still applying the callback if the tag belongs to a confirmation).
- `--no-interaction` (`-n`) skips the prompt; gated tags are left unpublished, so pass `--tag` in non-interactive environments.

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
