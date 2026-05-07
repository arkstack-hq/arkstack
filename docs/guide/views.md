# Views

Arkstack views are powered by Edge.js and use a Laravel-style factory API.

## Install

Full templates include `@arkstack/view`. If you are adding views manually, install:

::: code-group

```sh [npm]
npm i @arkstack/view
```

```sh [pnpm]
pnpm add @arkstack/view
```

```sh [yarn]
yarn add @arkstack/view
```

:::

Views are loaded from `resources/views` by default and use the `.edge` extension.

## Render Views

Use the global `view()` helper or import it from `@arkstack/view`.

```ts
import { view } from '@arkstack/view';

const html = await view('welcome', {
  name: 'Ada',
});
```

Calling `view()` without a name returns the shared factory:

```ts
view().share({
  appName: 'Arkstack',
});

view().share('year', new Date().getFullYear());

const html = await view('welcome');
```

Use `with()` on a view instance when you want to skip the `data` argument in `view(name, data)`:

```ts
const html = await view('welcome')
  .with('name', 'Ada')
  .with({ title: 'Welcome' });
```

## View Class

Use `View` when you prefer the static API.

```ts
import { View } from '@arkstack/view';

View.share({ appName: 'Arkstack' });
View.share('year', new Date().getFullYear());

const html = await View.make('dashboard', {
  user,
});
```

`View.first()` renders the first existing view from a list:

```ts
const html = await View.first([
  'themes.custom.dashboard',
  'dashboard',
], { user });
```

Check for a view before rendering:

```ts
if (View.exists('emails.welcome')) {
  await View.make('emails.welcome', { user }).render();
}
```

## View Data

Renderable view instances support `with()`:

```ts
const html = await View.make('profile')
  .with({ title: 'Profile' })
  .with('user', user)
  .render();
```

Shared data is available to every view rendered by the factory:

```ts
View.share('appName', 'Arkstack');
View.share({ year: new Date().getFullYear() });
```

## View Composers

View composers run before a view renders. Use them to attach common data to one view, many views, or every view.

```ts
View.composer('dashboard', (view) => {
  view.with({ title: 'Dashboard' });
});

View.composer(['profile', 'settings'], (view) => {
  view.with({ section: 'Account' });
});

View.composer('*', (view) => {
  view.with({ appName: 'Arkstack' });
});
```

Composers may also be classes or class instances with a `compose()` method:

```ts
class DashboardComposer {
  compose(view) {
    view.with('title', 'Dashboard');
  }
}

View.composer('dashboard', DashboardComposer);

View.composer('profile', {
  compose(view) {
    view.with('title', 'Profile');
  },
});
```

Async composers are supported when rendering asynchronously. Use synchronous composers with `renderSync()`.

## Mounted View Paths

Mount another view directory when you need a custom root or named disk:

```ts
View.mount('/absolute/path/to/resources/views');
View.mount('admin', '/absolute/path/to/admin/views');

await View.make('admin::dashboard').render();
```

## Make Views

The view package exposes a `make:view` command that is auto-discovered by the Arkstack console after the package is installed and built.

```sh
pnpm cmd make:view welcome
pnpm cmd make:view emails.welcome
```

Dot notation maps to nested files under `resources/views`:

```txt
emails.welcome -> resources/views/emails/welcome.edge
```
