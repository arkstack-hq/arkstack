# @arkstack/realtime

[![@arkstack/realtime](https://img.shields.io/npm/dt/@arkstack/realtime?style=flat-square&label=@arkstack/realtime&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F@arkstack/realtime)](https://www.npmjs.com/package/@arkstack/realtime)

The client for consuming [Arkstack](https://arkstack.toneflix.net) realtime notifications. A framework-agnostic core plus React and Vue bindings, backed by [Pusher](https://pusher.com/channels) or [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging).

Pairs with the `realtime` notification driver in [`@arkstack/notifications`](https://www.npmjs.com/package/@arkstack/notifications), which broadcasts a per-user channel (`user.<id>`) that this client subscribes to.

## Install

```sh
pnpm add @arkstack/realtime
```

Then install the client SDK for your transport (both are optional peer dependencies — install only the one you use):

```sh
pnpm add pusher-js   # Pusher transport
pnpm add firebase    # Firebase transport
```

## Usage

Create a client and subscribe to a user's channel. `subscribe`/`forUser` resolve to an unsubscribe function.

```ts
import { createRealtime } from '@arkstack/realtime';

const realtime = createRealtime({
  transport: 'pusher',
  pusher: {
    key: import.meta.env.VITE_PUSHER_KEY,
    cluster: 'mt1',
    authEndpoint: '/broadcasting/auth',
  },
});

const unsubscribe = await realtime.forUser(user.id, (notification) => {
  console.log(notification.title, notification.description);
});

// later
unsubscribe();
await realtime.disconnect();
```

Each `notification` matches the payload broadcast by the server:

```ts
interface RealtimeNotification {
  id: string;
  type: string | null;
  title: string;
  description: string;
  actionText?: string | null;
  actionLink?: string | null;
  meta?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}
```

## React

```tsx
import { useNotifications } from '@arkstack/realtime/react';

function Bell({ realtime, userId }) {
  const { notifications, latest, clear } = useNotifications(
    realtime,
    realtime.channelFor(userId),
    { limit: 20 },
  );

  return (
    <span onClick={clear}>
      {notifications.length} · {latest?.title}
    </span>
  );
}
```

The hook accumulates notifications (newest first), caps them at `limit`, and unsubscribes automatically on unmount or when `client`/`channel` change.

## Vue

```vue
<script setup>
import { useNotifications } from '@arkstack/realtime/vue';

const props = defineProps(['realtime', 'userId']);
const { notifications, latest, clear } = useNotifications(
  props.realtime,
  props.realtime.channelFor(props.userId),
  { limit: 20 },
);
</script>

<template>
  <span @click="clear">{{ notifications.length }} · {{ latest?.title }}</span>
</template>
```

The composable unsubscribes automatically when the component's scope is disposed.

## Firebase

Firebase Cloud Messaging delivers to the device (via `onMessage`), so notifications are matched by event name rather than channel:

```ts
const realtime = createRealtime({
  transport: 'firebase',
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  },
});
```

## Custom transport

Provide `transportFactory` to bridge any backend (a raw WebSocket, SSE, a test double, …):

```ts
import { createRealtime, type RealtimeTransport } from '@arkstack/realtime';

const transport: RealtimeTransport = {
  subscribe(channel, event, handler) {
    const socket = new WebSocket(`wss://example.test/${channel}`);
    socket.addEventListener('message', (e) => {
      const { event: name, payload } = JSON.parse(e.data);
      if (name === event) handler(payload);
    });

    return { channel, unsubscribe: () => socket.close() };
  },
  disconnect() {},
};

const realtime = createRealtime({ transportFactory: () => transport });
```

## API

- `createRealtime(config)` — create a `RealtimeClient`. Config: `transport` (`'pusher'` | `'firebase'`), `event` (default `notification`), `channelPrefix` (default `user.`), `pusher`/`firebase` credentials, or a custom `transportFactory`.
- `client.subscribe(channel, handler)` / `client.forUser(userId, handler)` — subscribe; returns an unsubscribe function.
- `client.channelFor(userId)` — the per-user channel name.
- `client.disconnect()` — tear down the transport connection.
- `@arkstack/realtime/react` — `useNotifications(client, channel, { limit? })` → `{ notifications, latest, clear }`.
- `@arkstack/realtime/vue` — `useNotifications(client, channel, { limit? })` → `{ notifications, latest, clear, stop }`.

See the [notifications guide](https://arkstack.toneflix.net/guide/notifications) for the server side.

## License

MIT
