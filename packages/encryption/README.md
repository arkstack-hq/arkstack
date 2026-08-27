# `@arkstack/encryption`

[![@arkstack/encryption](https://img.shields.io/npm/dt/@arkstack/encryption?style=flat-square&label=@arkstack/encryption&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/encryption)](https://www.npmjs.com/package/@arkstack/encryption)

A zero dependency isomorphic encryption for Arkstack. One implementation, built on the Web Crypto API, that runs unchanged in Node, Deno, Bun, browsers and workers, so **anything encrypted on the server decrypts in the browser, and anything encrypted in the browser decrypts on the server**.

## Table of Contents

- [Installation](#installation)
- [What's in the box](#whats-in-the-box)
- [Symmetric encryption](#symmetric-encryption)
- [Keys](#keys)
- [End-to-end encryption](#end-to-end-encryption)
  - [Secure channels](#secure-channels)
  - [Sealed boxes](#sealed-boxes)
  - [Verifying a conversation](#verifying-a-conversation)
- [Synchronous Node API](#synchronous-node-api)
- [Wire formats](#wire-formats)
- [Runtime requirements](#runtime-requirements)

## Installation

```bash
pnpm add @arkstack/encryption
```

Arkstack applications already have it through `@arkstack/common` re-exports in [`Encryption`](https://arkstack.toneflix.net/guide/utilities/encryption).

## What's in the box

| Export          | What it does                                                   |
| --------------- | -------------------------------------------------------------- |
| `Cipher`        | AES-256-GCM symmetric encryption                               |
| `EncryptionKey` | A symmetric key value: generate, derive, fingerprint, compare  |
| `Keys`          | Key generation and constant time comparison helpers            |
| `KeyPair`       | ECDH P-256 identities, serialisable to base64url               |
| `SecureChannel` | A shared key between two identities, and messages over it      |
| `SealedBox`     | Anonymous encryption to a public key                           |
| `Codec`         | base64url / hex / utf8 conversion and constant time compare    |
| `NodeCipher`    | Synchronous AES-256-GCM for Node (`@arkstack/encryption/node`) |

## Symmetric encryption

```ts
import { Cipher, Keys } from '@arkstack/encryption';

const key = Keys.generate();

const payload = await Cipher.encrypt('my-secret-value', key);
// "abc123:def456:ghi789"

await Cipher.decrypt(payload, key);
// "my-secret-value"
```

A cipher instance imports the key once, which is worth doing when encrypting many values:

```ts
const cipher = await Cipher.from(process.env.APP_KEY!);

const rows = await Promise.all(values.map((value) => cipher.encrypt(value)));
```

Any key representation works: an `EncryptionKey`, raw `Uint8Array` bytes, a `CryptoKey`, a base64url string of exactly 32 bytes, or any other string, which is hashed with SHA-256 and treated as a passphrase.

### Additional authenticated data

`aad` is not encrypted, but it is bound to the ciphertext: decryption fails unless the same value is supplied. Use it to pin a payload to the context it belongs in, so a valid ciphertext cannot be replayed somewhere else.

```ts
const payload = await cipher.encrypt(body, { aad: `conversation:${id}` });

await cipher.decrypt(payload, { aad: `conversation:${id}` }); // ok
await cipher.decrypt(payload, { aad: 'conversation:other' }); // throws
```

### Bytes

`encryptBytes` / `decryptBytes` take and return `Uint8Array` for binary payloads.

## Keys

```ts
import { Keys } from '@arkstack/encryption';

Keys.generate(); // EncryptionKey, 32 random bytes
Keys.generateString(); // the same, base64url encoded for storage
Keys.token(16); // a random URL-safe token (not a key)
```

Passwords get stretched, secrets get hashed:

```ts
const { key, salt, iterations } = await Keys.derive(password); // PBKDF2-HMAC-SHA256
const same = await Keys.derive(password, { salt, iterations });

await Keys.fromSecret(process.env.APP_KEY!); // SHA-256, matching Arkstack's app key handling
```

### Comparing keys

Every comparison here runs in constant time, and never throws on malformed input — it returns `false`.

```ts
Keys.compare(left, right); // two keys already in key form
await Keys.matches(passphrase, key); // resolves both sides first
await Keys.samePublicKey(left, right); // two identities
```

### Fingerprints

A fingerprint is a digest of a key, safe to display or log. Two people reading the same fingerprint are holding the same key.

```ts
await Keys.fingerprint(key);
// "3f8a1c02 9b4e7d15 c6a0ff31 2e5b8d94"
```

---

## End-to-end encryption

An identity is an ECDH P-256 key pair. The public half is published, the private half never leaves its owner.

```ts
import { Keys } from '@arkstack/encryption';

const identity = await Keys.generateSerializedPair();
// { publicKey: 'MFkwEwYH…', privateKey: 'MIGHAgEA…' }
```

Both halves are base64url DER, so they survive JSON, headers, query strings and database columns unchanged, and import cleanly on the other runtime.

### Secure channels

Each side combines its own private key with the other side's public key. Both arrive at the same AES-256-GCM key without it ever crossing the wire — the server can route the ciphertext without being able to read it.

```ts
import { SecureChannel } from '@arkstack/encryption';

// In the browser, as Alice
const outbound = await SecureChannel.between(alice.privateKey, bobPublicKey);
const message = await outbound.encrypt('hey bob');

// On Bob's device
const inbound = await SecureChannel.between(bob.privateKey, alicePublicKey);
await inbound.decrypt(message); // "hey bob"
```

Pass `info` to derive separate keys for separate purposes from the same pair of identities:

```ts
const chat = await SecureChannel.between(alice.privateKey, bobPublicKey, {
  info: `chat:${id}`,
});
const files = await SecureChannel.between(alice.privateKey, bobPublicKey, {
  info: `files:${id}`,
});
```

### Sealed boxes

Encrypt to a public key with no identity of your own. A throwaway key pair is generated per message and its public half travels in the payload; only the recipient's private key can open the result — the sender cannot decrypt their own message afterwards.

```ts
import { SealedBox } from '@arkstack/encryption';

const payload = await SealedBox.seal('anonymous tip', recipientPublicKey);

await SealedBox.open(payload, recipientPrivateKey); // "anonymous tip"
```

### Verifying a conversation

Key agreement protects against eavesdroppers, not against a server that hands each side the wrong public key. A safety number lets the participants rule that out over any channel they already trust.

```ts
const number = await Keys.safetyNumber(alicePublicKey, bobPublicKey);
// "48213 90277 11408 63925 …"

await Keys.confirmSafetyNumber(alicePublicKey, bobPublicKey, scanned);
```

The value is identical on both sides regardless of who initiated, and whitespace is ignored when confirming. `channel.safetyNumber()` returns the same string for an open channel.

## Synchronous Node API

The Web Crypto API is asynchronous everywhere. When a synchronous call is genuinely needed on the server, `@arkstack/encryption/node` provides one that emits byte-identical payloads:

```ts
import { NodeCipher } from '@arkstack/encryption/node';

const payload = NodeCipher.encrypt(
  'value',
  NodeCipher.fromSecret(process.env.APP_KEY!),
);

NodeCipher.decrypt(payload, NodeCipher.fromSecret(process.env.APP_KEY!));
```

It lives behind its own entry point so browser bundles never pull in `node:crypto`.

> `NodeCipher.resolve()` treats a base64url string of exactly 32 bytes as raw key material and anything else as a passphrase, mirroring `EncryptionKey.resolve()`. When a secret must always be hashed — as `APP_KEY` is — use `NodeCipher.fromSecret()`.

## Wire formats

Both ciphers read and write the same payloads:

| Kind       | Format                                                  |
| ---------- | ------------------------------------------------------- |
| Cipher     | `<iv>:<authTag>:<ciphertext>`                           |
| Sealed box | `ark1:<ephemeralPublicKey>:<iv>:<authTag>:<ciphertext>` |

Every segment is unpadded base64url. The IV is 12 bytes, the GCM tag is 16 bytes.

## Runtime requirements

A Web Crypto implementation on `globalThis.crypto`:

- **Node** 19+, or Node 18 with `globalThis.crypto` available.
- **Browsers** in a secure context (`https` or `localhost`).
- **Deno**, **Bun**, and Cloudflare/Deno-style workers out of the box.

The synchronous `/node` entry point requires Node.
