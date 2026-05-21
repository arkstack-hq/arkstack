# Trait System

Arkstack provides a composable mixin pattern for TypeScript classes that brings the expressiveness of trait-based design to JavaScript's prototype model.

The trait system is built around three primitives: `trait()` to define a behaviour unit, `use()` to compose traits onto a class, and `uses()` to verify trait membership at runtime.

## Defining Traits

A trait is created with the `trait()` factory. It receives a `Base` class and returns a new class extending it with the desired methods. This factory pattern is what makes traits stackable — each one builds on whatever base it receives, so they can be combined in any order without conflicts.

```ts
import { trait } from '@arkstack/common/utils/traits';

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

`use()` composes one or more traits into a base class that your class can extend. Traits are applied left to right, and if two traits define the same method, the rightmost one wins. Alongside traits, `use()` also accepts existing classes that already have traits applied, so you can extend a traitful class while adding new behaviour at the same time.

```ts
import { use } from '@arkstack/common/utils/traits';

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
```

## Verifying Trait Membership

`uses()` lets you check at runtime whether a given trait was applied anywhere in a class's composition chain. This is useful for conditional logic, guards, or introspection without relying on duck typing.

```ts
import { uses } from '@arkstack/common/utils/traits';

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
