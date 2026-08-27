# Encryption

AES-256-GCM symmetric encryption for sensitive values (e.g. two-factor authentication secrets). Uses the application key, `APP_KEY` (`config('app.key')`).

`Encryption` is a thin wrapper around [`@arkstack/encryption`](https://www.npmjs.com/package/@arkstack/encryption), the framework's isomorphic encryption package. The wrapper binds the app key; the package underneath runs on the Web Crypto API, so **a value encrypted on the server can be decrypted in the browser and vice versa**.

For encrypting between two users rather than between the app and itself, see [End-to-End Encryption](/guide/utilities/e2e-encryption).

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

Both methods take an optional second argument to encrypt under a key other than the application key:

```ts
Encryption.encrypt('my-secret-value', tenantKey);
```

## `Encryption.encryptAsync(value)` / `Encryption.decryptAsync(payload)`

The same operations on the Web Crypto path. They produce and consume the same payload format as the synchronous pair, so the two can be mixed freely — use these when the calling code is (or may become) shared with the browser.

```ts
const token = await Encryption.encryptAsync('my-secret-value');

await Encryption.decryptAsync(token);
```

Both accept an options object with `aad` — additional authenticated data that is not encrypted, but is bound to the ciphertext, so decryption fails unless the same value is supplied:

```ts
const token = await Encryption.encryptAsync(body, key, { aad: `conversation:${id}` });

await Encryption.decryptAsync(token, key, { aad: `conversation:${id}` });
```

## Decrypting in the browser

The cipher key is SHA-256 of `APP_KEY`. Client code reaches the same key from the same secret:

```ts
import { Cipher, EncryptionKey } from '@arkstack/encryption';

const key = await EncryptionKey.fromSecret(appKey);

await Cipher.decrypt(payloadFromServer, key);
```

::: warning
Shipping `APP_KEY` to a browser hands every client the key to everything the app encrypts. Do this only with a key scoped to that client — never the application key itself. When the goal is content the server cannot read, use [end-to-end encryption](/guide/utilities/e2e-encryption) instead.
:::

## Key utilities

```ts
Encryption.generateKey();                  // random base64url key
await Encryption.compareKeys(left, right); // constant time comparison
await Encryption.deriveKey(password);      // PBKDF2-HMAC-SHA256 → { key, salt, iterations }
await Encryption.fingerprint();            // displayable digest of the app key
```

`compareKeys` is constant time and returns `false` rather than throwing on malformed input.

## `Encryption.cipher(key?)`

Returns a `Cipher` bound to the application key (or an override), for encrypting many values without re-deriving the key each time, and for raw `Uint8Array` payloads via `encryptBytes` / `decryptBytes`.

```ts
const cipher = await Encryption.cipher();

const rows = await Promise.all(values.map((value) => cipher.encrypt(value)));
```

## Re-exports

The full `@arkstack/encryption` surface is available from `@arkstack/common`:

```ts
import { Cipher, Codec, EncryptionKey, KeyPair, Keys, SealedBox, SecureChannel } from '@arkstack/common';
```

**Environment variable:**

| Variable  | Required | Description                                                |
| --------- | -------- | ---------------------------------------------------------- |
| `APP_KEY` | Yes      | Raw secret; hashed to a 256-bit key internally via SHA-256 |

Generate one with [`ark key:generate`](/guide/cli). For backward compatibility, a legacy `TWO_FACTOR_ENCRYPTION_KEY` is still honored when `APP_KEY` is not set.
