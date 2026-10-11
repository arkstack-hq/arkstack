import type { FirebaseDatabaseClientConfig, ModuleImporter, RealtimeEventHandler, RealtimeTransport } from '../types'
import { defaultImporter } from '../importer'

/** The slices of the `firebase` SDK this transport uses. */
interface FirebaseApp {
  name: string
}

interface FirebaseAppModule {
  getApps(): FirebaseApp[]
  initializeApp(options: Record<string, unknown>, name: string): FirebaseApp
}

interface FirebaseAuth {
  currentUser: { uid: string } | null
}

interface FirebaseAuthModule {
  getAuth(app: FirebaseApp): FirebaseAuth
  signInWithCustomToken(auth: FirebaseAuth, token: string): Promise<unknown>
  signOut(auth: FirebaseAuth): Promise<void>
}

interface DatabaseSnapshot {
  val(): unknown
}

interface FirebaseDatabaseModule {
  getDatabase(app: FirebaseApp, url?: string): unknown
  ref(database: unknown, path: string): unknown
  query(reference: unknown, ...constraints: unknown[]): unknown
  orderByChild(path: string): unknown
  startAt(value: number): unknown
  onValue(query: unknown, handler: (snapshot: DatabaseSnapshot) => void, options?: { onlyOnce?: boolean }): () => void
  onChildAdded(query: unknown, handler: (snapshot: DatabaseSnapshot) => void): () => void
}

interface ChannelEvent {
  event?: string
  payload?: unknown
}

const APP_NAME = 'arkstack-realtime-database'

/**
 * Encode a channel name into a single Realtime Database key, matching the server.
 *
 * @param channel
 * @returns
 */
const channelKey = (channel: string): string => encodeURIComponent(channel).replace(/\./g, '%2E')

/**
 * The `uid` claim of a Firebase custom token.
 *
 * @param token
 * @returns
 */
const tokenUid = (token: string): string | null => {
  try {
    const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')

    return (JSON.parse(atob(segment)) as { uid?: string }).uid ?? null
  } catch {
    return null
  }
}

/**
 * Realtime transport backed by [Firebase Realtime Database](https://firebase.google.com/docs/database/web/start).
 * `firebase` is an optional peer dependency imported lazily.
 *
 * Each subscription first asks the API to authorize the channel, which grants
 * this user read access and returns a custom token to sign in with. Only events
 * written after the transport connected are delivered.
 *
 * @param config
 * @param importModule  Loads the `firebase` SDK modules.
 * @returns
 */
export const createFirebaseDatabaseTransport = async (
  config: FirebaseDatabaseClientConfig,
  importModule: ModuleImporter = defaultImporter,
): Promise<RealtimeTransport> => {
  const [appMod, authMod, databaseMod] = await Promise.all([
    importModule('firebase/app') as Promise<FirebaseAppModule>,
    importModule('firebase/auth') as Promise<FirebaseAuthModule>,
    importModule('firebase/database') as Promise<FirebaseDatabaseModule>,
  ]).catch(() => {
    throw new Error(
      'The "firebase" package is required for the Firebase database transport. Install it with `npm i firebase`.',
    )
  })

  const app =
    appMod.getApps().find((existing) => existing.name === APP_NAME) ??
    appMod.initializeApp(
      {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        appId: config.appId,
        databaseURL: config.databaseURL,
      },
      APP_NAME,
    )

  const auth = authMod.getAuth(app)
  const database = databaseMod.getDatabase(app, config.databaseURL)
  const root = config.root ?? 'arkstack/channels'
  const endpoint = config.authEndpoint ?? `${config.apiBase}/realtime/auth`
  const listeners = new Set<() => void>()

  const offset = await new Promise<number>((resolve) => {
    databaseMod.onValue(
      databaseMod.ref(database, '.info/serverTimeOffset'),
      (snapshot) => resolve(Number(snapshot.val()) || 0),
      { onlyOnce: true },
    )
  })
  const since = Date.now() + offset

  // Sign-ins are chained so concurrent subscriptions do not race each other.
  let signing: Promise<unknown> = Promise.resolve()

  const authorize = async (channel: string): Promise<void> => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...config.auth?.headers,
      },
      body: JSON.stringify({ channel_name: channel }),
    })

    if (!response.ok) {
      throw new Error(`Realtime: channel "${channel}" was not authorized (${response.status})`)
    }

    const { token } = (await response.json()) as { token: string }

    signing = signing.then(async () => {
      if (auth.currentUser?.uid !== tokenUid(token)) {
        await authMod.signInWithCustomToken(auth, token)
      }
    })

    await signing
  }

  return {
    async subscribe(channel: string, event: string, handler: RealtimeEventHandler) {
      await authorize(channel)

      const off = databaseMod.onChildAdded(
        databaseMod.query(
          databaseMod.ref(database, `${root}/${channelKey(channel)}`),
          databaseMod.orderByChild('at'),
          databaseMod.startAt(since),
        ),
        (snapshot) => {
          const value = snapshot.val() as ChannelEvent | null

          if (value?.event === event) {
            handler(value.payload)
          }
        },
      )

      listeners.add(off)

      return {
        channel,
        unsubscribe() {
          off()
          listeners.delete(off)
        },
      }
    },
    async disconnect() {
      listeners.forEach((off) => off())
      listeners.clear()
      await authMod.signOut(auth)
    },
  }
}
