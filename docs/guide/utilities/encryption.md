# Encryption

AES-256-GCM symmetric encryption for sensitive values (e.g. two-factor authentication secrets). Uses the application key, `APP_KEY` (`config('app.key')`).

## `Encryption.encrypt(value)`

Encrypts a string. Returns a colon-delimited base64url string: `<iv>:<authTag>:<ciphertext>`.

```ts
import { Encryption } from '@arkstack/common';

const token = Encryption.encrypt('my-secret-value');
// "abc123:def456:ghi789"
```

## `Encryption.decrypt(payload)`

Decrypts a payload produced by `encrypt`. Throws if the format is invalid or the key is wrong.

```ts
const original = Encryption.decrypt(token);
// "my-secret-value"
```

**Environment variable:**

| Variable  | Required | Description                                                |
| --------- | -------- | ---------------------------------------------------------- |
| `APP_KEY` | Yes      | Raw secret; hashed to a 256-bit key internally via SHA-256 |

Generate one with [`ark key:generate`](/guide/cli). For backward compatibility, a legacy `TWO_FACTOR_ENCRYPTION_KEY` is still honored when `APP_KEY` is not set.
