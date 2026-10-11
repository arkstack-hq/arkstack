import { existsSync, readFileSync } from 'node:fs'

import type { FirebaseTransportConfig } from '../../types'
import { env } from '@arkstack/common'
import path from 'node:path'

/** The slice of `firebase-admin/app` the Firebase drivers use. */
export interface FirebaseAdminAppModule {
  cert(serviceAccount: Record<string, any>): unknown
  getApps(): Array<{ name: string }>
  initializeApp(options: Record<string, unknown>, name: string): unknown
}

/**
 * Initialize, or reuse, a named Firebase Admin app.
 *
 * Credentials come from the service account file at `admin_sdk_path` when it
 * exists, otherwise from the inline `project_id` / `client_email` / `private_key`.
 *
 * @param options
 * @param suffix   Distinguishes apps that need different init options.
 * @param extra    Extra `initializeApp` options, such as `databaseURL`.
 * @returns
 */
export const firebaseAdminApp = async (
  options: FirebaseTransportConfig,
  suffix = '',
  extra: Record<string, unknown> = {},
): Promise<unknown> => {
  const specifier = 'firebase-admin/app'
  const app = (await import(specifier).catch(() => {
    throw new Error(
      'The "firebase-admin" package is required for the Firebase realtime transports. Install it with `npm i firebase-admin`.',
    )
  })) as FirebaseAdminAppModule

  const adminsdk = path.join(
    process.cwd(),
    options.admin_sdk_path ?? env('FIREBASE_ADMINSDK', 'firebase-adminsdk.json'),
  )

  let serviceAccount: Record<string, any> | undefined
  try {
    if (existsSync(adminsdk)) serviceAccount = JSON.parse(readFileSync(adminsdk, { encoding: 'utf-8' }))
  } catch {
    /** */
  }

  const credential = app.cert(
    serviceAccount ?? {
      projectId: options.project_id ?? env('FIREBASE_PROJECT_ID', ''),
      clientEmail: options.client_email ?? env('FIREBASE_CLIENT_EMAIL', ''),
      // Env-stored keys keep literal "\n"; restore real newlines.
      privateKey: (options.private_key ?? env('FIREBASE_PRIVATE_KEY', ''))?.replace(/\\n/g, '\n'),
    },
  )

  // Reuse a named app so repeated broadcasts don't re-initialize.
  const name =
    String(options.app_name ?? env('FIREBASE_APP_NAME', 'arkstack-realtime'))
      .replaceAll(' ', '-')
      .toLowerCase() + suffix
  const existing = app.getApps().find((a) => a.name === name)

  return existing ?? app.initializeApp({ credential, ...extra }, name)
}

/**
 * The public web app settings a browser Firebase client is initialized with.
 *
 * @param options
 * @returns
 */
export const firebaseWebConfig = (options: FirebaseTransportConfig): Record<string, unknown> => ({
  apiKey: options.web?.api_key ?? env('FIREBASE_API_KEY', ''),
  authDomain: options.web?.auth_domain ?? env('FIREBASE_AUTH_DOMAIN', ''),
  projectId: options.project_id ?? env('FIREBASE_PROJECT_ID', ''),
  appId: options.web?.app_id ?? env('FIREBASE_APP_ID', ''),
  messagingSenderId: options.web?.messaging_sender_id ?? env('FIREBASE_MESSAGING_SENDER_ID', ''),
  vapidKey: options.web?.vapid_key ?? env('FIREBASE_VAPID_KEY', ''),
})
