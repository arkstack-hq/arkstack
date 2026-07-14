# HTTP Testing

Arkstack uses [Parasito](https://github.com/arkstack-hq/parasito#readme) for HTTP integration tests. Parasito provides one TypeScript-first request API for Arkstack applications and their underlying Express or H3 runtimes.

Generated applications include Parasito as a development dependency and use it with Vitest.

## Test An Arkstack Application

Pass the Arkstack application exported by your bootstrap directly to `request()`. You do not need to start a listening server:

```ts
import { describe, it } from 'vitest';
import request from 'parasito';
import { app } from '../src/core/bootstrap';

describe('users API', () => {
  it('returns users', async () => {
    await request(app)
      .get('/api/users')
      .expect(200)
      .expect('content-type', /json/);
  });
});
```

The same test shape works with both Arkstack drivers.

## Send Request Data

Use the fluent request builder for headers, bearer authentication, query parameters, and bodies:

```ts
await request(app)
  .post('/api/users')
  .auth('test-token')
  .query({ notify: true })
  .send({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  })
  .expect(201)
  .expect({
    data: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
  });
```

`send()` selects JSON, form, multipart, or text content types from the supplied body. Set `content-type` explicitly when a test needs to override that behavior.

## Inspect The Response

Await a request to inspect the normalized response with your test runner's assertions:

```ts
import { expect } from 'vitest';

const response = await request(app).get('/api/users/1');

expect(response.status).toBe(200);
expect(response.body.data.id).toBe(1);
expect(response.headers.get('content-type')).toMatch(/json/);
```

Responses expose `status`, `statusCode`, `ok`, `headers`, `header`, `text`, `body`, and the underlying `raw` response.

## Other Targets

Parasito can also test Express, H3, Fastify, Hono, Koa, Node handlers, fetch-style applications, listening servers, and remote URLs. This is useful when an Arkstack package or runtime adapter needs to be tested outside a complete application.

See the [Parasito reference and examples](https://github.com/arkstack-hq/parasito#readme) for request bodies, target adapters, remote URLs, and the full assertion API.

