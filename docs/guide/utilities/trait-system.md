# Trait System

Arkstack provides a composable mixin pattern for TypeScript classes that brings the expressiveness of trait-based design to JavaScript's prototype model.

The trait system is built around `trait()` to define a behaviour unit, `use()` to compose traits onto a class, and `uses()` to verify trait membership at runtime. When traits define the same method, `getTraitMethods()` and `callTraitMethods()` provide access to every conflicting implementation.

## Defining Traits

A trait is created with the `trait()` factory. It receives a `Base` class and returns a new class extending it with the desired methods. This factory pattern is what makes traits stackable — each one builds on whatever base it receives, so they can be combined in any order without conflicts.

```ts
import { trait } from '@arkstack/common/utils';

const Addable = trait(
  (Base) =>
    class Addable extends Base {
      add() {
        this.value = this.value + 1;
        return this.value;
      }
    },
);

const Subtractable = trait(
  (Base) =>
    class Subtractable extends Base {
      subtract() {
        this.value = this.value - 1;
        return this.value;
      }
    },
);
```

## Applying Traits

`use()` composes one or more traits into a base class that your class can extend. Traits are applied left to right, and if two traits define the same method, the leftmost one is the active implementation. Alongside traits, `use()` also accepts existing classes that already have traits applied, so you can extend a traitful class while adding new behaviour at the same time.

`use()` also accepts a regular class as its **last argument**. When provided, it becomes the root of the composition chain — all traits are applied on top of it, and `instanceof` checks against the base class work as expected. Only one regular class is permitted, and it must always come after all traits.

```ts
import { use } from '@arkstack/common/utils';

// Single trait
class MyClass extends use(Subtractable) {
  value = 1;
}
new MyClass().subtract(); // 0

// Multiple traits
class MyClass extends use(Subtractable, Addable) {
  value = 0;
}
const instance = new MyClass();
instance.add(); // 1
instance.subtract(); // 0

// Extend a class that already has traits
class MySubClass extends use(Addable, MyClass) {}
new MySubClass().subtract(); // 0 — inherited from MyClass

// Regular class as the base — must be last
class BaseClass {
  static label = 'base';
  value = 1;

  increment() {
    return this.value + 1;
  }
}

class MyClass extends use(BaseClass) {}
new MyClass().increment(); // 2
new MyClass() instanceof BaseClass; // true
MyClass.label; // "base"

// Traits and a regular base class combined
class MyClass extends use(Addable, Subtractable, BaseClass) {}
const instance = new MyClass();
instance.add(); // 2
instance.subtract(); // 1
instance.increment(); // 2
instance instanceof BaseClass; // true
MyClass.label; // "base"
```

> **Note:** The regular base class must always be the last argument to `use()`. Placing it before any trait will result in unexpected behaviour.

## Calling Conflicting Trait Methods

When multiple traits or the base class define the same method, Arkstack keeps the conflicting implementations instead of discarding the methods that were overridden. `callTraitMethods()` invokes the complete chain in base-to-active order and returns an array containing each result.

This can be called from inside the consuming class by passing `this`:

```ts
import { callTraitMethods, trait, use } from '@arkstack/common/utils';

class BaseService {
  boot() {
    return 'base';
  }
}

const LogsBoot = trait(
  (Base) =>
    class LogsBoot extends Base {
      boot() {
        return 'logger';
      }
    },
);

const TracksBoot = trait(
  (Base) =>
    class TracksBoot extends Base {
      boot() {
        return 'tracker';
      }
    },
);

class Service extends use(LogsBoot, TracksBoot, BaseService) {
  bootAll() {
    return callTraitMethods(this, 'boot');
  }
}

const service = new Service();

service.boot(); // "logger" — the leftmost trait is active
service.bootAll(); // ["base", "tracker", "logger"]
```

Use `getTraitMethods()` when you need to inspect, filter, or invoke the bound methods yourself:

```ts
import { getTraitMethods } from '@arkstack/common/utils';

class Service extends use(LogsBoot, TracksBoot, BaseService) {
  bootUntilReady() {
    for (const boot of getTraitMethods(this, 'boot')) {
      const result = boot();
      if (result === 'logger') return result;
    }
  }
}
```

Conflicting static methods work the same way. Pass the consuming class directly:

```ts
const LogsStaticBoot = trait(
  (Base) =>
    class LogsStaticBoot extends Base {
      static boot() {
        return 'logger';
      }
    },
);

const TracksStaticBoot = trait(
  (Base) =>
    class TracksStaticBoot extends Base {
      static boot() {
        return 'tracker';
      }
    },
);

class Service extends use(LogsStaticBoot, TracksStaticBoot) {
  static bootAll() {
    return callTraitMethods(Service, 'boot');
  }
}

Service.boot(); // "logger"
Service.bootAll(); // ["tracker", "logger"]
```

Only method conflicts are registered. Calling `callTraitMethods()` for a method without conflicting implementations logs a warning and returns an empty array; `getTraitMethods()` returns an empty array without logging.

### Opt-in Method Helpers

Pass `true` as the first argument to `use()` to attach `getTraitMethods()` and `callTraitMethods()` to both the consuming instance and class. This is useful when the consuming class overrides a conflicting method and needs to invoke the preserved trait implementations:

```ts
class Service extends use(true, LogsBoot, TracksBoot, BaseService) {
  boot() {
    return this.callTraitMethods<string>('boot').at(-1);
  }
}

const service = new Service();

service.boot(); // "logger"
service.getTraitMethods('boot'); // Bound conflicting methods
```

The helpers are also available statically when enabled:

```ts
class Service extends use(true, LogsStaticBoot, TracksStaticBoot) {
  static boot() {
    return Service.callTraitMethods<string>('boot').at(-1);
  }
}

Service.boot(); // "logger"
Service.getTraitMethods('boot'); // Bound conflicting static methods
```

The consuming overrides are not added to the conflict registry, so these calls do not recurse back into `Service.boot()`. Classes composed with the regular `use(...)` signature do not receive the helper methods.

## Verifying Trait Membership

`uses()` lets you check at runtime whether a given trait was applied anywhere in a class's composition chain. This is useful for conditional logic, guards, or introspection without relying on duck typing.

```ts
import { uses } from '@arkstack/common/utils';

class MyClass extends use(Addable) {
  value = 0;
}

const instance = new MyClass();
uses(instance, Addable); // true
uses(instance, Subtractable); // false
instance.subtract; // undefined — never applied
```

`instanceof` also works correctly across the full hierarchy, including parent classes that had traits applied:

```ts
class MyClass extends use(Addable) {
  value = 0;
}
class MySubClass extends use(Subtractable, MyClass) {}

const instance = new MySubClass();
instance instanceof MySubClass; // true
instance instanceof MyClass; // true
```

## Static Method Support

Traits can define static methods. These are promoted to the host class during composition and callable directly on it, just like any regular static.

```ts
const IRouter = trait(
  (Base) =>
    class IRouter extends Base {
      static call() {
        return 'Called';
      }
    },
);

const Magical = trait(
  (Base) =>
    class Magical extends Base {
      static pause() {
        return 'Paused';
      }
    },
);

class Router extends use(IRouter, Magical) {}

Router.call(); // "Called"
Router.pause(); // "Paused"
```

## Constructor Access

All trait methods — both instance and static — are fully resolved by the time the host class constructor runs. You can call any trait method on `this` immediately after `super()` without any additional setup.

```ts
const Magic = trait(
  (Base) =>
    class Magic extends Base {
      makeMagic() {
        return 'makeMagic';
      }
    },
);

const Magical = trait(
  (Base) =>
    class Magical extends Base {
      play() {
        return 'Playing';
      }
    },
);

class Router extends use(Magic, Magical) {
  constructor() {
    super();
    console.log(this.makeMagic()); // "makeMagic"
    console.log(this.play()); // "Playing"
  }
}
```

## Proxy Support

A trait can return a `Proxy` from its constructor to intercept property access on the entire instance. This makes it possible to implement transparent decoration, method wrapping, or access control as a self-contained trait.

```ts
const Proxiable = trait(
  (Base) =>
    class Proxiable extends Base {
      constructor() {
        super();
        return new Proxy(this, {
          get(target, prop, receiver) {
            const val = Reflect.get(target, prop, receiver);
            if (typeof val === 'function' && val.name === 'proxied') {
              return () => val().toUpperCase();
            }
            return val;
          },
        });
      }

      proxied() {
        return 'it worked';
      }
    },
);

class MyClass extends use(Proxiable) {}
new MyClass().proxied(); // "IT WORKED"
```
