# Database & Modeling

Arkstack uses **Arkormˣ** as its modeling layer, so you can work with models and query builders using its reliable schema/migration workflow.

This page covers the basics you need to start using Arkormˣ in an Arkstack app.

## Database Configuration

Set your database connection in `.env`:

```txt
DATABASE_URL="postgres://postgres:postgres@localhost:5432/arkstack_dev?schema=public"
```

Then run Arkormˣ migrations and generate the client:

```sh
pnpm ark migrate
```

## Create a model

Create an Arkormˣ model entry in `src/app/models` (example `User.ts`):

```ts
import { Model } from 'arkormx';

export class User extends Model {
  declare id: string;
  declare name: string;
  declare email: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}
```

Or use the Arkstack CLI to generate a model:

```sh
pnpm ark make:model User
```

If you need to make changes to the database schema, the Arkstack CLI can also generate migrations and sync model files:

```sh
npx ark make:migration add-users-table
npx ark migrate --name add-users-table ## Or use `pnpm ark migrate --all` for short
npx ark models:sync ## Sync model files with database schema (optional, for type safety)
```

For advanced Arkstack CLI model generation options, see [Arkstack CLI](/guide/cli#arkormx-powered-commands) or the [Arkormˣ documentation](https://arkorm.toneflix.net/guide/migrations-cli.html#generate-files).

## Query data with Arkormˣ

Use the model query API for common operations:

```ts
const user = await User.query().create({
  name: 'John Doe',
  email: 'john@example.com',
});

const found = await User.query().where({ email: 'john@example.com' }).first();

if (found) {
  found.name = 'Jane Doe';
  await found.save();
  await found.delete();
}
```

## Resolve models from shared code

Shared Arkstack packages use `getModel()` from `@arkstack/common` when they need an application model without importing from a fixed app path.

```ts
import { getModel } from '@arkstack/common';
import type User from '../app/models/User';

const UserModel = await getModel<typeof User>('User');
const user = await UserModel.query().where({ email }).first();
```

Apps can also augment the model registry to get typed model names without passing the constructor type each time:

```ts
import type User from './src/app/models/User';

declare module '@arkstack/common' {
  interface ModelRegistry {
    User: typeof User;
  }
}
```

`getModel('User')` then returns the registered `typeof User`.

## Advanced usage

For relationships, advanced query patterns, factories, seeders, and full Arkormˣ capabilities, see the official documentation:

- [Arkormˣ Documentation](https://arkorm.toneflix.net/)
