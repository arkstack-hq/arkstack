# @arkstack/view

[![@arkstack/view](https://img.shields.io/npm/dt/@arkstack/view?style=flat-square&label=@arkstack/view&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/view)](https://www.npmjs.com/package/@arkstack/view)

View module for Arkstack, providing template rendering and view integration utilities.

```ts
import { View, view } from '@arkstack/view';

View.share({ appName: 'Arkstack' });
View.share('year', new Date().getFullYear());

View.composer('welcome', (view) => {
  view.with({ title: 'Welcome' });
});

class WelcomeComposer {
  compose(view) {
    view.with('message', 'Your app is ready.');
  }
}

View.composer('welcome', WelcomeComposer);

const html = await view('welcome').with('name', 'Ada');

const dashboard = await View.make('dashboard').with({ user }).render();

const email = await view('~org/package-name.mail', { user });
```

Views are resolved from `src/resources/views` by default. Use `View.mount()` to add or replace mounted view directories.
Package views resolve from `node_modules/<package>/resources/views`.
