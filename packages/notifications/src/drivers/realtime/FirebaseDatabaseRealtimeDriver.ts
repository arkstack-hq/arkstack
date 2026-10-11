import type { FirebaseDatabaseTransportConfig, RealtimeBroadcastPayload, RealtimeDeliveryOptions } from '../../types'
import { firebaseAdminApp, firebaseWebConfig } from './firebaseAdmin'

import type { RealtimeDriver } from '../../Contracts/RealtimeDriver'
import { env } from '@arkstack/common'

/** The slice of the `firebase-admin` database API this driver uses. */
interface DatabaseSnapshot {
  forEach(callback: (child: { key: string | null; val(): any }) => boolean | void): boolean
}

interface DatabaseQuery {
  endAt(value: number): DatabaseQuery
  limitToFirst(limit: number): DatabaseQuery
  once(event: 'value'): Promise<DatabaseSnapshot>
}

interface DatabaseReference extends DatabaseQuery {
  push(): { key: string | null }
  update(values: Record<string, unknown>): Promise<void>
  orderByChild(path: string): DatabaseQuery
}

interface Database {
  ref(path?: string): DatabaseReference
}

interface FirebaseAuth {
  createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string>
}

/** Characters Realtime Database keys cannot contain. */
const FORBIDDEN_KEY = /[.#$[\]/]/

/**
 * Encode a channel name into a single Realtime Database key.
 *
 * @param channel
 * @returns
 */
export const firebaseChannelKey = (channel: string): string => encodeURIComponent(channel).replace(/\./g, '%2E')

/**
 * Broadcasts over [Firebase Realtime Database](https://firebase.google.com/docs/database).
 *
 * Each event is written to `{root}/{channel}/{key}` as `{ event, payload, at }`,
 * and indexed under `{index_root}/{key}` so {@link prune} can clear old events in
 * bounded batches. Clients sign in with a custom token from {@link auth}, which
 * also writes a time-limited grant to `{grants_root}/{uid}/{channel}` that the
 * database security rules check before allowing a read.
 *
 * `firebase-admin` is an optional peer dependency, imported lazily.
 */
export class FirebaseDatabaseRealtimeDriver implements RealtimeDriver {
  private servicesPromise?: Promise<{ database: Database; auth: FirebaseAuth }>

  constructor(private options: FirebaseDatabaseTransportConfig = {}) {}

  private get root(): string {
    return this.options.root ?? 'arkstack/channels'
  }

  private get indexRoot(): string {
    return `${this.root}-index`
  }

  private get grantsRoot(): string {
    return this.options.grants_root ?? 'arkstack/grants'
  }

  private get databaseURL(): string {
    return this.options.database_url ?? env('FIREBASE_DATABASE_URL', '')
  }

  private services(): Promise<{ database: Database; auth: FirebaseAuth }> {
    const databaseSpecifier = 'firebase-admin/database'
    const authSpecifier = 'firebase-admin/auth'

    this.servicesPromise ??= (async () => {
      const [instance, database, auth] = await Promise.all([
        firebaseAdminApp(this.options, '-database', {
          databaseURL: this.databaseURL,
        }),
        import(databaseSpecifier),
        import(authSpecifier),
      ])

      return {
        database: database.getDatabase(instance),
        auth: auth.getAuth(instance),
      }
    })()

    return this.servicesPromise
  }

  /**
   * Write the event to every channel in one multi-path update.
   *
   * `delivery` is accepted for contract parity and ignored.
   *
   * @param channel
   * @param event
   * @param payload
   * @param _delivery
   * @returns
   */
  async broadcast(
    channel: string | string[],
    event: string,
    payload: RealtimeBroadcastPayload,
    _delivery?: RealtimeDeliveryOptions,
  ): Promise<string[]> {
    const { database } = await this.services()
    const channels = Array.isArray(channel) ? channel : [channel]
    const at = { '.sv': 'timestamp' }
    const updates: Record<string, unknown> = {}
    const keys: string[] = []

    for (const name of channels) {
      const key = database.ref(this.root).push().key!
      const channelKey = firebaseChannelKey(name)

      updates[`${this.root}/${channelKey}/${key}`] = { event, payload, at }
      updates[`${this.indexRoot}/${key}`] = { channel: channelKey, at }
      keys.push(key)
    }

    await database.ref().update(updates)

    return keys
  }

  /**
   * Grant `uid` read access to an already authorized channel and mint the
   * custom token the client signs in with.
   *
   * @param uid
   * @param channel
   * @returns
   */
  async auth(uid: string, channel: string): Promise<{ token: string; expires_at: number }> {
    if (!uid || FORBIDDEN_KEY.test(uid)) {
      throw new Error(`Realtime: "${uid}" cannot be used as a Firebase uid`)
    }

    const { database, auth } = await this.services()
    const expiresAt = Date.now() + (this.options.grant_ttl ?? 3600) * 1000

    await database.ref().update({
      [`${this.grantsRoot}/${uid}/${firebaseChannelKey(channel)}`]: expiresAt,
    })

    return { token: await auth.createCustomToken(uid), expires_at: expiresAt }
  }

  /**
   * Delete events older than `maxAgeSeconds`, at most `limit` per call. Call it
   * from a scheduled job until it returns 0.
   *
   * @param maxAgeSeconds
   * @param limit
   * @returns The number of events deleted.
   */
  async prune(maxAgeSeconds: number, limit = 500): Promise<number> {
    const { database } = await this.services()
    const cutoff = Date.now() - maxAgeSeconds * 1000
    const snapshot = await database
      .ref(this.indexRoot)
      .orderByChild('at')
      .endAt(cutoff)
      .limitToFirst(limit)
      .once('value')

    const updates: Record<string, null> = {}

    snapshot.forEach((child) => {
      const entry = child.val() as { channel?: string } | null

      if (child.key && entry?.channel) {
        updates[`${this.root}/${entry.channel}/${child.key}`] = null
        updates[`${this.indexRoot}/${child.key}`] = null
      }
    })

    const deleted = Object.keys(updates).length / 2

    if (deleted > 0) {
      await database.ref().update(updates)
    }

    return deleted
  }

  /**
   * Public settings a browser client needs to read channels.
   *
   * @returns
   */
  clientConfig(): Record<string, unknown> {
    return {
      ...firebaseWebConfig(this.options),
      databaseURL: this.databaseURL,
      root: this.root,
    }
  }

  /**
   * Use `Broadcast.routes()`, which authorizes channels through the registry.
   *
   * @param _authEndpoint
   * @param _middleware
   * @param _channelPrefix
   */
  async registerAuthRoute(
    _authEndpoint?: string,
    _middleware?: unknown | unknown[],
    _channelPrefix?: string,
  ): Promise<void> {}
}
