# @arkstack/view

Views for Arkstack applications.

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
```

Views are resolved from `resources/views` by default. Use `View.mount()` to add or replace mounted view directories.
