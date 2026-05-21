# Hashing Utilities

Provides functions for hashing and verifying passwords, as well as generating and validating time-based one-time passwords (TOTPs).

## `Hash.make(value)`

Hashes a string using bcrypt with a salt factor of 10.

```ts
import { Hash } from '@arkstack/common';

const hashed = await Hash.make('user-password');
```

## `Hash.verify(value, hashedValue)`

Compares a plain-text value against a bcrypt hash.

```ts
const isValid = await Hash.verify('user-password', hashed);
```

## `Hash.otp(digits?, label?, period?)`

Creates a TOTP instance using the `otpauth` library with `SHA1` and a static secret. Suitable for simple time-based OTP flows.

```ts
const totp = Hash.otp(6, 'user@example.com', 60);
const token = totp.generate();
```

## `Hash.totp(secret, label, issuer?, period?)`

Creates a TOTP instance from a base32-encoded secret. Intended for user-specific TOTP (e.g. authenticator app integration).

```ts
const totp = Hash.totp(user.totpSecret, user.email);
const isValid = totp.validate({ token: userInput }) !== null;
```
