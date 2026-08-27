# End-to-End Encryption

[`@arkstack/encryption`](https://www.npmjs.com/package/@arkstack/encryption) ships the primitives for content the server routes but cannot read: ECDH identities, shared-key channels between two of them, and anonymous sealed boxes.

Everything here is built on the Web Crypto API and runs unchanged in Node and the browser, which is the point — the private keys live on the clients, and the server only ever sees ciphertext.

Everything is also re-exported from `@arkstack/common`, so server code can import from either.

## Identities

An identity is an ECDH P-256 key pair. The public half is published, the private half never leaves its owner.

```ts
import { Keys } from '@arkstack/encryption';

const identity = await Keys.generateSerializedPair();
// { publicKey: 'MFkwEwYH…', privateKey: 'MIGHAgEA…' }
```

Both halves are base64url DER strings, safe to put in JSON, headers, or a database column:

```ts
await User.query().where({ id }).update({ publicKey: identity.publicKey });
```

::: warning
Store the private key on the client — a keychain, IndexedDB, or wrapped under a password with `Keys.derive()`. A private key that reaches the server ends the end-to-end guarantee.
:::

`KeyPair` gives you the full object model when you need it:

```ts
import { KeyPair } from '@arkstack/encryption';

const pair = await KeyPair.generate();
const serialized = await pair.export();

await KeyPair.fromPrivateKey(serialized.privateKey); // public key recovered from the private one
await KeyPair.fromPublicKey(peerPublicKey);          // a peer, public half only
```

## Secure channels

A channel combines your private key with a peer's public key. Both sides derive the same AES-256-GCM key locally; the key itself never crosses the wire.

```ts
import { SecureChannel } from '@arkstack/encryption';

// Alice's device
const outbound = await SecureChannel.between(alice.privateKey, bobPublicKey);
const payload = await outbound.encrypt('hey bob');

// Bob's device
const inbound = await SecureChannel.between(bob.privateKey, alicePublicKey);
await inbound.decrypt(payload); // "hey bob"
```

Between the two, `payload` is just a string — persist it, queue it, broadcast it over [realtime](/guide/notifications) — the server has no key to open it with.

Use `info` to derive independent keys for independent purposes from the same pair of identities:

```ts
const chat = await SecureChannel.between(alice.privateKey, bobPublicKey, { info: `chat:${id}` });
const files = await SecureChannel.between(alice.privateKey, bobPublicKey, { info: `files:${id}` });
```

The derived key is available as `channel.key` if you want to cache it and skip the handshake later. It is exactly as sensitive as the messages themselves.

## Sealed boxes

A sealed box encrypts to a public key without a sender identity. Each message gets a throwaway key pair whose public half travels in the payload, so only the recipient's private key opens it — the sender cannot decrypt their own message afterwards.

```ts
import { SealedBox } from '@arkstack/encryption';

const payload = await SealedBox.seal('anonymous tip', recipientPublicKey);

await SealedBox.open(payload, recipientPrivateKey); // "anonymous tip"
```

Good for one-way drops: anonymous reports, invitations, or an inbox a sender should not be able to read back.

## Verifying a conversation

Key agreement stops an eavesdropper. It does not stop a server that hands each side the wrong public key — so give the participants a way to compare identities over a channel they already trust.

```ts
const number = await Keys.safetyNumber(alicePublicKey, bobPublicKey);
// "48213 90277 11408 63925 …"
```

The value is identical on both sides regardless of who initiated. Display it, or scan it, and confirm:

```ts
await Keys.confirmSafetyNumber(alicePublicKey, bobPublicKey, scanned); // constant time, whitespace ignored
```

An open channel exposes the same value directly:

```ts
await outbound.safetyNumber();
```

For a shorter check, fingerprints work on individual keys:

```ts
await Keys.fingerprintPublicKey(bobPublicKey);
// "3f8a1c02 9b4e7d15 c6a0ff31 2e5b8d94"

await outbound.fingerprint(); // digest of the derived shared key — identical on both ends
```

If a peer's fingerprint changes between sessions, their identity was replaced. Surface it.

## Comparing keys

Every comparison helper runs in constant time and returns `false` on malformed input rather than throwing:

```ts
Keys.compare(left, right);                 // symmetric keys
await Keys.matches(passphrase, key);       // resolves both sides first
await Keys.samePublicKey(left, right);     // identities, in any representation
```

## Wrapping a private key with a password

`Keys.derive()` stretches a password into a key with PBKDF2-HMAC-SHA256. Store the salt and iteration count next to the ciphertext — they are not secret.

```ts
import { Cipher, Keys } from '@arkstack/encryption';

const { key, salt, iterations } = await Keys.derive(password);
const wrapped = await Cipher.encrypt(identity.privateKey, key);

// Later, on any device
const { key: unwrapKey } = await Keys.derive(password, { salt, iterations });
const privateKey = await Cipher.decrypt(wrapped, unwrapKey);
```

## Putting it together

A minimal encrypted conversation:

```ts
// 1. Each user generates an identity once and publishes the public half.
const identity = await Keys.generateSerializedPair();

// 2. Opening a conversation, each side builds a channel to the other.
const channel = await SecureChannel.between(identity.privateKey, peer.publicKey, {
  info: `conversation:${conversation.id}`,
});

// 3. Verify, once, out of band.
const safety = await channel.safetyNumber();

// 4. Send and receive ciphertext.
await api.post(`/conversations/${conversation.id}/messages`, {
  body: await channel.encrypt(draft),
});

const body = await channel.decrypt(message.body);
```

The server stores `message.body` and never holds a key that opens it.

## Runtime requirements

A Web Crypto implementation on `globalThis.crypto`:

- **Node** 19+, or Node 18 with `globalThis.crypto` available.
- **Browsers** in a secure context (`https` or `localhost`).
- **Deno**, **Bun**, and workers out of the box.
