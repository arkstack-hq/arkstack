
export interface SessionDeviceInfo extends Record<string, unknown> {
    browser: string | null
    os: string | null
    osVersion: string | null
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'
    deviceName: string | null
    manufacturer: string | null
    model: string | null
    platform: string | null
    ipAddress: string | null
    userAgent: string | null
}

export type DeviceAgentPayload = {
    deviceName?: string
    manufacturer?: string
    model?: string
    platform?: string
    os?: string
    osVersion?: string
    deviceType?: SessionDeviceInfo['deviceType']
}