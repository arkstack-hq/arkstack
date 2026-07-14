# Responses & Resources

Arkstack uses [Resora](https://arkstack-hq.github.io/resora/) as its structured API response layer. In API controllers, prefer returning a Resora `Resource` for one record and a `ResourceCollection` for lists or paginated results.

Resources keep transport details out of controllers and give every API a predictable place to transform models, hide internal fields, attach metadata, and shape pagination links. Arkstack's Express and H3 templates register the Resora middleware and Clear Router integration for you.

## Return One Resource

Return `Resource` directly when the default model or object shape is suitable:

```ts
import { Resource } from 'resora';

export default class UserController {
  async show() {
    const user = await User.query().findOrFail(this.params.id);

    return new Resource(user);
  }
}
```

For a stable public contract, create a dedicated resource class:

```ts
import { Resource } from 'resora';

export class UserResource extends Resource {
  data() {
    const user = this.toObject();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
```

The controller then returns the transformer rather than exposing the model directly:

```ts
return new UserResource(user);
```

Generate a resource with the Arkstack CLI:

```sh
pnpm ark make:resource User
```

## Return A Collection

Use `ResourceCollection` for arrays and Arkorm paginators:

```ts
import { ResourceCollection } from 'resora';

export default class UserController {
  async index() {
    const users = await User.query().paginate(20);

    return new ResourceCollection(users);
  }
}
```

A custom collection can declare the resource used to transform each item:

```ts
import { ResourceCollection } from 'resora';
import { UserResource } from './UserResource';

export class UserCollection extends ResourceCollection {
  collects = UserResource;

  data() {
    return this.toObject();
  }
}
```

Arkorm pagination metadata is carried into the response automatically:

```ts
return new UserCollection(await User.query().paginate(20));
```

## Status And Additional Data

Use `additional()` for top-level response information. Build a server response when the action needs a non-default status code:

```ts
return new UserResource(user)
  .additional({
    status: 'success',
    message: 'User created successfully',
  })
  .response()
  .setStatusCode(201);
```

## When To Return Something Else

Resora is the preferred boundary for JSON APIs. Direct values and Arkstack `Response` objects remain useful for HTML, redirects, files, streams, webhooks, health checks, and other responses that do not represent an API resource.

## Full Resora Reference

Continue with the Resora documentation for conditional attributes, nested resources, cursor pagination, configuration, custom response structures, and resource generation:

- [Resora Getting Started](https://arkstack-hq.github.io/resora/guide/getting-started)
- [Resources](https://arkstack-hq.github.io/resora/guide/resources)
- [Resource Collections](https://arkstack-hq.github.io/resora/guide/collections)
- [Writing Resources](https://arkstack-hq.github.io/resora/guide/writing-resources)

