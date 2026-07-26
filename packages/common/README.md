# `@arkstack/common`

[![@arkstack/common](https://img.shields.io/npm/dt/@arkstack/common?style=flat-square&label=@arkstack/common&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/common)](https://www.npmjs.com/package/@arkstack/common)

Core utilities, primitives, and shared infrastructure for the Arkstack framework ecosystem. This package provides the building blocks used across all Arkstack packages — error handling, logging, hashing, encryption, lifecycle management, hooks, and more.

---

## Table of Contents

- [Installation](#installation)
- [Modules](#modules)
  - [System](#system)
  - [Logger](#logger)
  - [ErrorHandler](#errorhandler)
  - [Exceptions](#exceptions)
  - [Hook](#hook)
  - [Encryption](#encryption)
  - [Hash](#hash)
  - [Network](#network)
  - [Lifecycle](#lifecycle)
  - [Prototypes](#prototypes)
- [Global Augmentations](#global-augmentations)
- [Types](#types)

---

## Installation

```bash
pnpm add @arkstack/common
```

---

## Modules

### System

**`src/system.ts`**

Provides core application-level utilities for environment variable access, configuration loading, path resolution, and dynamic file importing.

#### `env(key, defaultValue?)`

Reads a value from `process.env` with automatic type coercion. Booleans (`true`, `false`, `on`, `off`), numbers, `null`, and empty strings are all handled gracefully.

```ts
import { env } from '@arkstack/common';

const port = env('PORT', 3000); // number
const debug = env('DEBUG', false); // boolean
const name = env('APP_NAME', 'App'); // string
```

**Type coercion rules:**

| Raw value           | Resolved type                              |
| ------------------- | ------------------------------------------ |
| `"true"` / `"on"`   | `true`                                     |
| `"false"` / `"off"` | `false`                                    |
| Numeric string      | `number`                                   |
| `"null"`            | `null`                                     |
| `""`                | `undefined` (falls back to `defaultValue`) |

---

#### `config(key?, defaultValue?)`

Loads and merges all configuration files from the build output's `config/` directory. Supports dot-path key access with full TypeScript inference.

```ts
import { config } from '@arkstack/common';

// Get the full config object
const allConfig = config();

// Access a nested key
const dbHost = config('database.host', 'localhost');
```

Config files are loaded from the resolved `outputDir()` using `createRequire`. Middleware config files are skipped when running in CLI context.

---

#### `appUrl(link?)`

Builds a fully-qualified application URL from `APP_URL` and `PORT` environment variables.

```ts
import { appUrl } from '@arkstack/common';

appUrl(); // "http://localhost:3000"
appUrl('/api/health'); // "http://localhost:3000/api/health"
```

---

#### `nodeEnv()`

Returns `'dev'` or `'prod'` based on the `NODE_ENV` environment variable. Defaults to `'dev'` for any unrecognised value.

```ts
import { nodeEnv } from '@arkstack/common';

nodeEnv(); // "dev" | "prod"
```

---

#### `outputDir(cwd?)`

Resolves the build output directory. In development, defaults to `.arkstack/build`; in production, to `dist`. Both can be overridden via environment variables:

| Variable         | Context     | Default           |
| ---------------- | ----------- | ----------------- |
| `OUTPUT_DIR_DEV` | Development | `.arkstack/build` |
| `OUTPUT_DIR`     | Production  | `dist`            |

---

#### `importFile<T>(filePath)`

Dynamically imports a file using [Jiti](https://github.com/unjs/jiti), with TypeScript and `tsconfig` path support. Useful for loading user-defined config or plugin files at runtime.

```ts
import { importFile } from '@arkstack/common';

const module = await importFile<{ default: MyConfig }>('./config/app.ts');
```

---

### Logger

**`src/Logger.ts`**

A structured, chalk-powered console logger with verbosity control, two-column formatting, and a composable parsing API.

#### Basic log levels

```ts
import { Logger } from '@arkstack/common';

Logger.success('Server started');
Logger.info('Listening on port 3000');
Logger.warn('Deprecated option used');
Logger.error('Something went wrong', false); // false = don't exit
Logger.debug('Internal state dump'); // only shown at verbosity >= 3
```

Each level uses a distinct icon and colour:

| Method    | Icon | Colour |
| --------- | ---- | ------ |
| `success` | `✓`  | Green  |
| `info`    | `ℹ`  | Blue   |
| `warn`    | `⚠`  | Yellow |
| `error`   | `✖`  | Red    |
| `debug`   | `🐛` | Gray   |

The second argument for all level methods is `exit` (boolean). When `true`, the process exits after logging. `error` exits by default (`exit = true`); all others default to `false`.

---

#### `Logger.configure(options)`

Sets global verbosity and suppression behaviour.

```ts
Logger.configure({
  verbosity: 3, // enables debug output
  quiet: true, // suppresses info and success
  silent: true, // suppresses all output
});
```

---

#### `Logger.twoColumnDetail(name, value, log?, spacer?)`

Renders a right-aligned two-column layout padded to the terminal width.

```ts
Logger.twoColumnDetail('Route', 'GET /api/users');
// "Route ......................................... GET /api/users"

const row = Logger.twoColumnDetail('Route', 'GET /api/users', false);
// returns [name, dots, value] without printing
```

---

#### `Logger.describe(name, desc, width?, log?)`

Similar to `twoColumnDetail`, but uses a fixed width with space padding rather than dots. Useful for command help listings.

```ts
Logger.describe('--port', 'Port to listen on', 40);
// "--port                    Port to listen on"
```

---

#### `Logger.split(name, value, status?, exit?, preserveCol?, spacer?)`

Like `twoColumnDetail`, but wraps the left column with a coloured background badge based on `status`.

```ts
Logger.split('Database', 'Connected', 'success');
Logger.split('Migration', 'Failed', 'error', true); // exits after logging
```

---

#### `Logger.parse(config, joiner?, log?, sc?)`

Composes a styled string from a `[text, chalkStyle]` pair array.

```ts
Logger.parse(
  [
    ['Arkstack', 'bold'],
    ['v1.0.0', 'gray'],
  ],
  ' ',
); // "Arkstack v1.0.0"

// Return instead of print
const str = Logger.parse([['Ready', 'green']], ' ', false);
```

---

#### `Logger.log(config, joiner?, log?, sc?)`

A flexible polymorphic logger that accepts either a string + style, or a `LoggerParseSignature` array. Returns the `Logger` class when called with no arguments.

```ts
Logger.log('PORT:3000', 'cyan');
Logger.log(
  [
    ['PORT', 'bold'],
    ['3000', 'cyan'],
  ],
  ' ',
);
```

---

#### `Logger.chalker(styles[])`

Returns a function that applies a chain of chalk styles to any input.

```ts
const highlight = Logger.chalker(['bold', 'green']);
console.log(highlight('Ready'));
```

---

#### `Logger.console()`

Returns a `Console`-compatible object with `log`, `debug`, `warn`, `info`, and `error` methods. Can be used as a drop-in replacement for `globalThis.console`.

```ts
const console = Logger.console();
console.log('hello');
console.warn('watch out');
```

---

### ErrorHandler

**`src/ErrorHandler.ts`**

A static utility class for normalising, serialising, classifying, and logging errors. Integrates with [Pino](https://getpino.io) for persistent error file logging.

#### `ErrorHandler.createErrorPayload(err, fallbackMessage?)`

The primary method. Converts any thrown value into a consistent `ArkstackErrorPayload` object, handling validation errors, model-not-found errors, and generic errors uniformly.

```ts
import { ErrorHandler } from '@arkstack/common';

try {
  // ...
} catch (err) {
  const payload = ErrorHandler.createErrorPayload(err, 'Request failed');
  // { status: 'error', code: 422, message: '...', errors: {...} }
}
```

**Payload shape:**

```ts
{
  status: 'error'
  code: number        // HTTP status code (100–599)
  message: string
  errors?: unknown    // present for validation errors
  stack?: string      // present in development unless HIDE_ERROR_STACK is set
}
```

**Classification logic:**

| Error type                              | `code`                           | `errors` populated    |
| --------------------------------------- | -------------------------------- | --------------------- |
| Validation error (has `.errors`)        | `statusCode` / `status` or `422` | Yes                   |
| Model not found (has `.getModelName()`) | `404`                            | No                    |
| Generic error                           | `statusCode` / `status` or `500` | Stack trace as object |

---

#### `ErrorHandler.serializeError(value, seen?)`

Recursively serialises any value — including `Error` instances and circular references — into a plain JSON-safe object. Circular references are replaced with `'[Circular]'`.

```ts
const serialized = ErrorHandler.serializeError(new Error('oops'));
// { name: 'Error', message: 'oops', stack: '...' }
```

---

#### `ErrorHandler.normalizeStatusCode(value, fallback?)`

Ensures a status code is a valid integer in the range `100–599`. Returns the fallback (default `500`) for anything invalid.

```ts
ErrorHandler.normalizeStatusCode('422'); // 422
ErrorHandler.normalizeStatusCode('xyz'); // 500
```

---

#### `ErrorHandler.getErrorLogger()`

Returns a Pino logger instance that writes to `storage/logs/error.log` (created automatically). Instances are cached per destination path.

---

#### `ErrorHandler.logUnhandledError(err, request, message)`

Persists an unhandled error to the error log file, including the serialised error and the associated request context.

```ts
ErrorHandler.logUnhandledError(
  err,
  { method: 'GET', url: '/api' },
  'Unhandled exception',
);
```

---

#### Classification helpers

```ts
ErrorHandler.isValidationError(err); // true if err.errors is defined
ErrorHandler.isModelNotFoundError(err); // true if err.getModelName is a function
ErrorHandler.shouldLogError(err); // false for validation/model-not-found errors
ErrorHandler.shouldHideStack(); // true if HIDE_ERROR_STACK env is set
ErrorHandler.getPrimaryError(err); // unwraps err.cause if present
ErrorHandler.toErrorShape(value); // casts unknown to ArkstackErrorShape if object
```

All static methods are also exported as named standalone functions for convenience:

```ts
import {
  createErrorPayload,
  isValidationError,
  serializeError,
  logUnhandledError,
  // ...
} from '@arkstack/common';
```

---

### Exceptions

**`src/Exceptions/`**

A three-level exception hierarchy for structured error throwing.

#### `Exception`

Base class extending `Error`. Sets `.name` to `'Exception'`.

```ts
import { Exception } from '@arkstack/common';

throw new Exception('Something went wrong');
```

---

#### `AppException`

Extends `Exception`. Adds `statusCode` (default `400`) and an optional `errors` map for field-level validation errors.

```ts
import { AppException } from '@arkstack/common';

const err = new AppException('Validation failed', 422);
err.errors = { email: ['Email is required'] };
```

---

#### `RequestException`

Extends `AppException`. Intended for HTTP request-level errors. Provides two static assertion helpers:

**`RequestException.assertNotEmpty(value, message, code?)`**

Throws a `RequestException` if the value is `null` or `undefined`. Narrows the type on success.

```ts
import { RequestException } from '@arkstack/common';

const user = await User.find(id);
RequestException.assertNotEmpty(user, 'User not found', 404);
// user is now User (not null | undefined)
```

**`RequestException.abortIf(condition, message, code?)`**

Throws if the condition is truthy.

```ts
RequestException.abortIf(!user.isActive, 'Account is suspended', 403);
```

---

### Hook

**`src/Hook.ts`**

A global, named hook registry for extending Arkstack internals without modifying core code. Hooks are keyed by name and support positional slots (`before`, `after`, or any custom string).

#### `Hook.set(name, hook)`

Registers a hook. Multiple calls for the same name are merged.

```ts
import { Hook } from '@arkstack/common';

Hook.set('request:handle', {
  before: (ctx) => console.log('before handler'),
  after: (ctx) => console.log('after handler'),
});
```

---

#### `Hook.get(name, pos?)`

Retrieves the full hook object or a specific positional handler.

```ts
const hook = Hook.get('request:handle'); // IHook | undefined
const before = Hook.get('request:handle', 'before'); // function | undefined
```

---

#### `Hook.has(name, pos?)`

Checks whether a hook (or a specific position within it) exists.

```ts
Hook.has('request:handle'); // true | false
Hook.has('request:handle', 'after'); // true | false
```

---

#### `Hook.unset(name?, pos?)`

Removes a hook or a single positional handler. If the hook becomes empty after removal, it is deleted entirely. Called with no arguments, it delegates to `Hook.clear()`.

```ts
Hook.unset('request:handle', 'before'); // removes only the 'before' handler
Hook.unset('request:handle'); // removes the entire hook
Hook.unset(); // clears all hooks
```

---

#### `Hook.getAll()`

Returns all registered hooks as a plain record.

```ts
const hooks = Hook.getAll();
// { 'request:handle': { before: fn, after: fn } }
```

---

#### `Hook.clear()`

Clears all registered hooks.

---

### Encryption

**`src/utils/encryption.ts`**

AES-256-GCM symmetric encryption for sensitive values (e.g. two-factor authentication secrets). Requires the `TWO_FACTOR_ENCRYPTION_KEY` environment variable.

#### `Encryption.encrypt(value)`

Encrypts a string. Returns a colon-delimited base64url string: `<iv>:<authTag>:<ciphertext>`.

```ts
import { Encryption } from '@arkstack/common';

const token = Encryption.encrypt('my-secret-value');
// "abc123:def456:ghi789"
```

#### `Encryption.decrypt(payload)`

Decrypts a payload produced by `encrypt`. Throws if the format is invalid or the key is wrong.

```ts
const original = Encryption.decrypt(token);
// "my-secret-value"
```

**Environment variable:**

| Variable                    | Required | Description                                                |
| --------------------------- | -------- | ---------------------------------------------------------- |
| `TWO_FACTOR_ENCRYPTION_KEY` | Yes      | Raw secret; hashed to a 256-bit key internally via SHA-256 |

---

### Hash

**`src/utils/hash.ts`**

Password hashing and OTP generation utilities.

#### `Hash.make(value)`

Hashes a string using bcrypt with a salt factor of 10.

```ts
import { Hash } from '@arkstack/common';

const hashed = await Hash.make('user-password');
```

#### `Hash.verify(value, hashedValue)`

Compares a plain-text value against a bcrypt hash.

```ts
const isValid = await Hash.verify('user-password', hashed);
```

#### `Hash.otp(digits?, label?, period?)`

Creates a TOTP instance using the `otpauth` library with `SHA1` and a static secret. Suitable for simple time-based OTP flows.

```ts
const totp = Hash.otp(6, 'user@example.com', 60);
const token = totp.generate();
```

#### `Hash.totp(secret, label, issuer?, period?)`

Creates a TOTP instance from a base32-encoded secret. Intended for user-specific TOTP (e.g. authenticator app integration).

```ts
const totp = Hash.totp(user.totpSecret, user.email);
const isValid = totp.validate({ token: userInput }) !== null;
```

---

### Network

**`src/network.ts`**

Utilities for starting an HTTP server with automatic port detection and rendering error views.

#### `bootWithDetectedPort(boot, preferredPort?, app?)`

Detects whether the preferred port is available (using `detect-port`) and boots the server on the first free port. Also initialises key globals: `env`, `config`, `str`, `app`, and `arkctx`.

```ts
import { bootWithDetectedPort } from '@arkstack/common';

await bootWithDetectedPort(
  async (port) => {
    server.listen(port);
    Logger.success(`Server:http://localhost:${port}`);
  },
  3000,
  appInstance,
);
```

**Globals set:**

| Global              | Value                           |
| ------------------- | ------------------------------- |
| `globalThis.app`    | `() => app`                     |
| `globalThis.env`    | `env`                           |
| `globalThis.config` | `config`                        |
| `globalThis.str`    | `str` (from `@h3ravel/support`) |
| `globalThis.arkctx` | `{ runtime: 'HTTP' }`           |

---

#### `renderError({ message, stack, title, code })`

Renders an error page using the `~arkstack/common.error` view template. Falls back to a human-readable title from a built-in status code map.

```ts
import { renderError } from '@arkstack/common';

const html = renderError({ code: 404, message: 'Page not found' });
```

**Built-in status titles:** `400`, `401`, `403`, `404`, `500`, `502`, `503`, `504`.

---

### Lifecycle

**`src/lifecycle.ts`**

#### `bindGracefulShutdown(shutdown)`

Registers a cleanup callback for `SIGINT`, `SIGTERM`, and `SIGQUIT` signals, ensuring the application shuts down cleanly.

```ts
import { bindGracefulShutdown } from '@arkstack/common';

bindGracefulShutdown(async () => {
  await db.disconnect();
  Logger.info('Server shut down gracefully');
});
```

---

### Prototypes

**`src/prototypes.ts`**

#### `loadPrototypes()`

Extends `String.prototype` with four utility methods. Call this once during application bootstrap.

```ts
import { loadPrototypes } from '@arkstack/common';

loadPrototypes();
```

**Methods added:**

| Method                    | Description                                  | Example                                       |
| ------------------------- | -------------------------------------------- | --------------------------------------------- |
| `.titleCase()`            | Converts to Title Case (handles `_` and `-`) | `"hello_world".titleCase()` → `"Hello World"` |
| `.camelCase()`            | Converts to camelCase                        | `"Hello World".camelCase()` → `"helloWorld"`  |
| `.pascalCase()`           | Converts to PascalCase                       | `"hello world".pascalCase()` → `"HelloWorld"` |
| `.truncate(len, suffix?)` | Truncates at word boundary                   | `"Hello World".truncate(7)` → `"Hello..."`    |

---

## Global Augmentations

**`src/app.d.ts`**

When `loadPrototypes()` is called and `bootWithDetectedPort()` initialises the runtime, the following globals and String prototype extensions are available throughout the application:

```ts
// Globals (set by bootWithDetectedPort)
globalThis.env; // GlobalEnv — typed env() accessor
globalThis.config; // GlobalConfig — typed config() accessor

// String prototype extensions (set by loadPrototypes)
'my_string'.titleCase();
'my_string'.camelCase();
'my_string'.pascalCase();
'my long string'.truncate(10, '…');
```

---

## Types

**`src/types.ts`**

Key exported types from the package:

| Type                   | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `GlobalEnv`            | Typed signature for the `env()` function                                                             |
| `GlobalConfig`         | Typed signature for the `config()` function with dot-path support                                    |
| `ArkstackErrorShape`   | Union of common error properties across frameworks (`statusCode`, `status`, `errors`, `cause`, etc.) |
| `ArkstackErrorPayload` | Normalised HTTP error response shape produced by `ErrorHandler`                                      |
| `LoggerChalk`          | Chalk style identifier(s) accepted by `Logger` methods                                               |
| `LoggerParseSignature` | Array of `[string, LoggerChalk]` pairs for `Logger.parse()`                                          |
| `LoggerLog`            | Overloaded function type for `Logger.log()`                                                          |

---

## Environment Variables Reference

| Variable                    | Module              | Required | Description                                                                   |
| --------------------------- | ------------------- | -------- | ----------------------------------------------------------------------------- |
| `PORT`                      | `system`, `network` | No       | HTTP server port (default: `3000`)                                            |
| `APP_URL`                   | `system`            | No       | Base application URL                                                          |
| `APP_NAME`                  | `hash`              | No       | Application name used as TOTP issuer                                          |
| `NODE_ENV`                  | `system`            | No       | `development` or `production`                                                 |
| `OUTPUT_DIR`                | `system`            | No       | Production build output directory (default: `dist`)                           |
| `OUTPUT_DIR_DEV`            | `system`            | No       | Development build output directory (default: `.arkstack/build`)               |
| `TWO_FACTOR_ENCRYPTION_KEY` | `encryption`        | Yes\*    | Secret key for AES-256-GCM encryption (\*required only if using `Encryption`) |
| `HIDE_ERROR_STACK`          | `ErrorHandler`      | No       | Set to `true`, `1`, or `on` to suppress stack traces in error payloads        |

---

## Helpers

**`src/utils/helpers.ts`**

#### `perPage(query, defaults?)`

Extracts a safe pagination limit from a query object. Clamps the result between `1` and `50` or the configured default `maxPerPage`, defaulting to `25` or the configured default `perPage`.

```ts
import { perPage } from '@arkstack/common';

const limit = perPage({ limit: 100 }); // 50 (clamped)
const limit2 = perPage({ limit: 100 }, { maxPerPage: 100 }); // 100
const limit3 = perPage({}); // 25 (default)
const limit3 = perPage({}, { perPage: 100 }); // 100
```

#### `resolvePagination(query, defaults?)`

Extracts the current page and a safe pagination limit from a query object. Clamps the resulting `perPage` between `1` and `50` or the configured default `maxPerPage`, defaulting to `25` or the configured default `perPage`.

```ts
import { resolvePagination } from '@arkstack/common';

const limit = resolvePagination({ limit: 100 }); // {perPage: 50, page: 1} (clamped)
const limi2 = resolvePagination({ limit: 100 }, { maxPerPage: 100 }); // {perPage: 100, page: 1}
const limit3 = resolvePagination({}); // {perPage: 50, page: 1} (default)
const limit4 = resolvePagination({}, { perPage: 100, page: 2 }); // {perPage: 100, page: 2}
```

#### `getModel(modelName)`

Dynamically imports an application model by name from the configured models directory (default: `./src/app/models`). Supports augmenting `ModelRegistry` for type-safe lookups.

```ts
import { getModel } from '@arkstack/common';

const User = await getModel('User');
const users = await User.findAll();

// With type augmentation:
declare module '@arkstack/common' {
  interface ModelRegistry {
    User: typeof User;
  }
}

const TypedUser = await getModel('User'); // typeof User
```
