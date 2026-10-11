import type { DeviceTokenOptions, FirebaseClientConfig, ModuleImporter } from './types'
import { defaultImporter } from './importer'

/** The slice of `firebase/messaging` used to issue device tokens. */
interface FirebaseMessagingModule {
    getMessaging(app: unknown): unknown
    isSupported(): Promise<boolean>
    getToken(
        messaging: unknown,
        options?: { vapidKey?: string, serviceWorkerRegistration?: ServiceWorkerRegistration },
    ): Promise<string>
}

interface FirebaseAppModule {
    getApps(): Array<{ name: string }>
    initializeApp(options: Record<string, unknown>, name: string): unknown
}

const APP_NAME = 'arkstack-push'

/**
 * The public settings a service worker needs to initialize Firebase.
 *
 * @param config
 * @returns
 */
const webConfig = (config: FirebaseClientConfig) => ({
    apiKey: config.apiKey,
    projectId: config.projectId,
    appId: config.appId,
    messagingSenderId: config.messagingSenderId,
})

/**
 * Register `url` as the messaging service worker, handing it the Firebase web
 * config as the `firebaseConfig` query parameter.
 *
 * @param url
 * @param config
 * @returns
 */
const registerServiceWorker = async (url: string, config: FirebaseClientConfig): Promise<ServiceWorkerRegistration> => {
    const separator = url.includes('?') ? '&' : '?'
    const query = `firebaseConfig=${encodeURIComponent(JSON.stringify(webConfig(config)))}`

    return await navigator.serviceWorker.register(`${url}${separator}${query}`)
}

/**
 * Issue an FCM registration token for this browser, prompting for notification
 * permission when needed. Null when the browser cannot receive web push.
 *
 * @param messagingMod
 * @param messaging
 * @param config
 * @param options
 * @returns
 */
export const issueDeviceToken = async (
    messagingMod: FirebaseMessagingModule,
    messaging: unknown,
    config: FirebaseClientConfig,
    options: DeviceTokenOptions = {},
): Promise<string | null> => {
    if (!(await messagingMod.isSupported().catch(() => false))) {
        return null
    }

    const serviceWorkerRegistration = typeof options.serviceWorker === 'string'
        ? await registerServiceWorker(options.serviceWorker, config)
        : options.serviceWorker

    const token = await messagingMod.getToken(messaging, {
        ...(config.vapidKey ? { vapidKey: config.vapidKey } : {}),
        ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    })

    return token || null
}

/**
 * Issue a device token without a Firebase transport, e.g. when notifications
 * stream over Pusher but are pushed to devices over FCM.
 *
 * @param config
 * @param options
 * @param importModule  Loads the `firebase` SDK modules.
 * @returns
 */
export const requestDeviceToken = async (
    config: FirebaseClientConfig,
    options: DeviceTokenOptions = {},
    importModule: ModuleImporter = defaultImporter,
): Promise<string | null> => {
    const [appMod, messagingMod] = await Promise.all([
        importModule('firebase/app') as Promise<FirebaseAppModule>,
        importModule('firebase/messaging') as Promise<FirebaseMessagingModule>,
    ]).catch(() => {
        throw new Error('The "firebase" package is required for device tokens. Install it with `npm i firebase`.')
    })

    const app = appMod.getApps().find((existing) => existing.name === APP_NAME)
        ?? appMod.initializeApp(webConfig(config), APP_NAME)

    return await issueDeviceToken(messagingMod, messagingMod.getMessaging(app), config, options)
}
