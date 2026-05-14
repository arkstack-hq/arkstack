import { type Request } from '@arkstack/http'
import { DeviceAgentPayload, SessionDeviceInfo } from './types/Session'
import { UAParser } from 'ua-parser-js'

export class SessionDevice {
    private static readonly uniqueIdentityFields = [
        'deviceName',
        'manufacturer',
        'model',
        'platform',
        'os',
        'osVersion',
        'browser',
        'deviceType',
    ] as const

    /**
     * Extracts device information from the incoming request to build a SessionDeviceInfo object.
     * 
     * @param req The incoming HTTP request object.
     * @returns A SessionDeviceInfo object containing information about the client's device.
     */
    static fromRequest (req?: Request): SessionDeviceInfo {
        const userAgent = this.readUserAgent(req)
        const ua = new UAParser(userAgent ?? undefined).getResult()
        const ca = this.readDeviceAgent(req)

        return {
            browser: this.readString(ua.browser.name) ?? this.detectBrowser(userAgent),
            os: ca?.os ?? this.readString(ua.os.name) ?? this.detectOs(userAgent),
            osVersion: ca?.osVersion ?? this.readString(ua.os.version),
            deviceType: ca?.deviceType ?? this.normalizeDeviceType(ua.device.type) ?? this.detectDeviceType(userAgent),
            deviceName: ca?.deviceName ?? null,
            manufacturer: ca?.manufacturer ?? this.readString(ua.device.vendor),
            model: ca?.model ?? this.readString(ua.device.model),
            platform: ca?.platform ?? null,
            ipAddress: this.detectIpAddress(req),
            userAgent,
        }
    }

    /**
     * Generates a human-readable display name for the device based on available information.
     * 
     * @param deviceInfo A record containing device information.
     * @returns A string representing the display name of the device.
     */
    static getDisplayName (deviceInfo?: Record<string, unknown> | null) {
        const deviceName = this.readString(deviceInfo?.deviceName)
        const manufacturer = this.readString(deviceInfo?.manufacturer)
        const model = this.readString(deviceInfo?.model)
        const browser = this.readString(deviceInfo?.browser)
        const os = this.readString(deviceInfo?.os)
        const deviceType = this.readString(deviceInfo?.deviceType)

        if (manufacturer && model) {
            return model.startsWith(manufacturer) ? model : `${manufacturer} ${model}`
        }

        if (model) {
            return model
        }

        if (deviceName) {
            return deviceName
        }

        if (browser && os) {
            return `${browser} on ${os}`
        }

        if (os && deviceType && deviceType !== 'unknown') {
            return `${os} ${deviceType}`
        }

        if (browser) {
            return browser
        }

        return 'Unknown device'
    }

    /**
     * Builds a stable device key for matching previously issued sessions to the
     * current request device.
     *
     * @param deviceInfo A record containing device information.
     * @returns A normalized device key or null when there is not enough signal.
     */
    static getUniqueKey (deviceInfo?: Record<string, unknown> | null) {
        const parts = this.uniqueIdentityFields
            .map((field) => [field, this.readString(deviceInfo?.[field])?.toLowerCase()] as const)
            .filter(([, value]) => !!value)

        if (parts.length < 2) {
            const fallbackUserAgent = this.readString(deviceInfo?.userAgent)?.toLowerCase()

            return fallbackUserAgent ?? null
        }

        return parts.map(([field, value]) => `${field}:${value}`).join('|')
    }

    /**
     * Determines whether two device payloads represent the same device.
     *
     * @param left The first device payload.
     * @param right The second device payload.
     * @returns True when both payloads resolve to the same device key.
     */
    static matches (left?: Record<string, unknown> | null, right?: Record<string, unknown> | null) {
        const leftKey = this.getUniqueKey(left)
        const rightKey = this.getUniqueKey(right)

        if (!leftKey || !rightKey) {
            return false
        }

        return leftKey === rightKey
    }

    /**
     * Safely reads the user agent string from the request headers.
     * 
     * @param req 
     * @returns 
     */
    private static readUserAgent (req?: Request) {
        const userAgent = req?.header('user-agent')

        return typeof userAgent === 'string' ? userAgent : null
    }

    /**
     * Safely reads a string value, ensuring it's a non-empty string or returns null.
     * 
     * @param value 
     * @returns 
     */
    private static readString (value: unknown) {
        return typeof value === 'string' && value.length > 0 ? value : null
    }

    /**
     * Reads a specific device-related header from the request
     * 
     * @param req 
     * @param headerName 
     * @returns 
     */
    private static readDeviceAgent (req?: Request): DeviceAgentPayload | null {
        const value = req?.header('x-device-agent')

        if (typeof value !== 'string' || value.length < 1) {
            return null
        }

        try {
            const parsed: DeviceAgentPayload = JSON.parse(value)

            return {
                deviceName: this.readString(parsed.deviceName) ?? undefined,
                manufacturer: this.readString(parsed.manufacturer) ?? undefined,
                model: this.readString(parsed.model) ?? undefined,
                platform: this.readString(parsed.platform) ?? undefined,
                os: this.readString(parsed.os) ?? undefined,
                osVersion: this.readString(parsed.osVersion) ?? undefined,
                deviceType: this.normalizeDeviceType(parsed.deviceType) ?? undefined,
            }
        } catch {
            return null
        }
    }

    private static normalizeDeviceType (value: unknown): SessionDeviceInfo['deviceType'] | null {
        if (value === 'mobile' || value === 'tablet' || value === 'desktop' || value === 'bot' || value === 'unknown') {
            return value
        }

        return null
    }

    /**
     * Detects the client's IP address from the request, considering common headers set by proxies.
     * 
     * @param req 
     * @returns 
     */
    private static detectIpAddress (req?: Request) {
        const forwarded = req?.header('x-forwarded-for')

        if (typeof forwarded === 'string' && forwarded.length > 0) {
            return forwarded.split(',')[0].trim()
        }

        return req?.ip ?? null
    }

    /**
     * Detects the browser from the user agent string.
     * 
     * @param userAgent 
     * @returns 
     */
    private static detectBrowser (userAgent: string | null) {
        if (!userAgent) return null
        if (/Edg\//i.test(userAgent)) return 'Edge'
        if (/OPR\//i.test(userAgent)) return 'Opera'
        if (/SamsungBrowser\//i.test(userAgent)) return 'Samsung Internet'
        if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return 'Chrome'
        if (/Firefox\//i.test(userAgent)) return 'Firefox'
        if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari'
        if (/PostmanRuntime\//i.test(userAgent)) return 'Postman'
        if (/okhttp\//i.test(userAgent)) return 'OkHttp'
        if (/curl\//i.test(userAgent)) return 'cURL'

        return null
    }

    /**
     * Detects the operating system from the user agent string.
     * 
     * @param userAgent 
     * @returns 
     */
    private static detectOs (userAgent: string | null) {
        if (!userAgent) return null
        if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
        if (/Android/i.test(userAgent)) return 'Android'
        if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS'
        if (/Windows NT/i.test(userAgent)) return 'Windows'
        if (/Linux/i.test(userAgent)) return 'Linux'

        return null
    }

    /**
     * Detects the device type from the user agent string.
     * 
     * @param userAgent 
     * @returns 
     */
    private static detectDeviceType (userAgent: string | null): SessionDeviceInfo['deviceType'] {
        if (!userAgent) return 'unknown'
        if (/bot|spider|crawl/i.test(userAgent)) return 'bot'
        if (/iPad|Tablet/i.test(userAgent)) return 'tablet'
        if (/Mobile|iPhone|Android/i.test(userAgent)) return 'mobile'

        return 'desktop'
    }
}
